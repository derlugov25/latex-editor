import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { createError, defineEventHandler } from "h3"

const execFileAsync = promisify(execFile)
const ENGINES = ["pdflatex", "xelatex", "lualatex"] as const

export default defineEventHandler(async () => {
  const results = await Promise.all(
    ENGINES.map(async (engine) => {
      try {
        const { stdout } = await execFileAsync(engine, ["--version"], {
          timeout: 5_000,
        })
        return {
          engine,
          available: true,
          version: stdout.split("\n", 1)[0] ?? "",
        }
      } catch {
        return { engine, available: false, version: "" }
      }
    })
  )
  const engines = Object.fromEntries(
    results.map(({ engine, ...result }) => [engine, result])
  )

  if (results.some(({ available }) => !available)) {
    throw createError({
      statusCode: 503,
      statusMessage: "One or more TeX engines are unavailable",
      data: { engines },
    })
  }

  return { ok: true, engines }
})
