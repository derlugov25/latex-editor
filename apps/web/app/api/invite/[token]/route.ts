import { NextResponse } from "next/server"
import { createClient } from "@workspace/supabase/server"
import { createAdminClient } from "@workspace/supabase/admin"
import { acceptInvite, getInvite } from "@workspace/supabase/members"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const invite = await getInvite(supabase, token)
    if (!invite) {
      return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: project } = await admin
      .from("projects")
      .select("name")
      .eq("id", invite.project_id)
      .maybeSingle()

    return NextResponse.json({
      project_name: project?.name ?? "Unknown project",
      role: invite.role,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const { projectId } = await acceptInvite(admin, token, userData.user.id)
    return NextResponse.json({ projectId })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
