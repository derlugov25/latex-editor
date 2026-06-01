import { NextResponse } from "next/server"
import { createClient } from "@workspace/supabase/server"
import { removeMember } from "@workspace/supabase/members"
import { getProject } from "@workspace/supabase/projects"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id, userId } = await params
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const project = await getProject(supabase, id)
  if (!project || project.owner_id !== userData.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await removeMember(supabase, id, userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
