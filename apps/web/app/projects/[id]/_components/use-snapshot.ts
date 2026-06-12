"use client"

import { useEffect, useRef } from "react"
import type { ProjectFilesHandle } from "./use-project-files"

const DEBOUNCE_MS = 1500

/** Body of PUT /api/projects/{id}/snapshot — the full file tree. */
export interface SnapshotBody {
  main_file_id: string | null
  engine: string
  files: Array<{
    id: string
    path: string
    is_binary: boolean
    content: string | null
    mime_type: string | null
    size_bytes: number | null
  }>
}

/**
 * Debounced PUT of the current project tree to /api/projects/{id}/snapshot.
 * Lets refreshes resume from the last committed state and keeps an
 * authoritative copy outside of the Liveblocks room.
 */
export function useSnapshot(projectId: string, project: ProjectFilesHandle) {
  const lastSaved = useRef<string>("")
  const { ready, version } = project
  const projectRef = useRef(project)
  projectRef.current = project

  useEffect(() => {
    if (!ready) return

    const handle = window.setTimeout(() => {
      const current = projectRef.current
      const texts = current.collectTextFiles()
      const contentById = new Map(texts.map((t) => [t.id, t.content]))
      const body: SnapshotBody = {
        main_file_id: current.mainFileId,
        engine: current.engine,
        files: current.files.map((f) => ({
          id: f.id,
          path: f.path,
          is_binary: f.kind === "binary",
          content: f.kind === "binary" ? null : (contentById.get(f.id) ?? ""),
          mime_type: f.mimeType ?? null,
          size_bytes: f.sizeBytes ?? null,
        })),
      }
      // An empty tree is never a legitimate snapshot — don't wipe the DB copy.
      if (body.files.length === 0) return

      const serialized = JSON.stringify(body)
      if (serialized === lastSaved.current) return

      void fetch(`/api/projects/${projectId}/snapshot`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: serialized,
      })
        .then((r) => {
          if (r.ok) lastSaved.current = serialized
          else console.warn("[snapshot] save failed:", r.status)
        })
        .catch((err) => console.warn("[snapshot] network error:", err))
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(handle)
  }, [projectId, ready, version])
}
