"use client"

import { CollabRoom } from "@workspace/collab/room"
import type { ProjectRow } from "@workspace/supabase/types"
import { EditorShell } from "./editor-shell"

interface EditorPageProps {
  project: ProjectRow
  compilerUrl: string
}

export function EditorPage({ project, compilerUrl }: EditorPageProps) {
  return (
    <CollabRoom
      roomId={`project:${project.id}`}
      fallback={<RoomFallback />}
    >
      <EditorShell project={project} compilerUrl={compilerUrl} />
    </CollabRoom>
  )
}

function RoomFallback() {
  return (
    <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
      Connecting to collaboration room…
    </div>
  )
}
