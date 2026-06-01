import { NextResponse } from "next/server"
import { createClient } from "@workspace/supabase/server"
import { getProject, updateProject } from "@workspace/supabase/projects"

interface Body {
  latex_content?: string
  bibtex_content?: string
}

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

  try {
    const updated = await updateProject(supabase, id, {
      latex_content: body.latex_content,
      bibtex_content: body.bibtex_content,
    })
    return NextResponse.json({ updated_at: updated.updated_at })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    )
  }
}
