import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { secretEnv } from "./env"
import type { Database } from "./types"

/**
 * Service-role Supabase client that bypasses RLS.
 * Only use from server-side code (API routes, server actions).
 */
export function createAdminClient() {
  const { url, secretKey } = secretEnv()
  return createSupabaseClient<Database>(url, secretKey)
}
