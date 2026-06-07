import { timingSafeEqual } from "node:crypto"

export function isAuthorizedCompilerRequest(
  authorization: string | undefined,
  expected = process.env.COMPILER_API_KEY
): boolean {
  // Local development remains frictionless, but production fails closed.
  if (!expected) return process.env.NODE_ENV !== "production"

  const prefix = "Bearer "
  if (!authorization?.startsWith(prefix)) return false

  const supplied = Buffer.from(authorization.slice(prefix.length))
  const configured = Buffer.from(expected)
  return (
    supplied.length === configured.length &&
    timingSafeEqual(supplied, configured)
  )
}
