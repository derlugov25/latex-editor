/**
 * Base URL for browser-side compile requests.
 * Empty string → same-origin `/api/compile` proxy (recommended for local dev).
 */
export const compilerUrl = process.env.NEXT_PUBLIC_COMPILER_URL ?? ""

export function liveblocksSecret(): string {
  const key = process.env.LIVEBLOCKS_SECRET_KEY
  if (!key) {
    throw new Error(
      "Missing LIVEBLOCKS_SECRET_KEY. Add it to apps/web/.env.local — see .env.example.",
    )
  }
  return key
}
