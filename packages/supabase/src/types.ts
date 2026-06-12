/** Persistent representation of a single LaTeX project. */
export type ProjectRow = {
  id: string
  owner_id: string
  name: string
  /** Legacy pre-multi-file snapshot of the .tex source. Migrated into project_files on first open. */
  latex_content: string
  /** Legacy pre-multi-file snapshot of the .bib source. Migrated into project_files on first open. */
  bibtex_content: string
  /** File id (project_files.id) of the root .tex document, null until set. */
  main_file_id: string | null
  /** LaTeX engine used for compilation. */
  engine: string
  created_at: string
  updated_at: string
}

export type ProjectInsert = {
  id?: string
  owner_id?: string
  name: string
  latex_content?: string
  bibtex_content?: string
  main_file_id?: string | null
  engine?: string
  created_at?: string
  updated_at?: string
}

export type ProjectUpdate = Partial<ProjectInsert>

/**
 * One file in a project. `id` doubles as the Yjs Y.Text key in the project's
 * collaboration room ('latex'/'bibtex' for projects migrated from the legacy
 * two-column layout, uuid strings otherwise).
 */
export type ProjectFileRow = {
  project_id: string
  id: string
  path: string
  is_binary: boolean
  /** Latest snapshot for text files; null for binary files (stored in the bucket). */
  content: string | null
  size_bytes: number | null
  mime_type: string | null
  created_at: string
  updated_at: string
}

export type ProjectFileInsert = {
  project_id: string
  id: string
  path: string
  is_binary?: boolean
  content?: string | null
  size_bytes?: number | null
  mime_type?: string | null
  created_at?: string
  updated_at?: string
}

export type ProjectFileUpdate = Partial<ProjectFileInsert>

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
      project_files: {
        Row: ProjectFileRow
        Insert: ProjectFileInsert
        Update: ProjectFileUpdate
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
    Functions: {
      consume_ai_request: {
        Args: { p_user_id: string; p_limit: number }
        Returns: { allowed: boolean; used: number }[]
      }
      refund_ai_request: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
