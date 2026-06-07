import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const MAX_BUFFER = 10 * 1024 * 1024 // 10 MB stdout cap
const PASS_TIMEOUT_MS = Number(process.env.COMPILER_PASS_TIMEOUT_MS ?? 60_000)

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
  const latexArgs = [
    "-interaction=nonstopmode",
    "-halt-on-error",
    "-no-shell-escape",
    `-jobname=${jobname}`,
    `${jobname}.tex`,
  ]

  let log = ""
  log += await runOnce(engine, latexArgs, workdir)
  if (hasBibtex) {
    log += await runOnce("bibtex", [jobname], workdir)
    log += await runOnce(engine, latexArgs, workdir)
  }
  log += await runOnce(engine, latexArgs, workdir)

  return {
    ok: log.indexOf("\n!") === -1 || log.includes("Output written"),
    log,
  }
}

async function runOnce(
  command: string,
  args: string[],
  cwd: string
): Promise<string> {
  const displayCommand = [command, ...args].join(" ")
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      maxBuffer: MAX_BUFFER,
      timeout: PASS_TIMEOUT_MS,
      killSignal: "SIGKILL",
      env: {
        ...process.env,
        openin_any: "p",
        openout_any: "p",
        shell_escape: "f",
      },
    })
    return `$ ${displayCommand}\n${stdout}\n${stderr}\n`
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string }
    return `$ ${displayCommand}\n${e.stdout ?? ""}\n${e.stderr ?? ""}\n${e.message}\n`
  }
}
