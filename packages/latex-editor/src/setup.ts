import type * as Monaco from "monaco-editor"
import {
  createBibtexCompletionProvider,
  createLatexCompletionProvider,
} from "./completion"
import {
  registerBibtexLanguage,
  registerLatexLanguage,
} from "./language"
import type { LatexCompletionConfig, MonacoApi } from "./types"

/**
 * Register LaTeX and BibTeX languages + completion providers on the monaco instance.
 * Returns a disposer that removes the providers (safe to call multiple times).
 */
export function setupLatexEditor(
  monaco: MonacoApi,
  config?: Partial<LatexCompletionConfig>,
): Monaco.IDisposable {
  registerLatexLanguage(monaco)
  registerBibtexLanguage(monaco)

  const latex = monaco.languages.registerCompletionItemProvider(
    "latex",
    createLatexCompletionProvider(monaco, config),
  )
  const bibtex = monaco.languages.registerCompletionItemProvider(
    "bibtex",
    createBibtexCompletionProvider(monaco),
  )

  return {
    dispose() {
      latex.dispose()
      bibtex.dispose()
    },
  }
}
