"use client"

import { createBrowserClient } from "@supabase/ssr"
import { publicEnv } from "./env"
import type { Database } from "./types"

/**
 * Single-tab Supabase client for browser use (Client Components, hooks).
 * Reuses one instance across renders.
 */
let cached: ReturnType<typeof create> | null = null

function create() {
  const { url, publishableKey } = publicEnv()
  return createBrowserClient<Database>(url, publishableKey)
}

export function createClient() {
  if (!cached) cached = create()
  return cached
}
