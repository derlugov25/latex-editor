"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"
import {
  classifyPath,
  normalizeProjectPath,
  projectPathError,
} from "@workspace/compiler-client/paths"
import type { ProjectFilesHandle } from "./use-project-files"

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

interface SignResponse {
  fileId: string
  uploadUrl: string
  error?: string
}

export interface FileOps {
  uploading: boolean
  /** Returns a user-facing error or null; opens the new file on success. */
  createFile(rawPath: string): string | null
  renameFile(fileId: string, rawPath: string): string | null
  uploadFiles(picked: File[]): Promise<void>
}

/**
 * File management on top of the collaborative tree. Text files live purely in
 * Yjs (persisted via snapshots); binary files are uploaded straight to the
 * storage bucket through a short-lived signed URL, then announced to the room.
 */
export function useFileOps(
  projectId: string,
  project: ProjectFilesHandle,
  onOpenFile: (fileId: string) => void,
): FileOps {
  const [uploading, setUploading] = useState(false)

  const validate = useCallback(
    (rawPath: string, ignoreFileId?: string): { path?: string; error?: string } => {
      const path = normalizeProjectPath(rawPath)
      const problem = projectPathError(path)
      if (problem) return { error: problem }
      const conflict = project.files.find(
        (f) => f.path === path && f.id !== ignoreFileId,
      )
      if (conflict) return { error: `"${path}" already exists` }
      return { path }
    },
    [project],
  )

  const createFile = useCallback(
    (rawPath: string): string | null => {
      const { path, error } = validate(rawPath)
      if (error || !path) return error ?? "Invalid path"
      if (classifyPath(path) !== "text") {
        return "Only text files can be created here — use Upload for images"
      }
      const id = project.createTextFile(path)
      onOpenFile(id)
      return null
    },
    [validate, project, onOpenFile],
  )

  const renameFile = useCallback(
    (fileId: string, rawPath: string): string | null => {
      const current = project.files.find((f) => f.id === fileId)
      if (!current) return "File no longer exists"
      const { path, error } = validate(rawPath, fileId)
      if (error || !path) return error ?? "Invalid path"
      if (path === current.path) return null
      // Keep the text/binary nature stable: content can't change shape on rename.
      if (classifyPath(path) !== current.kind) {
        return current.kind === "text"
          ? "A text file must keep a text extension (.tex, .bib, ...)"
          : "An uploaded binary file must keep a binary extension"
      }
      project.renameFile(fileId, path)
      return null
    },
    [validate, project],
  )

  const uploadOne = useCallback(
    async (file: File) => {
      const targetPath = normalizeProjectPath(file.name)
      const problem = projectPathError(targetPath)
      if (problem) {
        toast.error(`${file.name}: ${problem}`)
        return
      }
      // A name collision on upload means "replace the file" (Overleaf behavior).
      const existing = project.files.find((f) => f.path === targetPath)
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${file.name}: larger than 50 MB`)
        return
      }

      if (classifyPath(targetPath) === "text") {
        const content = await file.text()
        if (existing && existing.kind === "text") {
          project.replaceTextContent(existing.id, content)
          onOpenFile(existing.id)
        } else if (existing) {
          toast.error(`${file.name}: a binary file with this name exists`)
        } else {
          onOpenFile(project.createTextFile(targetPath, content))
        }
        return
      }

      const signResponse = await fetch(`/api/projects/${projectId}/files/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: targetPath,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      })
      const sign = (await signResponse.json().catch(() => null)) as SignResponse | null
      if (!signResponse.ok || !sign?.uploadUrl) {
        toast.error(`${file.name}: ${sign?.error ?? "could not start upload"}`)
        return
      }

      const put = await fetch(sign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      })
      if (!put.ok) {
        toast.error(`${file.name}: upload failed (HTTP ${put.status})`)
        return
      }

      project.registerBinaryFile({
        id: sign.fileId,
        path: targetPath,
        kind: "binary",
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      })
      // Replacing an existing binary: drop the old entry (and its object, via
      // snapshot reconciliation) once the new one is in place.
      if (existing && existing.kind === "binary" && existing.id !== sign.fileId) {
        project.deleteFile(existing.id)
      }
      onOpenFile(sign.fileId)
    },
    [project, projectId, onOpenFile],
  )

  const uploadFiles = useCallback(
    async (picked: File[]) => {
      setUploading(true)
      try {
        for (const file of picked) {
          await uploadOne(file)
        }
      } finally {
        setUploading(false)
      }
    },
    [uploadOne],
  )

  return { uploading, createFile, renameFile, uploadFiles }
}
