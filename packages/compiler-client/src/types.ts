/** Request body posted to the compiler service. */
export interface CompileRequest {
  /** Main .tex source. */
  latex: string
  /** Optional .bib content to bundle as `references.bib`. */
  bibtex?: string
  /** Engine to use. `pdflatex` is the default. */
  engine?: "pdflatex" | "xelatex" | "lualatex"
}

/** JSON error returned by the compiler service when compilation fails. */
export interface CompileError {
  error: string
  log?: string
}

export type CompileEngine = NonNullable<CompileRequest["engine"]>
