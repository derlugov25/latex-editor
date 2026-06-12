import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@workspace/supabase/server"
import { createAdminClient } from "@workspace/supabase/admin"
import {
  exchangeVkCode,
  fetchVkProfile,
  vkClientId,
  vkSyntheticEmail,
  VkIdError,
  VK_COOKIE_PATH,
  VK_STATE_COOKIE,
  VK_VERIFIER_COOKIE,
  type VkProfile,
} from "@/lib/vk-id"

/**
 * VK ID OAuth callback: validate state, exchange the code for a VK profile,
 * find-or-create the matching Supabase account (admin API, no email is ever
 * sent), and mint a cookie session via generateLink + verifyOtp.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  // VK reported an error (e.g. the user cancelled the consent screen).
  const vkError = params.get("error")
  if (vkError) {
    const description = params.get("error_description")
    return failRedirect(
      request,
      vkError === "access_denied"
        ? "VK sign-in was cancelled."
        : `VK sign-in failed: ${description || vkError}`
    )
  }

  const code = params.get("code")
  const deviceId = params.get("device_id")
  const state = params.get("state")
  const expectedState = request.cookies.get(VK_STATE_COOKIE)?.value
  const verifier = request.cookies.get(VK_VERIFIER_COOKIE)?.value

  if (!code || !deviceId || !state) {
    return failRedirect(request, "VK returned an incomplete response. Please try again.")
  }
  if (!expectedState || !verifier || state !== expectedState) {
    return failRedirect(request, "Your VK sign-in attempt expired. Please try again.")
  }

  const clientId = vkClientId()
  if (!clientId) {
    return failRedirect(request, "VK sign-in is not configured.")
  }

  try {
    const redirectUri = new URL("/auth/vk/callback", request.nextUrl.origin).toString()
    const { accessToken } = await exchangeVkCode({
      clientId,
      code,
      deviceId,
      verifier,
      redirectUri,
      state,
    })
    const profile = await fetchVkProfile({ clientId, accessToken })

    const tokenHash = await provisionVkUser(profile)

    // Verifying the magic-link token hash sets the Supabase auth cookies on
    // this response, exactly like exchangeCodeForSession in /auth/callback.
    const supabase = await createClient()
    const { error: otpError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: tokenHash,
    })
    if (otpError) {
      throw new VkIdError(`Could not establish a session: ${otpError.message}`)
    }

    return clearVkCookies(
      NextResponse.redirect(new URL("/projects", request.nextUrl.origin))
    )
  } catch (err) {
    return failRedirect(
      request,
      err instanceof VkIdError
        ? err.message
        : "VK sign-in failed unexpectedly. Please try again."
    )
  }
}

/**
 * Find-or-create the Supabase account for a VK identity and return a
 * magic-link token hash for it. Accounts live at `vk_<id>@vk.kursach.local`,
 * a domain regular signup can never produce, so an email collision here can
 * only mean "this VK user signed in before".
 */
async function provisionVkUser(profile: VkProfile): Promise<string> {
  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    throw new VkIdError("VK sign-in is unavailable: the server is missing SUPABASE_SECRET_KEY.")
  }

  const email = vkSyntheticEmail(profile.userId)
  const username = `vk_${profile.userId}`
  const name = `${profile.firstName} ${profile.lastName}`.trim() || username
  const metadata = {
    name,
    username,
    avatar_url: profile.avatarUrl,
    provider: "vk",
    vk_user_id: profile.userId,
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: metadata,
  })
  if (createError && !isEmailExistsError(createError)) {
    throw new VkIdError(`Could not create the account: ${createError.message}`)
  }

  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  })
  const tokenHash = data?.properties?.hashed_token
  if (linkError || !tokenHash) {
    throw new VkIdError(
      `Could not establish a session: ${linkError?.message ?? "no login token returned"}`
    )
  }

  // Returning user: keep their VK name/avatar fresh, since VK is the source
  // of truth for these accounts.
  if (createError && data.user) {
    const current = data.user.user_metadata ?? {}
    if (
      current.name !== name ||
      (current.avatar_url ?? null) !== profile.avatarUrl
    ) {
      await admin.auth.admin.updateUserById(data.user.id, {
        user_metadata: { ...current, ...metadata },
      })
    }
  }

  return tokenHash
}

/** True when admin.createUser failed because the account already exists. */
function isEmailExistsError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const code = "code" in err ? String((err as { code: unknown }).code) : ""
  const message =
    "message" in err ? String((err as { message: unknown }).message) : ""
  return (
    code === "email_exists" ||
    code === "user_already_exists" ||
    /already.*(registered|exists)/i.test(message)
  )
}

function failRedirect(request: NextRequest, message: string) {
  const url = new URL("/login", request.nextUrl.origin)
  url.searchParams.set("error", message)
  return clearVkCookies(NextResponse.redirect(url))
}

function clearVkCookies(response: NextResponse) {
  for (const name of [VK_STATE_COOKIE, VK_VERIFIER_COOKIE]) {
    response.cookies.set(name, "", { path: VK_COOKIE_PATH, maxAge: 0 })
  }
  return response
}
