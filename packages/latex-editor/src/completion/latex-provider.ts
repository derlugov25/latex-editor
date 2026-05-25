import type * as Monaco from "monaco-editor"
import {
  atSuggestions,
  bibtexEntries,
  createEnvironmentSnippet,
  environments,
  macros,
  snippets,
} from "../data"
import type { LatexCompletionConfig, MonacoApi } from "../types"
import {
  atSuggestionToCompletion,
  bibtexEntryToCompletion,
  citationToCompletion,
  environmentToCompletion,
  labelToCompletion,
  macroToCompletion,
  rangeBeforeCursor,
  snippetToCompletion,
} from "./builders"
import { detectContext } from "./context"
import { getCitations, getLabels } from "./stores"

const DEFAULT_CONFIG: LatexCompletionConfig = {
  enableMacros: true,
  enableEnvironments: true,
  enableBibtex: true,
  enableReferences: true,
  enableAtSuggestions: true,
  enableSnippets: true,
}

function startsWith(value: string, prefix: string): boolean {
  return value.toLowerCase().startsWith(prefix.toLowerCase())
}

export function createLatexCompletionProvider(
  monaco: MonacoApi,
  config: Partial<LatexCompletionConfig> = {},
): Monaco.languages.CompletionItemProvider {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  return {
    triggerCharacters: ["\\", "{", "@", ","],

    provideCompletionItems(model, position) {
      const line = model.getLineContent(position.lineNumber)
      const ctx = detectContext(line, position.column)
      const out: Monaco.languages.CompletionItem[] = []

      switch (ctx.type) {
        case "citation": {
          if (!cfg.enableReferences) break
          const range = rangeBeforeCursor(position, ctx.prefix)
          for (const c of getCitations()) {
            if (startsWith(c.key, ctx.prefix)) {
              out.push(citationToCompletion(monaco, c, range))
            }
          }
          break
        }

        case "reference": {
          if (!cfg.enableReferences) break
          const range = rangeBeforeCursor(position, ctx.prefix)
          for (const l of getLabels()) {
            if (startsWith(l.label, ctx.prefix)) {
              out.push(labelToCompletion(monaco, l, range))
            }
          }
          break
        }

        case "beginEnv":
        case "endEnv": {
          if (!cfg.enableEnvironments) break
          const range = rangeBeforeCursor(position, ctx.prefix)
          for (const env of environments) {
            if (startsWith(env.name, ctx.prefix)) {
              out.push(
                environmentToCompletion(monaco, env, range, ctx.type === "beginEnv"),
              )
            }
          }
          break
        }

        case "atSuggestion": {
          if (!cfg.enableAtSuggestions) break
          const range = rangeBeforeCursor(position, ctx.prefix.length > 0 ? ctx.prefix : "@")
          for (const s of atSuggestions) {
            if (s.prefix.startsWith(ctx.prefix)) {
              out.push(atSuggestionToCompletion(monaco, s, range))
            }
          }
          break
        }

        case "bibtexEntry": {
          if (!cfg.enableBibtex) break
          const range = rangeBeforeCursor(position, ctx.prefix, true)
          for (const e of bibtexEntries) {
            if (startsWith(e.type, ctx.prefix)) {
              out.push(bibtexEntryToCompletion(monaco, e, range))
            }
          }
          break
        }

        case "command": {
          if (!cfg.enableMacros) break
          const range = rangeBeforeCursor(position, ctx.prefix)
          for (const m of macros) {
            if (startsWith(m.name, ctx.prefix)) {
              out.push(macroToCompletion(monaco, m, range))
            }
          }
          if ("begin".startsWith(ctx.prefix.toLowerCase())) {
            for (const env of environments) {
              out.push(
                macroToCompletion(
                  monaco,
                  {
                    name: `begin{${env.name}}`,
                    arg: { format: "", snippet: createEnvironmentSnippet(env) },
                    detail: `\\begin{${env.name}}...\\end{${env.name}}`,
                  },
                  range,
                ),
              )
            }
          }
          break
        }

        default: {
          if (!cfg.enableSnippets) break
          const word = model.getWordAtPosition(position)
          const range = word
            ? {
                startLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endLineNumber: position.lineNumber,
                endColumn: word.endColumn,
              }
            : rangeBeforeCursor(position, "")
          const prefix = word?.word.toLowerCase() ?? ""
          for (const s of snippets) {
            if (s.prefix.toLowerCase().startsWith(prefix)) {
              out.push(snippetToCompletion(monaco, s, range))
            }
          }
        }
      }

      return { suggestions: out }
    },
  }
}
