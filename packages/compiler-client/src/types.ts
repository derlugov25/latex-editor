/** One text source file in a compile request. */
export interface CompileFile {
  /** Project-relative path, e.g. "main.tex" or "sections/intro.tex". */
  path: string
  content: string
}

/** One binary asset the compiler should download into the work tree. */
export interface CompileAsset {
  /** Project-relative path, e.g. "figures/plot.png". */
  path: string
  /** Short-lived signed URL the compiler fetches the bytes from. */
  url: string
}

/** Request body posted to the compiler service. */
export interface CompileRequest {
  /** Text source files. Must contain `mainFile`. */
  files?: CompileFile[]
  /** Binary assets to download before compiling. */
  assets?: CompileAsset[]
  /** Path of the root document inside `files`. */
  mainFile?: string
  /** Engine to use. `pdflatex` is the default. */
  engine?: "pdflatex" | "xelatex" | "lualatex"

  /** @deprecated Legacy single-document shape: main .tex source. */
  latex?: string
  /** @deprecated Legacy single-document shape: bundled as `references.bib`. */
  bibtex?: string
}

/**
 * Request the web app's /api/compile proxy accepts from the browser.
 * Clients name the binary files (by id, from the live collaborative tree);
 * the proxy verifies each id belongs to the project and resolves it into a
 * signed URL itself — clients never supply URLs.
 */
export interface WebCompileRequest {
  projectId: string
  files: CompileFile[]
  /** Binary files of the project to place into the compile tree. */
  assets?: Array<{ id: string; path: string }>
  mainFile: string
  engine?: CompileRequest["engine"]
}

/** JSON error returned by the compiler service when compilation fails. */
export interface CompileError {
  error: string
  log?: string
}

export type CompileEngine = NonNullable<CompileRequest["engine"]>
export const COMPILE_ENGINES: readonly CompileEngine[] = [
  "pdflatex",
  "xelatex",
  "lualatex",
]
