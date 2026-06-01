/** Persistent representation of a single LaTeX project. */
export type ProjectRow = {
  id: string
  owner_id: string
  name: string
  /** Latest snapshot of the .tex source. The live edited copy lives in Liveblocks/Yjs. */
  latex_content: string
  /** Latest snapshot of the .bib source. Empty string when no bibliography is in use. */
  bibtex_content: string
  created_at: string
  updated_at: string
}

export type ProjectInsert = {
  id?: string
  owner_id?: string
  name: string
  latex_content?: string
  bibtex_content?: string
  created_at?: string
  updated_at?: string
}

export type ProjectUpdate = Partial<ProjectInsert>

export type MemberRole = "editor" | "viewer"

export type ProjectMemberRow = {
  project_id: string
  user_id: string
  role: MemberRole
  created_at: string
}

export type ProjectInviteRow = {
  id: string
  project_id: string
  created_by: string
  role: MemberRole
  expires_at: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: ProjectRow
        Insert: ProjectInsert
        Update: ProjectUpdate
        Relationships: []
      }
      project_members: {
        Row: ProjectMemberRow
        Insert: { project_id: string; user_id: string; role?: MemberRole }
        Update: { role?: MemberRole }
        Relationships: []
      }
      project_invites: {
        Row: ProjectInviteRow
        Insert: {
          id?: string
          project_id: string
          created_by?: string
          role?: MemberRole
          expires_at?: string | null
        }
        Update: { role?: MemberRole; expires_at?: string | null }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
