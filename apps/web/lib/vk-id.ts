import { createHash, randomBytes } from "node:crypto"
import { USERNAME_EMAIL_DOMAIN } from "./username"

/**
 * VK ID (id.vk.com) OAuth 2.1 helpers — server-only.
 *
 * Supabase has no native VK provider, so the flow is implemented manually:
 * `/auth/vk/start` redirects to VK's authorize page (PKCE S256, no client
 * secret) and `/auth/vk/callback` exchanges the code, then bridges the VK
 * identity into a Supabase session via the admin API.
 *
 * Setup: create a "Web" app at https://id.vk.com/about/business, register
 * `<site origin>/auth/vk/callback` as a trusted Redirect URL, and set the
 * app id in the VK_ID_CLIENT_ID env var. The login page hides the VK button
 * while the var is unset.
 */

const VK_AUTHORIZE_URL = "https://id.vk.com/authorize"
const VK_TOKEN_URL = "https://id.vk.com/oauth2/auth"
const VK_USER_INFO_URL = "https://id.vk.com/oauth2/user_info"

/** Short-lived cookies carrying PKCE secrets between /start and /callback. */
export const VK_STATE_COOKIE = "vk-auth-state"
export const VK_VERIFIER_COOKIE = "vk-auth-verifier"
export const VK_COOKIE_PATH = "/auth/vk"

/** VK ID app id, or null when VK login is not configured. */
export function vkClientId(): string | null {
  return process.env.VK_ID_CLIENT_ID?.trim() || null
}

/**
 * Synthetic login address for a VK account, e.g. `vk_12345@vk.kursach.local`.
 * The dedicated `vk.` subdomain keeps these addresses out of the username
 * namespace (signup only ever creates `<name>@kursach.local`), so nobody can
 * register a username like `vk_12345` and capture someone else's VK login.
 */
export function vkSyntheticEmail(vkUserId: string): string {
  return `vk_${vkUserId}@vk.${USERNAME_EMAIL_DOMAIN}`
}

export interface VkPkce {
  state: string
  verifier: string
  challenge: string
}

export function generateVkPkce(): VkPkce {
  const state = randomBytes(24).toString("base64url")
  // 32 random bytes → 43 base64url chars, the RFC 7636 minimum verifier length.
  const verifier = randomBytes(32).toString("base64url")
  const challenge = createHash("sha256").update(verifier).digest("base64url")
  return { state, verifier, challenge }
}

export function buildVkAuthorizeUrl(opts: {
  clientId: string
  redirectUri: string
  state: string
  challenge: string
}): string {
  const url = new URL(VK_AUTHORIZE_URL)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", opts.clientId)
  url.searchParams.set("redirect_uri", opts.redirectUri)
  url.searchParams.set("state", opts.state)
  url.searchParams.set("code_challenge", opts.challenge)
  // VK's docs and official SDK use the lowercase form of S256.
  url.searchParams.set("code_challenge_method", "s256")
  url.searchParams.set("scope", "vkid.personal_info")
  return url.toString()
}

/** Error with a message safe to show on the login page. */
export class VkIdError extends Error {}

export interface VkProfile {
  /** VK user id as a decimal string. */
  userId: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

/** Exchange the authorization code for an access token (PKCE — no client secret). */
export async function exchangeVkCode(opts: {
  clientId: string
  code: string
  deviceId: string
  verifier: string
  redirectUri: string
  state: string
}): Promise<{ accessToken: string; userId: string }> {
  const json = await postForm(VK_TOKEN_URL, {
    grant_type: "authorization_code",
    code: opts.code,
    code_verifier: opts.verifier,
    client_id: opts.clientId,
    device_id: opts.deviceId,
    redirect_uri: opts.redirectUri,
    state: opts.state,
  })
  const accessToken =
    typeof json.access_token === "string" ? json.access_token : null
  const userId = json.user_id != null ? String(json.user_id) : null
  if (!accessToken || !userId) {
    throw new VkIdError("VK sign-in failed: VK returned no access token.")
  }
  return { accessToken, userId }
}

export async function fetchVkProfile(opts: {
  clientId: string
  accessToken: string
}): Promise<VkProfile> {
  const json = await postForm(VK_USER_INFO_URL, {
    client_id: opts.clientId,
    access_token: opts.accessToken,
  })
  const user = (json.user ?? {}) as Record<string, unknown>
  const userId = user.user_id != null ? String(user.user_id) : null
  if (!userId) {
    throw new VkIdError("VK sign-in failed: VK returned no profile info.")
  }
  return {
    userId,
    firstName: typeof user.first_name === "string" ? user.first_name : "",
    lastName: typeof user.last_name === "string" ? user.last_name : "",
    avatarUrl:
      typeof user.avatar === "string" && user.avatar ? user.avatar : null,
  }
}

async function postForm(
  url: string,
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
      cache: "no-store",
    })
  } catch {
    throw new VkIdError("Could not reach VK. Check your connection and try again.")
  }

  const json = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null
  if (!res.ok || !json || typeof json.error === "string") {
    const detail =
      json && typeof json.error_description === "string"
        ? json.error_description
        : json && typeof json.error === "string"
          ? json.error
          : `HTTP ${res.status}`
    throw new VkIdError(`VK sign-in failed: ${detail}`)
  }
  return json
}
