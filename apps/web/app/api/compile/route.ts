import { NextResponse } from "next/server"
import type {
  CompileAsset,
  CompileRequest,
  WebCompileRequest,
} from "@workspace/compiler-client/types"
import { createAdminClient } from "@workspace/supabase/admin"
import {
  FILES_BUCKET,
  fileStorageKey,
  listProjectFiles,
} from "@workspace/supabase/files"
import { getProject } from "@workspace/supabase/projects"
import { createClient } from "@workspace/supabase/server"

export const maxDuration = 300

const SIGNED_URL_TTL_SECONDS = 600

/** Server-side compiler URL (not exposed to the browser). */
function compilerServiceUrl(): string {
  return (
    process.env.COMPILER_URL ??
    process.env.NEXT_PUBLIC_COMPILER_URL ??
    "http://127.0.0.1:3001"
  )
}

/**
 * Proxy LaTeX compilation to the compiler service: authenticate the user,
 * verify project access, resolve the project's binary files into short-lived
 * signed URLs the compiler downloads directly (bypassing this function's
 * body-size limits), and forward the bundle.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | (Partial<WebCompileRequest> & Partial<CompileRequest>)
    | null
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  let upstreamBody: CompileRequest

  if (body.projectId) {
    if (!Array.isArray(body.files) || typeof body.mainFile !== "string") {
      return NextResponse.json(
        { error: "Fields `files` and `mainFile` are required" },
        { status: 400 },
      )
    }
    const project = await getProject(supabase, body.projectId)
    if (!project) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let assets: CompileAsset[] = []
    const requested = Array.isArray(body.assets) ? body.assets : []
    if (requested.length > 0) {
      const rows = await listProjectFiles(supabase, project.id)
      const binaryIds = new Set(rows.filter((r) => r.is_binary).map((r) => r.id))
      const admin = createAdminClient()
      const keys: string[] = []
      const paths: string[] = []
      for (const asset of requested) {
        if (
          typeof asset?.id !== "string" ||
          typeof asset?.path !== "string" ||
          !binaryIds.has(asset.id)
        ) {
          continue // unknown ids: stale tree entries — let TeX report the missing file
        }
        keys.push(fileStorageKey(project.id, asset.id))
        paths.push(asset.path)
      }
      if (keys.length > 0) {
        const { data: signed, error } = await admin.storage
          .from(FILES_BUCKET)
          .createSignedUrls(keys, SIGNED_URL_TTL_SECONDS)
        if (error || !signed) {
          return NextResponse.json(
            { error: "Could not prepare project images" },
            { status: 500 },
          )
        }
        assets = signed.flatMap((entry, index) =>
          entry.signedUrl ? [{ path: paths[index]!, url: entry.signedUrl }] : [],
        )
      }
    }

    upstreamBody = {
      files: body.files,
      assets,
      mainFile: body.mainFile,
      engine: body.engine,
    }
  } else {
    // Legacy single-document shape from clients loaded before this deploy.
    upstreamBody = {
      latex: body.latex,
      bibtex: body.bibtex,
      engine: body.engine,
    }
  }

  const compilerApiKey = process.env.COMPILER_API_KEY
  let upstream: Response
  try {
    upstream = await fetch(`${compilerServiceUrl()}/api/compile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(compilerApiKey
          ? { Authorization: `Bearer ${compilerApiKey}` }
          : {}),
      },
      body: JSON.stringify(upstreamBody),
      signal: AbortSignal.timeout(290_000),
    })
  } catch {
    return NextResponse.json(
      {
        error: "Compiler service is temporarily unavailable",
      },
      { status: 502 }
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
