import {
  createError,
  defineEventHandler,
  getHeader,
  readBody,
  setHeader,
} from "h3"
import type { CompileRequest } from "@workspace/compiler-client/types"
import { isAuthorizedCompilerRequest } from "../lib/auth"
import { runLatex, type Engine } from "../lib/latex"
import { createWorkdir } from "../lib/workdir"

const MAX_SOURCE_BYTES = Number(
  process.env.COMPILER_MAX_SOURCE_BYTES ?? 2 * 1024 * 1024
)
const ALLOWED_ENGINES: ReadonlySet<Engine> = new Set([
  "pdflatex",
  "xelatex",
  "lualatex",
])

export default defineEventHandler(async (event) => {
  if (!isAuthorizedCompilerRequest(getHeader(event, "authorization"))) {
    throw createError({ statusCode: 401, message: "Unauthorized" })
  }

  const body = (await readBody(event)) as Partial<CompileRequest> | undefined
  const latex = body?.latex

  if (!latex || typeof latex !== "string") {
    throw createError({ statusCode: 400, message: "Field `latex` is required" })
  }

  const sourceBytes =
    Buffer.byteLength(latex, "utf8") +
    Buffer.byteLength(body?.bibtex ?? "", "utf8")
  if (sourceBytes > MAX_SOURCE_BYTES) {
    throw createError({
      statusCode: 413,
      message: `Source exceeds the ${MAX_SOURCE_BYTES}-byte limit`,
    })
  }

  const engine: Engine =
    body?.engine && ALLOWED_ENGINES.has(body.engine) ? body.engine : "pdflatex"

  const workdir = await createWorkdir()
  try {
    await workdir.writeFile("document.tex", latex)
    if (body?.bibtex) {
      await workdir.writeFile("references.bib", body.bibtex)
    }

    const outcome = await runLatex({
      engine,
      workdir: workdir.path,
      jobname: "document",
      hasBibtex: Boolean(body?.bibtex),
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
