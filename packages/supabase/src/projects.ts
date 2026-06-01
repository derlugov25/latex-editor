import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  Database,
  ProjectInsert,
  ProjectRow,
  ProjectUpdate,
} from "./types"

type Client = SupabaseClient<Database>

/**
 * List all projects accessible to the current user (owned + shared).
 * With the updated RLS policies, a simple select("*") returns both.
 */
export async function listProjects(supabase: Client): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getProject(
  supabase: Client,
  id: string,
): Promise<ProjectRow | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createProject(
  supabase: Client,
  input: ProjectInsert,
): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from("projects")
    .insert(input)
    .select("*")
    .single()
  if (error) throw error
  return data
}

export async function updateProject(
  supabase: Client,
  id: string,
  patch: ProjectUpdate,
): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single()
  if (error) throw error
  return data
}

export async function deleteProject(
  supabase: Client,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id)
  if (error) throw error
}
