"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAdminClient } from "@workspace/supabase/admin"
import {
  removeProjectObjects,
  upsertProjectFiles,
} from "@workspace/supabase/files"
import {
  createProject,
  deleteProject,
  updateProject,
} from "@workspace/supabase/projects"
import { createClient } from "@workspace/supabase/server"
import { DEFAULT_BIBTEX, DEFAULT_LATEX } from "@/lib/sample-content"

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim() || "Untitled project"

  const supabase = await createClient()
  const project = await createProject(supabase, { name })

  const mainFileId = randomUUID()
  await upsertProjectFiles(supabase, [
    {
      project_id: project.id,
      id: mainFileId,
      path: "main.tex",
      is_binary: false,
      content: DEFAULT_LATEX,
    },
    {
      project_id: project.id,
      id: randomUUID(),
      path: "references.bib",
      is_binary: false,
      content: DEFAULT_BIBTEX,
    },
  ])
  await updateProject(supabase, project.id, { main_file_id: mainFileId })

  revalidatePath("/projects")
  redirect(`/projects/${project.id}`)
}

export async function deleteProjectAction(formData: FormData) {
  const id = String(formData.get("id") ?? "")
  if (!id) return
  const supabase = await createClient()
  await deleteProject(supabase, id)
  // Row cascade removed project_files; storage objects need explicit cleanup.
  await removeProjectObjects(createAdminClient(), id).catch(() => {})
  revalidatePath("/projects")
}
