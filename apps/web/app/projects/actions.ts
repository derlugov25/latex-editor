"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@workspace/supabase/server"
import {
  createProject,
  deleteProject,
} from "@workspace/supabase/projects"
import { DEFAULT_BIBTEX, DEFAULT_LATEX } from "@/lib/sample-content"

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim() || "Untitled project"

  const supabase = await createClient()
  const project = await createProject(supabase, {
    name,
    latex_content: DEFAULT_LATEX,
    bibtex_content: DEFAULT_BIBTEX,
  })

  revalidatePath("/projects")
  redirect(`/projects/${project.id}`)
}

export async function deleteProjectAction(formData: FormData) {
  const id = String(formData.get("id") ?? "")
  if (!id) return
  const supabase = await createClient()
  await deleteProject(supabase, id)
  revalidatePath("/projects")
}
