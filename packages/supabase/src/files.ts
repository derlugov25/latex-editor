import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, ProjectFileInsert, ProjectFileRow } from "./types"

type Client = SupabaseClient<Database>

/** Private bucket holding binary project files (images, PDFs, ...). */
export const FILES_BUCKET = "project-files"

/** Storage object key for a binary file. Keyed by id so renames never move objects. */
export function fileStorageKey(projectId: string, fileId: string): string {
  return `${projectId}/${fileId}`
}

export async function listProjectFiles(
  supabase: Client,
  projectId: string,
): Promise<ProjectFileRow[]> {
  const { data, error } = await supabase
    .from("project_files")
    .select("*")
    .eq("project_id", projectId)
    .order("path")
  if (error) throw error
  return data ?? []
}

export async function upsertProjectFiles(
  supabase: Client,
  rows: ProjectFileInsert[],
): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase
    .from("project_files")
    .upsert(rows, { onConflict: "project_id,id" })
  if (error) throw error
}

export async function insertProjectFile(
  supabase: Client,
  row: ProjectFileInsert,
): Promise<ProjectFileRow> {
  const { data, error } = await supabase
    .from("project_files")
    .insert(row)
    .select("*")
    .single()
  if (error) throw error
  return data
}

export async function deleteProjectFiles(
  supabase: Client,
  projectId: string,
  fileIds: string[],
): Promise<void> {
  if (fileIds.length === 0) return
  const { error } = await supabase
    .from("project_files")
    .delete()
    .eq("project_id", projectId)
    .in("id", fileIds)
  if (error) throw error
}

/** Remove the storage objects backing the given binary files. Best-effort. */
export async function removeFileObjects(
  admin: Client,
  projectId: string,
  fileIds: string[],
): Promise<void> {
  if (fileIds.length === 0) return
  await admin.storage
    .from(FILES_BUCKET)
    .remove(fileIds.map((id) => fileStorageKey(projectId, id)))
}

/** Remove every storage object under a project's prefix (project deletion). */
export async function removeProjectObjects(
  admin: Client,
  projectId: string,
): Promise<void> {
  const { data } = await admin.storage.from(FILES_BUCKET).list(projectId, {
    limit: 1000,
  })
  const keys = (data ?? []).map((obj) => `${projectId}/${obj.name}`)
  if (keys.length > 0) {
    await admin.storage.from(FILES_BUCKET).remove(keys)
  }
}
