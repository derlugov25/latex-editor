import { NextResponse } from "next/server"
import { createClient } from "@workspace/supabase/server"
import { getProject } from "@workspace/supabase/projects"
import { createInvite, listInvites, deleteInvite } from "@workspace/supabase/members"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const invites = await listInvites(supabase, id)
    return NextResponse.json(invites)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const project = await getProject(supabase, id)
  if (!project || project.owner_id !== userData.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    role?: "editor" | "viewer"
  }

  try {
    const invite = await createInvite(supabase, id, userData.user.id, body.role ?? "editor")
    return NextResponse.json(invite, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: _id } = await params
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { inviteId?: string } | null
  if (!body?.inviteId) {
    return NextResponse.json({ error: "inviteId required" }, { status: 400 })
  }

  try {
    await deleteInvite(supabase, body.inviteId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
