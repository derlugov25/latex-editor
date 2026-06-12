import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const MAX_BUFFER = 10 * 1024 * 1024 // 10 MB stdout cap
const PASS_TIMEOUT_MS = Number(process.env.COMPILER_PASS_TIMEOUT_MS ?? 60_000)
// latexmk runs every needed pass (engine reruns, bibtex/biber) in one go.
const RUN_TIMEOUT_MS = Number(process.env.COMPILER_RUN_TIMEOUT_MS ?? 180_000)

export type Engine = "pdflatex" | "xelatex" | "lualatex"

const LATEXMK_ENGINE_FLAG: Record<Engine, string> = {
  pdflatex: "-pdf",
  xelatex: "-pdfxe",
  lualatex: "-pdflua",
}

export interface CompileOptions {
  engine: Engine
  workdir: string
  jobname: string
  /** Project-relative path of the root document, e.g. "main.tex". */
  mainFile: string
  /** Whether any .bib file is present (drives the no-latexmk fallback only). */
  hasBibtex: boolean
}

export interface CompileOutcome {
  ok: boolean
  log: string
}

interface PassResult {
  log: string
  /** Set when the binary itself could not be spawned (e.g. ENOENT). */
  spawnError?: string
}

/**
 * Compile the project with latexmk, which reruns the engine and bib tooling
 * until references settle. Falls back to fixed engine/bibtex passes on
 * machines without latexmk (e.g. minimal local TeX installs).
 * Never throws on compiler errors — returns `ok: false` with the captured log.
 */
export async function runLatex(opts: CompileOptions): Promise<CompileOutcome> {
  const { engine, workdir, jobname, mainFile, hasBibtex } = opts

  const latexmk = await runOnce(
    "latexmk",
    [
      LATEXMK_ENGINE_FLAG[engine],
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-no-shell-escape",
      "-file-line-error",
      `-jobname=${jobname}`,
      mainFile,
    ],
    workdir,
    RUN_TIMEOUT_MS
  )
  if (!latexmk.spawnError) {
    return { ok: outcomeOk(latexmk.log), log: latexmk.log }
  }

  const latexArgs = [
    "-interaction=nonstopmode",
    "-halt-on-error",
    "-no-shell-escape",
    "-file-line-error",
    `-jobname=${jobname}`,
    mainFile,
  ]

  let log = `latexmk unavailable (${latexmk.spawnError}), using fixed passes\n`
  log += (await runOnce(engine, latexArgs, workdir, PASS_TIMEOUT_MS)).log
  if (hasBibtex) {
    log += (await runOnce("bibtex", [jobname], workdir, PASS_TIMEOUT_MS)).log
    log += (await runOnce(engine, latexArgs, workdir, PASS_TIMEOUT_MS)).log
  }
  log += (await runOnce(engine, latexArgs, workdir, PASS_TIMEOUT_MS)).log

  return { ok: outcomeOk(log), log }
}

function outcomeOk(log: string): boolean {
  return log.indexOf("\n!") === -1 || log.includes("Output written")
}

async function runOnce(
  command: string,
  args: string[],
  cwd: string,
  timeout: number
): Promise<PassResult> {
  const displayCommand = [command, ...args].join(" ")
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      maxBuffer: MAX_BUFFER,
      timeout,
      killSignal: "SIGKILL",
      env: {
        ...process.env,
        openin_any: "p",
        openout_any: "p",
        shell_escape: "f",
      },
    })
    return { log: `$ ${displayCommand}\n${stdout}\n${stderr}\n` }
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string }
    if (e.code === "ENOENT") {
      return { log: "", spawnError: `${command}: not found` }
    }
    return {
      log: `$ ${displayCommand}\n${e.stdout ?? ""}\n${e.stderr ?? ""}\n${e.message}\n`,
    }
  }
}
