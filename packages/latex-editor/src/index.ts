export { LatexEditor, type LatexEditorProps } from "./LatexEditor"
export { setupLatexEditor } from "./setup"

export type {
  AtSuggestion,
  BibtexEntryInfo,
  BibtexOptionalFields,
  CitationItem,
  CompletionContextMatch,
  CompletionContextType,
  EnvironmentInfo,
  LabelItem,
  LatexCompletionConfig,
  MacroInfo,
  MonacoApi,
  SnippetInfo,
} from "./types"

export {
  createBibtexCompletionProvider,
  createLatexCompletionProvider,
  detectContext,
  parseCitationsFromBibtex,
  parseLabelsFromContent,
  addLabel,
  removeLabel,
  clearLabels,
  getLabels,
  addCitation,
  removeCitation,
  clearCitations,
  getCitations,
} from "./completion"

export {
  registerBibtexLanguage,
  registerLatexLanguage,
} from "./language"

export {
  atSuggestions,
  bibtexEntries,
  bibtexOptionalFields,
  createBibtexEntrySnippet,
  createBibtexFieldSnippet,
  createEnvironmentSnippet,
  environments,
  macros,
  snippets,
} from "./data"
