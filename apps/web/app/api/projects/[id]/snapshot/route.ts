import { NextResponse } from "next/server"
import {
  normalizeProjectPath,
  projectPathError,
} from "@workspace/compiler-client/paths"
import { COMPILE_ENGINES } from "@workspace/compiler-client/types"
import { createAdminClient } from "@workspace/supabase/admin"
import {
  deleteProjectFiles,
  listProjectFiles,
  removeFileObjects,
  upsertProjectFiles,
} from "@workspace/supabase/files"
import { getProject, updateProject } from "@workspace/supabase/projects"
import { createClient } from "@workspace/supabase/server"
import type { ProjectFileInsert } from "@workspace/supabase/types"

const MAX_FILES = 300
const MAX_TOTAL_CONTENT_BYTES = 4 * 1024 * 1024
/** Rows younger than this survive reconciliation even when absent from the
 * payload — an upload may not have reached the announcing client's tree yet. */
const DELETE_GRACE_MS = 60_000

interface SnapshotFile {
  id?: unknown
  path?: unknown
  is_binary?: unknown
  content?: unknown
  mime_type?: unknown
  size_bytes?: unknown
}

interface Body {
  // Multi-file shape
  files?: SnapshotFile[]
  main_file_id?: unknown
  engine?: unknown
  // Legacy shape (clients loaded before the multi-file deploy)
  latex_content?: string
  bibtex_content?: string
}

/**
 * Persist the room's file tree: upsert every file, drop rows that left the
 * tree (plus their storage objects), and save main-file/engine settings.
 * The Yjs room is the live source of truth; this is its durable copy.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = (await request.json().catch(() => null)) as Body | null
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const project = await getProject(supabase, id)
  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Legacy clients: keep writing the old columns until every tab reloads.
  if (!Array.isArray(body.files)) {
    if (
      typeof body.latex_content !== "string" &&
      typeof body.bibtex_content !== "string"
    ) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }
    try {
      const updated = await updateProject(supabase, id, {
        latex_content: body.latex_content,
        bibtex_content: body.bibtex_content,
      })
      return NextResponse.json({ updated_at: updated.updated_at })
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
  }

  if (body.files.length === 0 || body.files.length > MAX_FILES) {
    return NextResponse.json({ error: "Invalid file count" }, { status: 400 })
  }

  const rows: ProjectFileInsert[] = []
  let totalBytes = 0
  for (const file of body.files) {
    if (typeof file.id !== "string" || file.id.length === 0 || file.id.length > 64) {
      return NextResponse.json({ error: "Invalid file id" }, { status: 400 })
    }
    if (typeof file.path !== "string") {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 })
    }
    const path = normalizeProjectPath(file.path)
    const problem = projectPathError(path)
    if (problem) {
      return NextResponse.json({ error: `${file.path}: ${problem}` }, { status: 400 })
    }
    const isBinary = file.is_binary === true
    const content = !isBinary && typeof file.content === "string" ? file.content : null
    totalBytes += content ? Buffer.byteLength(content, "utf8") : 0
    rows.push({
      project_id: id,
      id: file.id,
      path,
      is_binary: isBinary,
      content,
      mime_type: typeof file.mime_type === "string" ? file.mime_type : null,
      size_bytes: typeof file.size_bytes === "number" ? file.size_bytes : null,
    })
  }
  if (totalBytes > MAX_TOTAL_CONTENT_BYTES) {
    return NextResponse.json({ error: "Snapshot too large" }, { status: 413 })
  }

  try {
    await upsertProjectFiles(supabase, rows)

    // Reconcile deletions: anything in the DB but no longer in the tree.
    const existing = await listProjectFiles(supabase, id)
    const keep = new Set(rows.map((r) => r.id))
    const cutoff = Date.now() - DELETE_GRACE_MS
    const stale = existing.filter(
      (row) => !keep.has(row.id) && Date.parse(row.created_at) < cutoff,
    )
    if (stale.length > 0) {
      await deleteProjectFiles(supabase, id, stale.map((r) => r.id))
      const staleBinary = stale.filter((r) => r.is_binary).map((r) => r.id)
      if (staleBinary.length > 0) {
        await removeFileObjects(createAdminClient(), id, staleBinary)
      }
    }

    const mainFileId =
      typeof body.main_file_id === "string" && keep.has(body.main_file_id)
        ? body.main_file_id
        : null
    const engine =
      typeof body.engine === "string" &&
      (COMPILE_ENGINES as readonly string[]).includes(body.engine)
        ? body.engine
        : undefined
    // latex_content doubles as the project-card preview; updating it every
    // snapshot also keeps updated_at (card sorting) honest.
    const mainRow =
      rows.find((r) => r.id === mainFileId && !r.is_binary) ??
      rows.find((r) => !r.is_binary && r.path.endsWith(".tex")) ??
      rows.find((r) => !r.is_binary)
    const updated = await updateProject(supabase, id, {
      main_file_id: mainFileId,
      latex_content: (mainRow?.content ?? "").slice(0, 2000),
      ...(engine ? { engine } : {}),
    })

    return NextResponse.json({ updated_at: updated.updated_at })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    )
  }
}
