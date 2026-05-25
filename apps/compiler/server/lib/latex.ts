import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)
const MAX_BUFFER = 10 * 1024 * 1024 // 10 MB stdout cap

export type Engine = "pdflatex" | "xelatex" | "lualatex"

export interface CompileOptions {
  engine: Engine
  workdir: string
  jobname: string
  hasBibtex: boolean
}

export interface CompileOutcome {
  ok: boolean
  log: string
}

/**
 * Run LaTeX twice (+bibtex pass when references are present) inside `workdir`.
 * Never throws on compiler errors — returns `ok: false` with the captured log.
 */
export async function runLatex(opts: CompileOptions): Promise<CompileOutcome> {
  const { engine, workdir, jobname, hasBibtex } = opts
  const latex = `${engine} -interaction=nonstopmode -halt-on-error -jobname="${jobname}" "${jobname}.tex"`
  const bib = `bibtex "${jobname}"`

  let log = ""
  log += await runOnce(latex, workdir)
  if (hasBibtex) {
    log += await runOnce(bib, workdir)
    log += await runOnce(latex, workdir)
  }
  log += await runOnce(latex, workdir)

  return { ok: log.indexOf("\n!") === -1 || log.includes("Output written"), log }
}

async function runOnce(cmd: string, cwd: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd, maxBuffer: MAX_BUFFER })
    return `$ ${cmd}\n${stdout}\n${stderr}\n`
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string }
    return `$ ${cmd}\n${e.stdout ?? ""}\n${e.stderr ?? ""}\n${e.message}\n`
  }
}
