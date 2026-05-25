import type { CompletionContextMatch } from "../types"

const patterns = {
  beginEnv: /\\begin\{([^}]*)$/,
  endEnv: /\\end\{([^}]*)$/,
  command: /\\([a-zA-Z*]*)$/,
  citation: /\\(?:[a-zA-Z]*[Cc]ite[a-zA-Z]*|textcite|parencite)\{([^}]*)$/,
  reference: /\\(?:(?:eq|page|auto|name|c|C)?ref|hyperref\[)\{?([^}\]]*)$/,
  atSuggestion: /@([a-zA-Z0-9]*)$/,
  bibtexEntry: /^\s*@([a-zA-Z]*)$/,
} as const

/** Identify what the user is trying to type at the cursor position. */
export function detectContext(line: string, column: number): CompletionContextMatch {
  const before = line.substring(0, column - 1)

  const cite = before.match(patterns.citation)
  if (cite) return { type: "citation", match: cite, prefix: cite[1] ?? "" }

  const ref = before.match(patterns.reference)
  if (ref) return { type: "reference", match: ref, prefix: ref[1] ?? "" }

  const begin = before.match(patterns.beginEnv)
  if (begin) return { type: "beginEnv", match: begin, prefix: begin[1] ?? "" }

  const end = before.match(patterns.endEnv)
  if (end) return { type: "endEnv", match: end, prefix: end[1] ?? "" }

  const at = before.match(patterns.atSuggestion)
  if (at) return { type: "atSuggestion", match: at, prefix: at[0] }

  const cmd = before.match(patterns.command)
  if (cmd) return { type: "command", match: cmd, prefix: cmd[1] ?? "" }

  const bib = line.trim().match(patterns.bibtexEntry)
  if (bib) return { type: "bibtexEntry", match: bib, prefix: bib[1] ?? "" }

  return { type: "general", match: null, prefix: "" }
}
