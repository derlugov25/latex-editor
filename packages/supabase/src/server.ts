import { createServerClient } from "@supabase/ssr"
import type { CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { publicEnv } from "./env"
import type { Database } from "./types"

interface CookieToSet {
  name: string
  value: string
  options?: CookieOptions
}

/**
 * Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * Reads/writes auth cookies via Next's `cookies()` store.
 */
export async function createClient() {
  const { url, publishableKey } = publicEnv()
  const store = await cookies()

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return store.getAll()
      },
      setAll(toSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of toSet) {
            store.set(name, value, options)
          }
        } catch {
          // `set` throws when called from a Server Component render.
          // The middleware handles session refresh, so this can be safely ignored.
        }
      },
    },
  })
}
