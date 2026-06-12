"use client"

import { CollabRoom } from "@workspace/collab/room"
import type { ProjectRow } from "@workspace/supabase/types"
import type { FileSeed } from "@/lib/project-files"
import { EditorShell } from "./editor-shell"

interface EditorPageProps {
  project: ProjectRow
  seedFiles: FileSeed[]
  compilerUrl: string
  isOwner: boolean
}

export function EditorPage({
  project,
  seedFiles,
  compilerUrl,
  isOwner,
}: EditorPageProps) {
  return (
    <CollabRoom roomId={`project:${project.id}`} fallback={<RoomFallback />}>
      <EditorShell
        project={project}
        seedFiles={seedFiles}
        compilerUrl={compilerUrl}
        isOwner={isOwner}
      />
    </CollabRoom>
  )
}

function RoomFallback() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <div className="bg-muted h-4 w-6 animate-pulse rounded" />
        <div className="bg-muted h-4 w-32 animate-pulse rounded" />
        <div className="bg-muted ml-4 h-7 w-48 animate-pulse rounded-md" />
        <div className="bg-muted ml-auto h-8 w-24 animate-pulse rounded-md" />
      </div>
      <div className="flex flex-1 items-center justify-center gap-3">
        <div className="border-primary size-5 animate-spin rounded-full border-2 border-t-transparent" />
        <span className="text-muted-foreground text-sm">Connecting to collaboration room...</span>
      </div>
    </div>
  )
}
