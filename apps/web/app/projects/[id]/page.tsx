import { notFound } from "next/navigation"
import { getProject } from "@workspace/supabase/projects"
import { compilerUrl } from "@/lib/env"
import { requireUser } from "@/lib/auth"
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

  return (
    <div className="flex h-svh flex-col">
      <AppHeader email={user.email ?? null} />
      <EditorPage project={project} compilerUrl={compilerUrl} />
    </div>
  )
}
