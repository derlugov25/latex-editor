import { notFound } from "next/navigation"
import { getProject } from "@workspace/supabase/projects"
import { listProjectFiles } from "@workspace/supabase/files"
import { compilerUrl } from "@/lib/env"
import { requireUser, userDisplayName } from "@/lib/auth"
import { migrateLegacyProject } from "@/lib/migrate-legacy"
import { rowToSeed } from "@/lib/project-files"
import { AppHeader } from "../_components/header"
import { EditorPage } from "./_components/editor-page"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, user } = await requireUser()
  const project = await getProject(supabase, id)
  if (!project) notFound()

  let fileRows = await listProjectFiles(supabase, id)
  if (fileRows.length === 0) {
    fileRows = await migrateLegacyProject(supabase, project)
  }

  const isOwner = project.owner_id === user.id

  return (
    <div className="flex h-svh flex-col">
      <AppHeader email={userDisplayName(user)} />
      <EditorPage
        project={project}
        seedFiles={fileRows.map(rowToSeed)}
        compilerUrl={compilerUrl}
        isOwner={isOwner}
      />
    </div>
  )
}
