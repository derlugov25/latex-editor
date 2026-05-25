import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@workspace/supabase/middleware"

const PUBLIC_PREFIXES = ["/login", "/auth", "/api/liveblocks-auth"]

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  if (!user && !isPublic && pathname.startsWith("/projects")) {
    const redirect = NextResponse.redirect(new URL("/login", request.url))
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie)
    }
    return redirect
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
