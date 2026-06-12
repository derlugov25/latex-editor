"use client"

import type { OnMount } from "@monaco-editor/react"
import type * as Monaco from "monaco-editor"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  clearCitations,
  clearLabels,
  parseCitationsFromBibtex,
  parseLabelsFromContent,
} from "./completion"
import { setupLatexEditor } from "./setup"
import type { LatexCompletionConfig } from "./types"

type Editor = typeof import("@monaco-editor/react").default
type EditorOptions = Monaco.editor.IStandaloneEditorConstructionOptions

export interface LatexEditorProps {
  value?: string
  onChange?: (value: string | undefined) => void
  /** Called once on mount with the editor instance (useful for binding y-monaco). */
  onMount?: OnMount
  height?: string | number
  theme?: "vs-dark" | "light" | (string & {})
  language?: "latex" | "bibtex" | "plaintext"
  completionConfig?: Partial<LatexCompletionConfig>
  /** When provided, populates citation completions for \cite{...}. */
  bibtexContent?: string
  /**
   * LaTeX source to harvest \label{...} completions from (e.g. every .tex
   * file of a multi-file project). When set it replaces the default behavior
   * of parsing only this editor's own content.
   */
  labelsContent?: string
  className?: string
  readOnly?: boolean
  options?: EditorOptions
}

const DEFAULT_OPTIONS: EditorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: "on",
  wordWrap: "on",
  automaticLayout: true,
  scrollBeyondLastLine: false,
  suggestOnTriggerCharacters: true,
  quickSuggestions: { other: true, comments: false, strings: true },
  acceptSuggestionOnCommitCharacter: true,
  tabCompletion: "on",
  wordBasedSuggestions: "off",
  parameterHints: { enabled: true },
  suggest: {
    showKeywords: true,
    showSnippets: true,
    showFunctions: true,
    showModules: true,
    insertMode: "replace",
  },
}

export function LatexEditor({
  value = "",
  onChange,
  onMount,
  height = "100%",
  theme = "vs-dark",
  language = "latex",
  completionConfig,
  bibtexContent,
  labelsContent,
  className,
  readOnly = false,
  options,
}: LatexEditorProps) {
  const [Editor, setEditor] = useState<Editor | null>(null)
  const disposerRef = useRef<Monaco.IDisposable | null>(null)

  useEffect(() => {
    void import("@monaco-editor/react").then((mod) => setEditor(() => mod.default))
  }, [])

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      disposerRef.current?.dispose()
      disposerRef.current = setupLatexEditor(monaco, completionConfig)

      if (labelsContent === undefined && language === "latex" && value) {
        parseLabelsFromContent(value)
      }
      if (bibtexContent) parseCitationsFromBibtex(bibtexContent)

      onMount?.(editor, monaco)
    },
    [completionConfig, language, value, bibtexContent, labelsContent, onMount],
  )

  const handleChange = useCallback(
    (next: string | undefined) => {
      // With labelsContent the host supplies labels from the whole project;
      // reparsing just this file here would wipe the cross-file ones.
      if (labelsContent === undefined && language === "latex" && next) {
        clearLabels()
        parseLabelsFromContent(next)
      }
      onChange?.(next)
    },
    [language, labelsContent, onChange],
  )

  useEffect(() => {
    if (!bibtexContent) return
    clearCitations()
    parseCitationsFromBibtex(bibtexContent)
  }, [bibtexContent])

  useEffect(() => {
    if (labelsContent === undefined) return
    clearLabels()
    parseLabelsFromContent(labelsContent)
  }, [labelsContent])

  useEffect(() => () => disposerRef.current?.dispose(), [])

  if (!Editor) {
    return (
      <div
        style={{ height }}
        className={
          "flex items-center justify-center bg-muted text-muted-foreground text-sm " +
          (className ?? "")
        }
      >
        Loading editor…
      </div>
    )
  }

  return (
    <Editor
      height={height}
      defaultLanguage={language}
      language={language}
      value={value}
      theme={theme}
      onChange={handleChange}
      onMount={handleMount}
      className={className}
      options={{ ...DEFAULT_OPTIONS, readOnly, ...options }}
    />
  )
}
