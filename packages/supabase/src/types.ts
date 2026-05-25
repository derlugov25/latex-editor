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

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: ProjectRow
        Insert: ProjectInsert
        Update: ProjectUpdate
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
