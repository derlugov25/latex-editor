import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, MemberRole, ProjectInviteRow, ProjectMemberRow } from "./types"

type Client = SupabaseClient<Database>

export async function listMembers(
  supabase: Client,
  projectId: string,
): Promise<ProjectMemberRow[]> {
  const { data, error } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at")
  if (error) throw error
  return data ?? []
}

export async function addMember(
  supabase: Client,
  projectId: string,
  userId: string,
  role: MemberRole = "editor",
): Promise<ProjectMemberRow> {
  const { data, error } = await supabase
    .from("project_members")
    .upsert({ project_id: projectId, user_id: userId, role })
    .select("*")
    .single()
  if (error) throw error
  return data
}

export async function removeMember(
  supabase: Client,
  projectId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId)
  if (error) throw error
}

export async function createInvite(
  supabase: Client,
  projectId: string,
  createdBy: string,
  role: MemberRole = "editor",
): Promise<ProjectInviteRow> {
  const { data, error } = await supabase
    .from("project_invites")
    .insert({ project_id: projectId, created_by: createdBy, role })
    .select("*")
    .single()
  if (error) throw error
  return data
}

export async function getInvite(
  supabase: Client,
  token: string,
): Promise<ProjectInviteRow | null> {
  const { data, error } = await supabase
    .from("project_invites")
    .select("*")
    .eq("id", token)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  return data
}

export async function acceptInvite(
  adminSupabase: Client,
  token: string,
  userId: string,
): Promise<{ projectId: string }> {
  const { data: invite, error } = await adminSupabase
    .from("project_invites")
    .select("*")
    .eq("id", token)
    .maybeSingle()
  if (error) throw error
  if (!invite) throw new Error("Invite not found")
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    throw new Error("Invite expired")
  }

  const { error: memberError } = await adminSupabase
    .from("project_members")
    .upsert({ project_id: invite.project_id, user_id: userId, role: invite.role })
  if (memberError) throw memberError

  return { projectId: invite.project_id }
}

export async function deleteInvite(
  supabase: Client,
  inviteId: string,
): Promise<void> {
  const { error } = await supabase
    .from("project_invites")
    .delete()
    .eq("id", inviteId)
  if (error) throw error
}

export async function listInvites(
  supabase: Client,
  projectId: string,
): Promise<ProjectInviteRow[]> {
  const { data, error } = await supabase
    .from("project_invites")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}
