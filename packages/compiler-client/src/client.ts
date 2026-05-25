import type { CompileError, CompileRequest } from "./types"

export interface CompileResult {
  /** Object URL pointing to the produced PDF blob. Caller must revoke it. */
  pdfUrl: string
  blob: Blob
}

export class CompileFailure extends Error {
  readonly log?: string
  constructor(message: string, log?: string) {
    super(message)
    this.name = "CompileFailure"
    this.log = log
  }
}

export interface CompileClientOptions {
  baseUrl: string
  /** Forwarded to `fetch` as-is (use for AbortController/credentials). */
  init?: Omit<RequestInit, "method" | "body" | "headers">
}

/**
 * POST source to the compiler service and return a blob URL for the PDF.
 * Throws `CompileFailure` with the log on non-2xx responses.
 */
export async function compileLatex(
  request: CompileRequest,
  options: CompileClientOptions,
): Promise<CompileResult> {
  const response = await fetch(`${options.baseUrl}/api/compile`, {
    ...options.init,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const message = await extractError(response)
    throw new CompileFailure(message.error, message.log)
  }

  const blob = await response.blob()
  return { blob, pdfUrl: URL.createObjectURL(blob) }
}

async function extractError(response: Response): Promise<CompileError> {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    try {
      return (await response.json()) as CompileError
    } catch {
      // fall through
    }
  }
  return { error: (await response.text()) || `HTTP ${response.status}` }
}
