import type * as Monaco from "monaco-editor"
import { bibtexEntries, bibtexOptionalFields } from "../data"
import type { MonacoApi } from "../types"
import {
  bibtexEntryToCompletion,
  bibtexFieldToCompletion,
} from "./builders"

const ENTRY_RE = /^@([a-zA-Z]*)$/
const FIELD_RE = /^\s*([a-zA-Z]*)$/
const ENTRY_OPEN_RE = /@([a-zA-Z]+)\{/

function startsWith(value: string, prefix: string): boolean {
  return value.toLowerCase().startsWith(prefix.toLowerCase())
}

export function createBibtexCompletionProvider(
  monaco: MonacoApi,
): Monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: ["@", "\n", ","],

    provideCompletionItems(model, position) {
      const line = model.getLineContent(position.lineNumber)
      const out: Monaco.languages.CompletionItem[] = []

      const entryMatch = line.trim().match(ENTRY_RE)
      if (entryMatch) {
        const prefix = entryMatch[1] ?? ""
        const at = line.indexOf("@")
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: at + 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        }
        for (const e of bibtexEntries) {
          if (startsWith(e.type, prefix)) {
            out.push(bibtexEntryToCompletion(monaco, e, range))
          }
        }
        return { suggestions: out }
      }

      const fieldMatch = line.trim().match(FIELD_RE)
      if (fieldMatch && !line.includes("@")) {
        const prefix = fieldMatch[1] ?? ""
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: position.column - prefix.length,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        }

        let entryType: string | null = null
        for (let i = position.lineNumber - 1; i >= 1; i--) {
          const m = model.getLineContent(i).match(ENTRY_OPEN_RE)
          if (m?.[1]) {
            entryType = m[1].toLowerCase()
            break
          }
        }

        if (entryType) {
          const entry = bibtexEntries.find((e) => e.type === entryType)
          if (entry) {
            for (const f of entry.fields) {
              if (startsWith(f, prefix)) {
                out.push(bibtexFieldToCompletion(monaco, f, range, false))
              }
            }
          }
          const optional = bibtexOptionalFields[entryType]
          if (optional) {
            for (const f of optional) {
              if (startsWith(f, prefix)) {
                out.push(bibtexFieldToCompletion(monaco, f, range, true))
              }
            }
          }
        }
      }

      return { suggestions: out }
    },
  }
}
