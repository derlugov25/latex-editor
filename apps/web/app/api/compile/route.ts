import { NextResponse } from "next/server"
import { createClient } from "@workspace/supabase/server"

/** Server-side compiler URL (not exposed to the browser). */
function compilerServiceUrl(): string {
  return (
    process.env.COMPILER_URL ??
    process.env.NEXT_PUBLIC_COMPILER_URL ??
    "http://127.0.0.1:3001"
  )
}

/**
 * Proxy LaTeX compilation to the Nitro compiler service on the same origin.
 * Avoids cross-origin fetch issues (e.g. Cursor's embedded browser blocking :3001).
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.text()
  let upstream: Response
  try {
    upstream = await fetch(`${compilerServiceUrl()}/api/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: "Compiler service is temporarily unavailable",
      },
      { status: 502 },
    )
  }

  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream"
  const data = await upstream.arrayBuffer()

  return new NextResponse(data, {
    status: upstream.status,
    headers: { "Content-Type": contentType },
  })
}
