"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type * as Monaco from "monaco-editor"
import { bindMonacoToYjs, type MonacoBindingHandle } from "@workspace/collab/monaco-binding"
import { useYjs, type YjsHandle } from "@workspace/collab/yjs"

interface UseCollabDocOptions {
  seedLatex: string
  seedBibtex: string
}

export interface CollabDoc {
  /** True once the room has synced AND seed content is in place. Safe to mount editors. */
  ready: boolean
  /** Live LaTeX text mirrored to React state (for compile/snapshot consumers). */
  latex: string
  /** Live BibTeX text mirrored to React state. */
  bibtex: string
  bindLatexEditor(editor: Monaco.editor.IStandaloneCodeEditor): void
  bindBibtexEditor(editor: Monaco.editor.IStandaloneCodeEditor): void
}

/**
 * Pull the shared LaTeX and BibTeX texts out of the room's Y.Doc, seed them
 * on first sync, and expose Monaco-binding callbacks plus current values.
 */
export function useCollabDoc(options: UseCollabDocOptions): CollabDoc {
  const yjs = useYjs()
  const latexText = useMemo(() => yjs.doc.getText("latex"), [yjs.doc])
  const bibtexText = useMemo(() => yjs.doc.getText("bibtex"), [yjs.doc])

  const [seeded, setSeeded] = useState(false)
  const [latex, setLatex] = useState("")
  const [bibtex, setBibtex] = useState("")

  useEffect(() => {
    if (!yjs.ready) return

    yjs.doc.transact(() => {
      if (latexText.length === 0 && options.seedLatex.length > 0) {
        latexText.insert(0, options.seedLatex)
      }
      if (bibtexText.length === 0 && options.seedBibtex.length > 0) {
        bibtexText.insert(0, options.seedBibtex)
      }
    })

    setLatex(latexText.toString())
    setBibtex(bibtexText.toString())
    setSeeded(true)

    const onLatex = () => setLatex(latexText.toString())
    const onBibtex = () => setBibtex(bibtexText.toString())
    latexText.observe(onLatex)
    bibtexText.observe(onBibtex)
    return () => {
      latexText.unobserve(onLatex)
      bibtexText.unobserve(onBibtex)
    }
  }, [yjs.ready, yjs.doc, latexText, bibtexText, options.seedLatex, options.seedBibtex])

  const latexBinding = useRef<MonacoBindingHandle | null>(null)
  const bibtexBinding = useRef<MonacoBindingHandle | null>(null)

  useEffect(
    () => () => {
      latexBinding.current?.dispose()
      bibtexBinding.current?.dispose()
    },
    [],
  )

  return {
    ready: seeded,
    latex,
    bibtex,
    bindLatexEditor(editor) {
      latexBinding.current?.dispose()
      latexBinding.current = attach(editor, yjs, "latex")
    },
    bindBibtexEditor(editor) {
      bibtexBinding.current?.dispose()
      bibtexBinding.current = attach(editor, yjs, "bibtex")
    },
  }
}

function attach(
  editor: Monaco.editor.IStandaloneCodeEditor,
  yjs: YjsHandle,
  textName: "latex" | "bibtex",
): MonacoBindingHandle {
  return bindMonacoToYjs({
    editor,
    doc: yjs.doc,
    provider: yjs.provider,
    textName,
  })
}
