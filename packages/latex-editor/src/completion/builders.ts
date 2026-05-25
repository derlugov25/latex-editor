import type * as Monaco from "monaco-editor"
import {
  bibtexEntries,
  createBibtexEntrySnippet,
  createBibtexFieldSnippet,
  createEnvironmentSnippet,
} from "../data"
import type {
  AtSuggestion,
  CitationItem,
  EnvironmentInfo,
  LabelItem,
  MacroInfo,
  MonacoApi,
  SnippetInfo,
} from "../types"

type CompletionItem = Monaco.languages.CompletionItem
type IRange = Monaco.IRange

/** Monaco's enum value when running under a bundler where the enum is dropped. */
function snippetRule(monaco: MonacoApi): number {
  return monaco.languages?.CompletionItemInsertTextRule?.InsertAsSnippet ?? 4
}

export function macroToCompletion(
  monaco: MonacoApi,
  macro: MacroInfo,
  range: IRange,
): CompletionItem {
  const label = `\\${macro.name}${macro.arg?.format ?? ""}`
  const insertText = macro.arg?.snippet ?? macro.name
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Function,
    insertText,
    insertTextRules: macro.arg?.snippet ? snippetRule(monaco) : undefined,
    detail: macro.detail,
    documentation: macro.doc,
    range,
    sortText: `0-${macro.name}`,
  }
}

export function environmentToCompletion(
  monaco: MonacoApi,
  env: EnvironmentInfo,
  range: IRange,
  forBegin: boolean,
): CompletionItem {
  const insertText = forBegin ? createEnvironmentSnippet(env) : env.name
  return {
    label: env.name,
    kind: monaco.languages.CompletionItemKind.Module,
    insertText,
    insertTextRules: forBegin ? snippetRule(monaco) : undefined,
    detail: `\\begin{${env.name}}...\\end{${env.name}}`,
    documentation: `LaTeX environment: ${env.name}`,
    range,
    sortText: `1-${env.name}`,
  }
}

export function bibtexEntryToCompletion(
  monaco: MonacoApi,
  entry: (typeof bibtexEntries)[number],
  range: IRange,
): CompletionItem {
  return {
    label: `@${entry.type}`,
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: createBibtexEntrySnippet(entry),
    insertTextRules: snippetRule(monaco),
    detail: `BibTeX entry: ${entry.type}`,
    documentation: `Required fields: ${entry.fields.join(", ")}`,
    range,
    sortText: `0-${entry.type}`,
  }
}

export function bibtexFieldToCompletion(
  monaco: MonacoApi,
  field: string,
  range: IRange,
  optional: boolean,
): CompletionItem {
  return {
    label: field,
    kind: monaco.languages.CompletionItemKind.Property,
    insertText: createBibtexFieldSnippet(field),
    insertTextRules: snippetRule(monaco),
    detail: optional ? "Optional field" : "Required field",
    range,
    sortText: optional ? `1-${field}` : `0-${field}`,
  }
}

export function atSuggestionToCompletion(
  monaco: MonacoApi,
  suggestion: AtSuggestion,
  range: IRange,
): CompletionItem {
  return {
    label: suggestion.prefix,
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: suggestion.body,
    insertTextRules: snippetRule(monaco),
    detail: suggestion.description,
    filterText: suggestion.prefix,
    range,
    sortText: `0-${suggestion.prefix}`,
  }
}

export function snippetToCompletion(
  monaco: MonacoApi,
  snippet: SnippetInfo,
  range: IRange,
): CompletionItem {
  return {
    label: snippet.prefix,
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: snippet.body,
    insertTextRules: snippetRule(monaco),
    detail: snippet.description,
    range,
    sortText: `2-${snippet.prefix}`,
  }
}

export function labelToCompletion(
  monaco: MonacoApi,
  label: LabelItem,
  range: IRange,
): CompletionItem {
  return {
    label: label.label,
    kind: monaco.languages.CompletionItemKind.Reference,
    insertText: label.label,
    detail: "Label reference",
    documentation: label.documentation,
    range,
    sortText: `0-${label.label}`,
  }
}

export function citationToCompletion(
  monaco: MonacoApi,
  citation: CitationItem,
  range: IRange,
): CompletionItem {
  const author = citation.fields.get("author") ?? ""
  const title = citation.fields.get("title") ?? ""
  const year = citation.fields.get("year") ?? ""
  return {
    label: citation.key,
    kind: monaco.languages.CompletionItemKind.Reference,
    insertText: citation.key,
    detail: `${author} (${year})`,
    documentation: title,
    range,
    sortText: `0-${citation.key}`,
  }
}

export function rangeBeforeCursor(
  position: Monaco.Position,
  prefix: string,
  includeBackslash = false,
): IRange {
  const startColumn = position.column - prefix.length - (includeBackslash ? 1 : 0)
  return {
    startLineNumber: position.lineNumber,
    startColumn: Math.max(1, startColumn),
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  }
}
