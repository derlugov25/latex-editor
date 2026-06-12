import { NextResponse, type NextRequest } from "next/server"
import {
  buildVkAuthorizeUrl,
  generateVkPkce,
  vkClientId,
  VK_COOKIE_PATH,
  VK_STATE_COOKIE,
  VK_VERIFIER_COOKIE,
} from "@/lib/vk-id"

/**
 * Kick off the VK ID OAuth flow: stash the PKCE secrets in short-lived
 * httpOnly cookies and redirect to VK's authorize page. A plain redirect
 * endpoint (rather than a server action) so the login button can be a
 * simple <a href>.
 */
export function GET(request: NextRequest) {
  const clientId = vkClientId()
  if (!clientId) {
    const url = new URL("/login", request.nextUrl.origin)
    url.searchParams.set(
      "error",
      "VK sign-in is not configured: the server is missing VK_ID_CLIENT_ID."
    )
    return NextResponse.redirect(url)
  }

  const { state, verifier, challenge } = generateVkPkce()
  const redirectUri = new URL("/auth/vk/callback", request.nextUrl.origin).toString()

  const response = NextResponse.redirect(
    buildVkAuthorizeUrl({ clientId, redirectUri, state, challenge })
  )
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
    path: VK_COOKIE_PATH,
    maxAge: 60 * 10,
  }
  response.cookies.set(VK_STATE_COOKIE, state, cookieOptions)
  response.cookies.set(VK_VERIFIER_COOKIE, verifier, cookieOptions)
  return response
}
