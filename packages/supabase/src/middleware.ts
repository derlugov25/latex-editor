import { createServerClient, type CookieOptions } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { publicEnv } from "./env"
import type { Database } from "./types"

interface CookieToSet {
  name: string
  value: string
  options?: CookieOptions
}

export interface SessionUpdate {
  /** Response with refreshed auth cookies (if any were issued this request). */
  response: NextResponse
  /** Resolved Supabase user, or null if no valid session. */
  user: User | null
}

/**
 * Refresh the Supabase session on every request, return the resolved user
 * alongside a response carrying any updated auth cookies. The caller (a
 * Next.js proxy/middleware) decides what to do based on `user`.
 */
export async function updateSession(request: NextRequest): Promise<SessionUpdate> {
  let response = NextResponse.next({ request })
  const { url, publishableKey } = publicEnv()

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(toSet: CookieToSet[]) {
        for (const { name, value } of toSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  const { data } = await supabase.auth.getUser()
  return { response, user: data.user }
}
