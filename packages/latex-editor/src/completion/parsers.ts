import { addCitation, addLabel } from "./stores"

const LABEL_RE = /\\label\{([^}]+)\}/g
const ENTRY_RE = /@([a-zA-Z]+)\{([^,]+),/g
const FIELD_RE = /([a-zA-Z]+)\s*=\s*[{"]([^}"]+)[}"]/g

/** Extract \label{...} occurrences from LaTeX source and push them into the store. */
export function parseLabelsFromContent(content: string, file?: string): void {
  let match: RegExpExecArray | null
  LABEL_RE.lastIndex = 0
  while ((match = LABEL_RE.exec(content)) !== null) {
    const label = match[1]
    if (!label) continue
    const start = Math.max(0, match.index - 100)
    const end = Math.min(content.length, match.index + match[0].length + 100)
    addLabel({ label, documentation: content.substring(start, end), file })
  }
}

/** Extract BibTeX entries (key + fields) from .bib content and push them into the store. */
export function parseCitationsFromBibtex(content: string): void {
  let entry: RegExpExecArray | null
  ENTRY_RE.lastIndex = 0
  while ((entry = ENTRY_RE.exec(content)) !== null) {
    const key = entry[2]?.trim()
    if (!key) continue

    let braces = 1
    let cursor = entry.index + entry[0].length
    for (; cursor < content.length && braces > 0; cursor++) {
      if (content[cursor] === "{") braces++
      if (content[cursor] === "}") braces--
    }

    const body = content.substring(entry.index, cursor)
    const fields = new Map<string, string>()
    let field: RegExpExecArray | null
    FIELD_RE.lastIndex = 0
    while ((field = FIELD_RE.exec(body)) !== null) {
      const name = field[1]?.toLowerCase()
      const value = field[2]
      if (name && value !== undefined) fields.set(name, value)
    }

    addCitation({ key, fields })
  }
}
