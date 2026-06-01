/** True when PostgREST reports a missing table (schema not applied). */
export function isMissingSchemaError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const code = "code" in err ? String((err as { code: unknown }).code) : ""
  const message =
    "message" in err ? String((err as { message: unknown }).message) : ""
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    message.includes("Could not find the table")
  )
}

/** True when RLS policies recurse (common after collaboration migration). */
export function isRlsRecursionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const code = "code" in err ? String((err as { code: unknown }).code) : ""
  const message =
    "message" in err ? String((err as { message: unknown }).message) : ""
  return code === "42P17" || message.includes("infinite recursion")
}
