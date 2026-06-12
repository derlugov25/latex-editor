import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import {
  classifyPath,
  normalizeProjectPath,
  projectPathError,
} from "@workspace/compiler-client/paths"
import { createAdminClient } from "@workspace/supabase/admin"
import {
  FILES_BUCKET,
  fileStorageKey,
  insertProjectFile,
} from "@workspace/supabase/files"
import { getProject } from "@workspace/supabase/projects"
import { createClient } from "@workspace/supabase/server"

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

interface Body {
  path?: string
  mimeType?: string
  sizeBytes?: number
}

/**
 * Start a binary upload: register the file row and hand the client a signed
 * URL it PUTs the bytes to directly (bypasses the serverless body limit).
 * The room entry is added by the client once the upload finishes; rows whose
 * upload never completed are swept by snapshot reconciliation.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params
  const body = (await request.json().catch(() => null)) as Body | null
  if (!body?.path) {
    return NextResponse.json({ error: "Field `path` is required" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const project = await getProject(supabase, projectId)
  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const path = normalizeProjectPath(body.path)
  const problem = projectPathError(path)
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 })
  }
  if (classifyPath(path) !== "binary") {
    return NextResponse.json(
      { error: "Text files are saved through the editor, not uploaded" },
      { status: 400 },
    )
  }
  const sizeBytes = Number(body.sizeBytes ?? 0)
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0 || sizeBytes > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is larger than 50 MB" }, { status: 413 })
  }

  const fileId = randomUUID()
  try {
    // RLS rejects this for viewers — only owners/editors may add files.
    await insertProjectFile(supabase, {
      project_id: projectId,
      id: fileId,
      path,
      is_binary: true,
      mime_type: body.mimeType ?? null,
      size_bytes: sizeBytes || null,
    })
  } catch {
    return NextResponse.json(
      { error: "You do not have permission to add files" },
      { status: 403 },
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(FILES_BUCKET)
    .createSignedUploadUrl(fileStorageKey(projectId, fileId))
  if (error || !data) {
    return NextResponse.json(
      { error: `Could not create upload URL: ${error?.message ?? "unknown"}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ fileId, uploadUrl: data.signedUrl })
}
