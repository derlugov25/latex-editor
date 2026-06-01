"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { LatexEditor } from "@workspace/latex-editor"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import type { ProjectRow } from "@workspace/supabase/types"
import { EditorToolbar } from "./editor-toolbar"
import { PdfPreview } from "./pdf-preview"
import { ShareDialog } from "./share-dialog"
import { useCollabDoc } from "./use-collab-doc"
import { useCompile } from "./use-compile"
import { useSnapshot } from "./use-snapshot"

interface EditorShellProps {
  project: ProjectRow
  compilerUrl: string
  isOwner: boolean
}

export function EditorShell({ project, compilerUrl, isOwner }: EditorShellProps) {
  const [tab, setTab] = useState<"latex" | "bibtex">("latex")
  const { resolvedTheme } = useTheme()
  const monacoTheme = resolvedTheme === "light" ? "light" : "vs-dark"

  const doc = useCollabDoc({
    seedLatex: project.latex_content,
    seedBibtex: project.bibtex_content,
  })

  const compile = useCompile({ compilerUrl })

  useSnapshot({
    projectId: project.id,
    latex: doc.latex,
    bibtex: doc.bibtex,
    enabled: doc.ready,
  })

  const handleCompile = () => {
    void compile.compile({
      latex: doc.latex,
      bibtex: doc.bibtex.trim() ? doc.bibtex : undefined,
    })
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <EditorToolbar
        projectName={project.name}
        activeTab={tab}
        onTabChange={setTab}
        onCompile={handleCompile}
        isCompiling={compile.isCompiling}
        shareSlot={<ShareDialog projectId={project.id} isOwner={isOwner} />}
      />
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize={55} minSize={30}>
          {doc.ready ? (
            <>
              <div className="h-full" hidden={tab !== "latex"}>
                <LatexEditor
                  key="latex"
                  language="latex"
                  theme={monacoTheme}
                  bibtexContent={doc.bibtex}
                  onMount={(editor) => doc.bindLatexEditor(editor)}
                />
              </div>
              <div className="h-full" hidden={tab !== "bibtex"}>
                <LatexEditor
                  key="bibtex"
                  language="bibtex"
                  theme={monacoTheme}
                  onMount={(editor) => doc.bindBibtexEditor(editor)}
                />
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="border-primary size-5 animate-spin rounded-full border-2 border-t-transparent" />
              <span className="text-muted-foreground text-sm">Loading document...</span>
            </div>
          )}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={45} minSize={25}>
          <PdfPreview
            pdfUrl={compile.pdfUrl}
            error={compile.error}
            log={compile.log}
            isCompiling={compile.isCompiling}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
