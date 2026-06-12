import type { ProjectFileRow } from "@workspace/supabase/types"

/**
 * Server-fetched snapshot of one project file, used to seed the collaboration
 * room when its file map is empty (first open after the schema migration, or
 * a brand-new Liveblocks room).
 */
export interface FileSeed {
  id: string
  path: string
  isBinary: boolean
  /** Text files only. */
  content: string | null
  mimeType: string | null
  sizeBytes: number | null
}

export function rowToSeed(row: ProjectFileRow): FileSeed {
  return {
    id: row.id,
    path: row.path,
    isBinary: row.is_binary,
    content: row.content,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
  }
}

/** Yjs text keys used by projects created before multi-file support. */
export const LEGACY_LATEX_FILE_ID = "latex"
export const LEGACY_BIBTEX_FILE_ID = "bibtex"
