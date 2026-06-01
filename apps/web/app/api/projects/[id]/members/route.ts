import { NextResponse } from "next/server"
import { createClient } from "@workspace/supabase/server"
import { createAdminClient } from "@workspace/supabase/admin"
import { listMembers, addMember } from "@workspace/supabase/members"
import { getProject } from "@workspace/supabase/projects"

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
    const members = await listMembers(supabase, id)
    const project = await getProject(supabase, id)
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const admin = createAdminClient()
    const enriched = await Promise.all(
      members.map(async (m) => {
        const { data } = await admin.auth.admin.getUserById(m.user_id)
        return {
          ...m,
          email: data.user?.email ?? "unknown",
          name: (data.user?.user_metadata?.name as string) ?? data.user?.email ?? "unknown",
        }
      }),
    )

    return NextResponse.json({
      owner_id: project.owner_id,
      members: enriched,
    })
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

  const body = (await request.json().catch(() => null)) as {
    email?: string
    role?: "editor" | "viewer"
  } | null
  if (!body?.email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  const project = await getProject(supabase, id)
  if (!project || project.owner_id !== userData.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const admin = createAdminClient()
    const { data: users } = await admin.auth.admin.listUsers()
    const target = users.users.find(
      (u) => u.email?.toLowerCase() === body.email!.toLowerCase(),
    )
    if (!target) {
      return NextResponse.json(
        { error: "User with this email not found" },
        { status: 404 },
      )
    }

    if (target.id === userData.user.id) {
      return NextResponse.json(
        { error: "Cannot add yourself" },
        { status: 400 },
      )
    }

    const member = await addMember(supabase, id, target.id, body.role ?? "editor")
    return NextResponse.json(member, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
