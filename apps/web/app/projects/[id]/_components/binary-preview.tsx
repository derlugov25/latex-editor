"use client"

import { RiFile3Line } from "@remixicon/react"
import { isImagePath } from "@workspace/compiler-client/paths"
import { Button } from "@workspace/ui/components/button"
import type { ProjectFileEntry } from "./use-project-files"

interface BinaryPreviewProps {
  projectId: string
  file: ProjectFileEntry
}

function formatSize(bytes: number | undefined): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Image preview / download card for binary files (the /raw route 302s to a signed URL). */
export function BinaryPreview({ projectId, file }: BinaryPreviewProps) {
  const rawUrl = `/api/projects/${projectId}/files/${encodeURIComponent(file.id)}/raw`

  if (isImagePath(file.path)) {
    return (
      <div className="bg-muted/30 flex h-full flex-col">
        <div className="text-muted-foreground border-b px-4 py-2 text-xs">
          {file.path} {file.sizeBytes ? `· ${formatSize(file.sizeBytes)}` : ""}
        </div>
        <div className="flex flex-1 items-center justify-center overflow-auto p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rawUrl}
            alt={file.path}
            className="max-h-full max-w-full rounded border bg-white object-contain shadow-sm"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="bg-muted/50 rounded-2xl p-4">
        <RiFile3Line className="size-8 opacity-40" />
      </div>
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">{file.path}</p>
        <p className="text-xs opacity-60">
          {formatSize(file.sizeBytes ?? 0) || "Binary file"} — no preview available
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <a href={rawUrl} download target="_blank" rel="noreferrer">
          Download
        </a>
      </Button>
    </div>
  )
}
