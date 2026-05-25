import { exec } from "node:child_process"
import { promisify } from "node:util"
import { defineEventHandler } from "h3"

const execAsync = promisify(exec)

export default defineEventHandler(async () => {
  let pdflatex = ""
  try {
    const { stdout } = await execAsync("pdflatex --version")
    pdflatex = stdout.split("\n", 1)[0] ?? ""
  } catch (err) {
    pdflatex = `unavailable: ${(err as Error).message}`
  }
  return { ok: true, pdflatex }
})
