import type * as monaco from "monaco-editor"

export interface MacroInfo {
  name: string
  arg?: { format: string; snippet: string }
  detail?: string
  doc?: string
  action?: string
}

export interface EnvironmentInfo {
  name: string
  arg?: { format: string; snippet: string }
}

export interface BibtexEntryInfo {
  type: string
  fields: string[]
}

export type BibtexOptionalFields = Record<string, string[]>

export interface AtSuggestion {
  prefix: string
  body: string
  description: string
}

export interface SnippetInfo {
  prefix: string
  body: string
  description: string
}

export interface LabelItem {
  label: string
  documentation?: string
  file?: string
}

export interface CitationItem {
  key: string
  fields: Map<string, string>
}

export interface LatexCompletionConfig {
  enableMacros: boolean
  enableEnvironments: boolean
  enableBibtex: boolean
  enableReferences: boolean
  enableAtSuggestions: boolean
  enableSnippets: boolean
}

export type CompletionContextType =
  | "command"
  | "beginEnv"
  | "endEnv"
  | "citation"
  | "reference"
  | "atSuggestion"
  | "bibtexEntry"
  | "bibtexField"
  | "general"

export interface CompletionContextMatch {
  type: CompletionContextType
  match: RegExpMatchArray | null
  prefix: string
}

export type MonacoApi = typeof monaco
