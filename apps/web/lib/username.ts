/**
 * Username-based auth helpers.
 *
 * Supabase Auth is email-centric, so each username is mapped to a synthetic
 * address under a domain that never receives mail. Accounts are created already
 * confirmed via the admin API (see login/actions.ts), so no email is ever sent
 * and the built-in email rate limits never apply.
 */

/** Domain for synthetic, non-routable login addresses. Never receives mail. */
export const USERNAME_EMAIL_DOMAIN = "kursach.local"

/** Lowercase letters, digits, and underscore; 3–20 chars. */
const USERNAME_RE = /^[a-z0-9_]{3,20}$/

/** Human-readable description of the username rules (shown in the UI). */
export const USERNAME_RULE_HINT =
  "3–20 characters: lowercase letters, digits, or underscore."

export interface NormalizedUsername {
  /** Canonical, lowercased handle used for the email local-part. */
  canonical: string
  /** Synthetic login email, e.g. `alice@kursach.local`. */
  email: string
}

/**
 * Validate and normalize a username, or return null when it's invalid.
 * Usernames are case-insensitive: `Alice` and `alice` are the same account.
 */
export function normalizeUsername(input: string): NormalizedUsername | null {
  const canonical = input.trim().toLowerCase()
  if (!USERNAME_RE.test(canonical)) return null
  return { canonical, email: `${canonical}@${USERNAME_EMAIL_DOMAIN}` }
}

/**
 * Resolve a sign-in identifier (username OR email) to the email Supabase needs.
 * An `@` means the user typed a real email (e.g. a seeded demo account), so it's
 * used as-is; otherwise it's treated as a username. Returns null when invalid.
 */
export function identifierToEmail(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed.includes("@")) return trimmed.toLowerCase()
  return normalizeUsername(trimmed)?.email ?? null
}
