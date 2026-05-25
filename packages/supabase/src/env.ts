function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. See packages/supabase/README.md for setup.`,
    )
  }
  return value
}

/**
 * Env for clients exposed to the browser. Uses the publishable key
 * (`sb_publishable_…`), which replaces the legacy `anon` JWT.
 */
export function publicEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  }
}

/**
 * Env for server-only admin clients. Uses the secret key (`sb_secret_…`),
 * which replaces the legacy `service_role` JWT. Never reference this from
 * a "use client" module — it would leak the secret into the browser bundle.
 */
export function secretEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    secretKey: required("SUPABASE_SECRET_KEY"),
  }
}
