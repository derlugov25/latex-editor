import type { SupabaseClient } from "@supabase/supabase-js"
import { upsertProjectFiles } from "@workspace/supabase/files"
import { updateProject } from "@workspace/supabase/projects"
import type {
  Database,
  ProjectFileInsert,
  ProjectFileRow,
  ProjectRow,
} from "@workspace/supabase/types"
import {
  LEGACY_BIBTEX_FILE_ID,
  LEGACY_LATEX_FILE_ID,
} from "@/lib/project-files"

/**
 * Convert a pre-multi-file project (content in projects.latex_content /
 * bibtex_content) into project_files rows on first open. The file ids reuse
 * the historical Yjs text keys, so existing collaboration rooms keep their
 * content with no copying.
 *
 * Persistence is best-effort: viewers lack write access, so on failure the
 * rows are still returned in-memory — the room seeds correctly and an editor
 * persists them later via the snapshot route.
 */
export async function migrateLegacyProject(
  supabase: SupabaseClient<Database>,
  project: ProjectRow,
): Promise<ProjectFileRow[]> {
  const now = new Date().toISOString()
  const rows: ProjectFileInsert[] = []
  if (project.latex_content) {
    rows.push({
      project_id: project.id,
      id: LEGACY_LATEX_FILE_ID,
      path: "main.tex",
      is_binary: false,
      content: project.latex_content,
    })
  }
  if (project.bibtex_content) {
    rows.push({
      project_id: project.id,
      id: LEGACY_BIBTEX_FILE_ID,
      path: "references.bib",
      is_binary: false,
      content: project.bibtex_content,
    })
  }
  if (rows.length === 0) return []

  const mainFileId = project.latex_content ? LEGACY_LATEX_FILE_ID : null
  try {
    await upsertProjectFiles(supabase, rows)
    if (mainFileId && !project.main_file_id) {
      await updateProject(supabase, project.id, { main_file_id: mainFileId })
    }
  } catch (err) {
    console.warn("[migrate-legacy] could not persist file rows:", err)
  }

  return rows.map((row) => ({
    project_id: row.project_id,
    id: row.id,
    path: row.path,
    is_binary: false,
    content: row.content ?? null,
    size_bytes: null,
    mime_type: null,
    created_at: now,
    updated_at: now,
  }))
}
