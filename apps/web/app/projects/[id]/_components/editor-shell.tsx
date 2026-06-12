"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { LatexEditor } from "@workspace/latex-editor"
import { languageForPath, pathExtension } from "@workspace/compiler-client/paths"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import type { ProjectRow } from "@workspace/supabase/types"
import type { FileSeed } from "@/lib/project-files"
import { BinaryPreview } from "./binary-preview"
import { EditorToolbar } from "./editor-toolbar"
import { FileTree } from "./file-tree"
import { PdfPreview } from "./pdf-preview"
import { ShareDialog } from "./share-dialog"
import { useCompile } from "./use-compile"
import { useFileOps } from "./use-file-ops"
import { useProjectFiles } from "./use-project-files"
import { useSnapshot } from "./use-snapshot"

interface EditorShellProps {
  project: ProjectRow
  seedFiles: FileSeed[]
  compilerUrl: string
  isOwner: boolean
}

export function EditorShell({
  project,
  seedFiles,
  compilerUrl,
  isOwner,
}: EditorShellProps) {
  const { resolvedTheme } = useTheme()
  const monacoTheme = resolvedTheme === "light" ? "light" : "vs-dark"

  const doc = useProjectFiles({
    seedFiles,
    seedMainFileId: project.main_file_id,
    seedEngine: project.engine,
  })

  const [activeFileId, setActiveFileId] = useState<string | null>(null)

  // Pick an initial file once the room is ready, and recover when the active
  // file disappears (deleted by us or a collaborator).
  useEffect(() => {
    if (!doc.ready) return
    setActiveFileId((current) => {
      if (current && doc.files.some((f) => f.id === current)) return current
      return (
        doc.mainFileId ??
        doc.files.find((f) => f.kind === "text")?.id ??
        doc.files[0]?.id ??
        null
      )
    })
  }, [doc.ready, doc.files, doc.mainFileId])

  const fileOps = useFileOps(project.id, doc, setActiveFileId)
  const compile = useCompile({ compilerUrl })
  useSnapshot(project.id, doc)

  const activeFile = doc.files.find((f) => f.id === activeFileId) ?? null

  // Completion sources spanning the whole project, refreshed on doc changes.
  const { allLatex, allBibtex } = useMemo(() => {
    if (!doc.ready) return { allLatex: "", allBibtex: "" }
    const texts = doc.collectTextFiles()
    return {
      allLatex: texts
        .filter((t) => languageForPath(t.path) === "latex")
        .map((t) => t.content)
        .join("\n"),
      allBibtex: texts
        .filter((t) => pathExtension(t.path) === "bib")
        .map((t) => t.content)
        .join("\n"),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.ready, doc.version, doc.collectTextFiles])

  const handleCompile = useCallback(() => {
    if (!doc.ready) return
    const texts = doc.collectTextFiles()
    const main =
      doc.files.find((f) => f.id === doc.mainFileId && f.kind === "text") ??
      doc.files.find(
        (f) => f.kind === "text" && pathExtension(f.path) === "tex",
      )
    if (!main) {
      toast.error("Add a .tex file to compile")
      return
    }
    void compile.compile({
      projectId: project.id,
      files: texts.map(({ path, content }) => ({ path, content })),
      assets: doc.files
        .filter((f) => f.kind === "binary")
        .map((f) => ({ id: f.id, path: f.path })),
      mainFile: main.path,
      engine: doc.engine,
    })
  }, [doc, compile, project.id])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <EditorToolbar
        projectName={project.name}
        activeFilePath={activeFile?.path ?? null}
        engine={doc.engine}
        onEngineChange={doc.setEngine}
        onCompile={handleCompile}
        isCompiling={compile.isCompiling}
        shareSlot={<ShareDialog projectId={project.id} isOwner={isOwner} />}
      />
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* react-resizable-panels v4: bare numbers are pixels, percentages need strings */}
        <ResizablePanel defaultSize="16%" minSize="180px" maxSize="35%">
          {doc.ready ? (
            <FileTree
              files={doc.files}
              activeFileId={activeFileId}
              mainFileId={doc.mainFileId}
              uploading={fileOps.uploading}
              onOpen={setActiveFileId}
              onCreateFile={fileOps.createFile}
              onRename={fileOps.renameFile}
              onDelete={doc.deleteFile}
              onSetMain={doc.setMainFile}
              onUpload={(picked) => void fileOps.uploadFiles(picked)}
            />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
              Loading files...
            </div>
          )}
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="44%" minSize="25%">
          {doc.ready && activeFile ? (
            activeFile.kind === "text" ? (
              <LatexEditor
                key={activeFile.id}
                language={languageForPath(activeFile.path)}
                theme={monacoTheme}
                bibtexContent={allBibtex}
                labelsContent={allLatex}
                onMount={(editor) => doc.bindEditor(editor, activeFile.id)}
              />
            ) : (
              <BinaryPreview projectId={project.id} file={activeFile} />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="border-primary size-5 animate-spin rounded-full border-2 border-t-transparent" />
              <span className="text-muted-foreground text-sm">
                Loading document...
              </span>
            </div>
          )}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="40%" minSize="20%">
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
