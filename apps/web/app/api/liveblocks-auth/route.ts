import { Liveblocks } from "@liveblocks/node"
import { NextResponse } from "next/server"
import { liveblocksSecret } from "@/lib/env"
import { createClient } from "@workspace/supabase/server"
import { presenceColor } from "@workspace/collab"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { room } = (await request.json().catch(() => ({}))) as { room?: string }
  if (!room || !room.startsWith("project:")) {
    return new NextResponse("Bad room id", { status: 400 })
  }

  const projectId = room.slice("project:".length)
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle()

  if (!project) return new NextResponse("Forbidden", { status: 403 })

  const liveblocks = new Liveblocks({ secret: liveblocksSecret() })
  const session = liveblocks.prepareSession(data.user.id, {
    userInfo: {
      name:
        (data.user.user_metadata?.name as string | undefined) ??
        data.user.email ??
        "Anonymous",
      color: presenceColor(data.user.id),
    },
  })

  session.allow(room, session.FULL_ACCESS)
  const { body, status } = await session.authorize()
  return new NextResponse(body, { status })
}
