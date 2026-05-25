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
  language?: "latex" | "bibtex"
  completionConfig?: Partial<LatexCompletionConfig>
  /** When provided, populates citation completions for \cite{...}. */
  bibtexContent?: string
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

      if (language === "latex" && value) parseLabelsFromContent(value)
      if (bibtexContent) parseCitationsFromBibtex(bibtexContent)

      onMount?.(editor, monaco)
    },
    [completionConfig, language, value, bibtexContent, onMount],
  )

  const handleChange = useCallback(
    (next: string | undefined) => {
      if (language === "latex" && next) {
        clearLabels()
        parseLabelsFromContent(next)
      }
      onChange?.(next)
    },
    [language, onChange],
  )

  useEffect(() => {
    if (!bibtexContent) return
    clearCitations()
    parseCitationsFromBibtex(bibtexContent)
  }, [bibtexContent])

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
