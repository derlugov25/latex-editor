import {
  createError,
  defineEventHandler,
  getHeader,
  readBody,
  setHeader,
} from "h3"
import {
  normalizeProjectPath,
  pathExtension,
  projectPathError,
} from "@workspace/compiler-client/paths"
import type {
  CompileAsset,
  CompileFile,
  CompileRequest,
} from "@workspace/compiler-client/types"
import { AssetError, downloadAssets } from "../lib/assets"
import { isAuthorizedCompilerRequest } from "../lib/auth"
import { runLatex, type Engine } from "../lib/latex"
import { createWorkdir } from "../lib/workdir"

const MAX_SOURCE_BYTES = Number(
  process.env.COMPILER_MAX_SOURCE_BYTES ?? 2 * 1024 * 1024
)
const MAX_FILES = 300
const MAX_ASSETS = 150
const ALLOWED_ENGINES: ReadonlySet<Engine> = new Set([
  "pdflatex",
  "xelatex",
  "lualatex",
])

interface NormalizedRequest {
  files: CompileFile[]
  assets: CompileAsset[]
  mainFile: string
}

/** Accept both the multi-file shape and the legacy `{latex, bibtex}` one. */
function normalizeRequest(body: Partial<CompileRequest>): NormalizedRequest {
  if (Array.isArray(body.files) && body.files.length > 0) {
    if (typeof body.mainFile !== "string" || !body.mainFile) {
      throw createError({ statusCode: 400, message: "Field `mainFile` is required" })
    }
    return {
      files: body.files,
      assets: Array.isArray(body.assets) ? body.assets : [],
      mainFile: body.mainFile,
    }
  }

  if (typeof body.latex === "string" && body.latex) {
    const files: CompileFile[] = [{ path: "document.tex", content: body.latex }]
    if (typeof body.bibtex === "string" && body.bibtex) {
      files.push({ path: "references.bib", content: body.bibtex })
    }
    return { files, assets: [], mainFile: "document.tex" }
  }

  throw createError({
    statusCode: 400,
    message: "Provide `files` + `mainFile` (or legacy `latex`)",
  })
}

function validatePath(raw: unknown, kind: string): string {
  if (typeof raw !== "string") {
    throw createError({ statusCode: 400, message: `Every ${kind} needs a string path` })
  }
  const path = normalizeProjectPath(raw)
  const problem = projectPathError(path)
  if (problem) {
    throw createError({ statusCode: 400, message: `${kind} "${raw}": ${problem}` })
  }
  return path
}

export default defineEventHandler(async (event) => {
  if (!isAuthorizedCompilerRequest(getHeader(event, "authorization"))) {
    throw createError({ statusCode: 401, message: "Unauthorized" })
  }

  const body = (await readBody(event)) as Partial<CompileRequest> | undefined
  if (!body || typeof body !== "object") {
    throw createError({ statusCode: 400, message: "Invalid JSON body" })
  }

  const { files, assets, mainFile: rawMain } = normalizeRequest(body)
  if (files.length > MAX_FILES) {
    throw createError({ statusCode: 413, message: `More than ${MAX_FILES} files` })
  }
  if (assets.length > MAX_ASSETS) {
    throw createError({ statusCode: 413, message: `More than ${MAX_ASSETS} assets` })
  }

  const seenPaths = new Set<string>()
  let sourceBytes = 0
  const textFiles = files.map((file) => {
    if (typeof file.content !== "string") {
      throw createError({ statusCode: 400, message: "Every file needs string content" })
    }
    const path = validatePath(file.path, "file")
    if (seenPaths.has(path)) {
      throw createError({ statusCode: 400, message: `Duplicate path: ${path}` })
    }
    seenPaths.add(path)
    sourceBytes += Buffer.byteLength(file.content, "utf8")
    return { path, content: file.content }
  })
  if (sourceBytes > MAX_SOURCE_BYTES) {
    throw createError({
      statusCode: 413,
      message: `Source exceeds the ${MAX_SOURCE_BYTES}-byte limit`,
    })
  }

  const binaryAssets = assets.map((asset) => {
    const path = validatePath(asset.path, "asset")
    if (seenPaths.has(path)) {
      throw createError({ statusCode: 400, message: `Duplicate path: ${path}` })
    }
    seenPaths.add(path)
    if (typeof asset.url !== "string") {
      throw createError({ statusCode: 400, message: `Asset "${path}" needs a url` })
    }
    return { path, url: asset.url }
  })

  const mainFile = normalizeProjectPath(rawMain)
  if (!textFiles.some((f) => f.path === mainFile)) {
    throw createError({
      statusCode: 400,
      message: `mainFile "${rawMain}" is not among the submitted files`,
    })
  }

  const engine: Engine =
    body.engine && ALLOWED_ENGINES.has(body.engine) ? body.engine : "pdflatex"

  const hasBibtex = [...seenPaths].some((p) => pathExtension(p) === "bib")

  const workdir = await createWorkdir()
  try {
    await Promise.all(
      textFiles.map((file) => workdir.writeFile(file.path, file.content))
    )
    try {
      await downloadAssets(workdir, binaryAssets)
    } catch (err) {
      if (err instanceof AssetError) {
        throw createError({ statusCode: 422, data: { error: err.message } })
      }
      throw err
    }

    const outcome = await runLatex({
      engine,
      workdir: workdir.path,
      jobname: "document",
      mainFile,
      hasBibtex,
    })

    let pdf: Buffer
    try {
      pdf = await workdir.readFile("document.pdf")
    } catch {
      throw createError({
        statusCode: 422,
        data: {
          error: "LaTeX compilation failed: no PDF was produced",
          log: outcome.log,
        },
      })
    }

    setHeader(event, "Content-Type", "application/pdf")
    setHeader(event, "Content-Disposition", 'inline; filename="document.pdf"')
    return pdf
  } finally {
    await workdir.cleanup()
  }
})
