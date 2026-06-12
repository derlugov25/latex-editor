import { NextResponse } from "next/server"
import { createAdminClient } from "@workspace/supabase/admin"
import { FILES_BUCKET, fileStorageKey } from "@workspace/supabase/files"
import { getProject } from "@workspace/supabase/projects"
import { createClient } from "@workspace/supabase/server"

const SIGNED_URL_TTL_SECONDS = 300

/** Redirect to a short-lived signed URL for a binary file (image preview/download). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id: projectId, fileId } = await params

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const project = await getProject(supabase, projectId)
  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: row } = await supabase
    .from("project_files")
    .select("id, is_binary")
    .eq("project_id", projectId)
    .eq("id", fileId)
    .maybeSingle()
  if (!row || !row.is_binary) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(FILES_BUCKET)
    .createSignedUrl(fileStorageKey(projectId, fileId), SIGNED_URL_TTL_SECONDS)
  if (error || !data) {
    return NextResponse.json({ error: "Could not sign URL" }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  })
}
