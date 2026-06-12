"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type * as Monaco from "monaco-editor"
import type * as Y from "yjs"
import { pathExtension } from "@workspace/compiler-client/paths"
import type { CompileEngine } from "@workspace/compiler-client/types"
import { attachRemoteCursorStyles } from "@workspace/collab/cursor-styles"
import { bindMonacoToYjs, type MonacoBindingHandle } from "@workspace/collab/monaco-binding"
import { useSelf } from "@workspace/collab/room"
import { useYjs } from "@workspace/collab/yjs"
import type { FileSeed } from "@/lib/project-files"

/** Value stored per file in the room's Y.Map("files"). Replaced wholesale on rename. */
interface FileMeta {
  path: string
  kind: "text" | "binary"
  mimeType?: string
  sizeBytes?: number
}

export interface ProjectFileEntry extends FileMeta {
  id: string
}

export interface TextFileSnapshot {
  id: string
  path: string
  content: string
}

interface UseProjectFilesOptions {
  seedFiles: FileSeed[]
  seedMainFileId: string | null
  seedEngine: string
}

export interface ProjectFilesHandle {
  /** True once the room has synced and seed content is in place. */
  ready: boolean
  /** All files, sorted by path. */
  files: ProjectFileEntry[]
  /** Bumps on every document change (tree or any text). */
  version: number
  mainFileId: string | null
  engine: CompileEngine
  setMainFile(fileId: string): void
  setEngine(engine: CompileEngine): void
  /** Create a text file; returns its id. */
  createTextFile(path: string, content?: string): string
  /** Overwrite a text file's whole content (file upload over an existing path). */
  replaceTextContent(fileId: string, content: string): void
  /** Announce an uploaded binary file to collaborators. */
  registerBinaryFile(entry: ProjectFileEntry): void
  renameFile(fileId: string, newPath: string): void
  deleteFile(fileId: string): void
  getText(fileId: string): string
  /** Snapshot every text file (for compile/persistence). */
  collectTextFiles(): TextFileSnapshot[]
  bindEditor(editor: Monaco.editor.IStandaloneCodeEditor, fileId: string): void
}

const VALID_ENGINES: ReadonlySet<string> = new Set([
  "pdflatex",
  "xelatex",
  "lualatex",
])

function sortedEntries(filesMap: Y.Map<FileMeta>): ProjectFileEntry[] {
  const entries: ProjectFileEntry[] = []
  filesMap.forEach((meta, id) => {
    if (meta && typeof meta.path === "string") entries.push({ id, ...meta })
  })
  return entries.sort((a, b) => a.path.localeCompare(b.path))
}

function pickDefaultMain(entries: ProjectFileEntry[]): string | null {
  const texFiles = entries.filter(
    (e) => e.kind === "text" && pathExtension(e.path) === "tex",
  )
  if (texFiles.length === 0) return null
  return (
    texFiles.find((e) => e.path === "main.tex") ??
    texFiles.find((e) => !e.path.includes("/"))  ??
    texFiles[0]!
  ).id
}

/**
 * Multi-file collaborative project state. The room's Y.Doc holds:
 *  - Y.Map("files"): fileId -> {path, kind, ...} (the tree)
 *  - Y.Map("meta"):  mainFileId, engine
 *  - Y.Text(fileId): content of each text file
 * The Postgres `project_files` rows are only a persistence snapshot; they seed
 * the room once (when the map is empty) and are refreshed via useSnapshot.
 */
export function useProjectFiles(options: UseProjectFilesOptions): ProjectFilesHandle {
  const yjs = useYjs()
  // Subscribe only to the stable auth-time identity, not the whole self —
  // see use-collab-doc history (#185) for the feedback-loop hazard.
  const userInfo = useSelf(
    (me) => (me.info ?? null) as { name?: string; color?: string } | null,
  )

  const filesMap = useMemo(() => yjs.doc.getMap<FileMeta>("files"), [yjs.doc])
  const metaMap = useMemo(
    () => yjs.doc.getMap<string | null>("meta"),
    [yjs.doc],
  )

  const [seeded, setSeeded] = useState(false)
  const [files, setFiles] = useState<ProjectFileEntry[]>([])
  const [version, setVersion] = useState(0)
  const [mainFileId, setMainFileId] = useState<string | null>(null)
  const [engine, setEngineState] = useState<CompileEngine>("pdflatex")

  const seedRef = useRef(options)
  seedRef.current = options

  useEffect(() => {
    if (!yjs.ready) return
    const { seedFiles, seedMainFileId, seedEngine } = seedRef.current

    yjs.doc.transact(() => {
      if (filesMap.size === 0 && seedFiles.length > 0) {
        for (const seed of seedFiles) {
          filesMap.set(seed.id, {
            path: seed.path,
            kind: seed.isBinary ? "binary" : "text",
            ...(seed.mimeType ? { mimeType: seed.mimeType } : {}),
            ...(seed.sizeBytes != null ? { sizeBytes: seed.sizeBytes } : {}),
          })
          if (!seed.isBinary && seed.content) {
            const text = yjs.doc.getText(seed.id)
            if (text.length === 0) text.insert(0, seed.content)
          }
        }
      }
      if (!metaMap.get("mainFileId")) {
        const main =
          seedMainFileId && filesMap.has(seedMainFileId)
            ? seedMainFileId
            : pickDefaultMain(sortedEntries(filesMap))
        if (main) metaMap.set("mainFileId", main)
      }
      if (!metaMap.get("engine") && VALID_ENGINES.has(seedEngine)) {
        metaMap.set("engine", seedEngine)
      }
    })

    const syncTree = () => {
      setFiles(sortedEntries(filesMap))
      const main = metaMap.get("mainFileId")
      setMainFileId(typeof main === "string" && filesMap.has(main) ? main : null)
      const eng = metaMap.get("engine")
      setEngineState(
        typeof eng === "string" && VALID_ENGINES.has(eng)
          ? (eng as CompileEngine)
          : "pdflatex",
      )
    }
    const bumpVersion = () => setVersion((v) => v + 1)

    syncTree()
    bumpVersion()
    setSeeded(true)

    filesMap.observe(syncTree)
    metaMap.observe(syncTree)
    // Any doc change (tree, meta, or any file's text) bumps the version, which
    // drives snapshot persistence and derived completion sources.
    yjs.doc.on("update", bumpVersion)
    return () => {
      filesMap.unobserve(syncTree)
      metaMap.unobserve(syncTree)
      yjs.doc.off("update", bumpVersion)
    }
  }, [yjs.ready, yjs.doc, filesMap, metaMap])

  // Remote carets: colors/labels for decorations emitted by y-monaco.
  useEffect(() => {
    if (!yjs.ready) return
    return attachRemoteCursorStyles(yjs.provider.awareness)
  }, [yjs.ready, yjs.provider])

  // Publish our identity once name/color resolve (never on cursor moves).
  useEffect(() => {
    if (!yjs.ready) return
    yjs.provider.awareness.setLocalStateField("user", {
      name: userInfo?.name ?? "Anonymous",
      color: userInfo?.color ?? "#64748b",
    })
  }, [yjs.ready, yjs.provider, userInfo?.name, userInfo?.color])

  const bindingRef = useRef<MonacoBindingHandle | null>(null)
  useEffect(
    () => () => {
      bindingRef.current?.dispose()
      bindingRef.current = null
    },
    [],
  )

  const createTextFile = useCallback(
    (path: string, content?: string): string => {
      const id = crypto.randomUUID()
      yjs.doc.transact(() => {
        if (content) yjs.doc.getText(id).insert(0, content)
        filesMap.set(id, { path, kind: "text" })
        if (!metaMap.get("mainFileId") && pathExtension(path) === "tex") {
          metaMap.set("mainFileId", id)
        }
      })
      return id
    },
    [yjs.doc, filesMap, metaMap],
  )

  const replaceTextContent = useCallback(
    (fileId: string, content: string) => {
      yjs.doc.transact(() => {
        const text = yjs.doc.getText(fileId)
        if (text.length > 0) text.delete(0, text.length)
        if (content) text.insert(0, content)
      })
    },
    [yjs.doc],
  )

  const registerBinaryFile = useCallback(
    (entry: ProjectFileEntry) => {
      const { id, ...meta } = entry
      filesMap.set(id, { ...meta, kind: "binary" })
    },
    [filesMap],
  )

  const renameFile = useCallback(
    (fileId: string, newPath: string) => {
      const meta = filesMap.get(fileId)
      if (!meta) return
      filesMap.set(fileId, { ...meta, path: newPath })
    },
    [filesMap],
  )

  const deleteFile = useCallback(
    (fileId: string) => {
      yjs.doc.transact(() => {
        filesMap.delete(fileId)
        const text = yjs.doc.getText(fileId)
        if (text.length > 0) text.delete(0, text.length)
        if (metaMap.get("mainFileId") === fileId) {
          const fallback = pickDefaultMain(sortedEntries(filesMap))
          if (fallback) metaMap.set("mainFileId", fallback)
          else metaMap.delete("mainFileId")
        }
      })
    },
    [yjs.doc, filesMap, metaMap],
  )

  const setMainFile = useCallback(
    (fileId: string) => {
      if (filesMap.has(fileId)) metaMap.set("mainFileId", fileId)
    },
    [filesMap, metaMap],
  )

  const setEngine = useCallback(
    (next: CompileEngine) => {
      if (VALID_ENGINES.has(next)) metaMap.set("engine", next)
    },
    [metaMap],
  )

  const getText = useCallback(
    (fileId: string) => yjs.doc.getText(fileId).toString(),
    [yjs.doc],
  )

  const collectTextFiles = useCallback((): TextFileSnapshot[] => {
    return sortedEntries(filesMap)
      .filter((entry) => entry.kind === "text")
      .map((entry) => ({
        id: entry.id,
        path: entry.path,
        content: yjs.doc.getText(entry.id).toString(),
      }))
  }, [filesMap, yjs.doc])

  const bindEditor = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, fileId: string) => {
      bindingRef.current?.dispose()
      bindingRef.current = bindMonacoToYjs({
        editor,
        doc: yjs.doc,
        provider: yjs.provider,
        textName: fileId,
      })
    },
    [yjs.doc, yjs.provider],
  )

  return {
    ready: seeded,
    files,
    version,
    mainFileId,
    engine,
    setMainFile,
    setEngine,
    createTextFile,
    replaceTextContent,
    registerBinaryFile,
    renameFile,
    deleteFile,
    getText,
    collectTextFiles,
    bindEditor,
  }
}
