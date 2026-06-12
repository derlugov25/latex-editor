import type { CompileError, CompileRequest, WebCompileRequest } from "./types"

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
  request: CompileRequest | WebCompileRequest,
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
      const parsed = (await response.json()) as {
        error?: unknown
        message?: unknown
        log?: unknown
        // Nitro wraps createError({data}) as {error: true, message, data: {...}}.
        data?: { error?: unknown; log?: unknown }
      }
      const error =
        (typeof parsed.error === "string" && parsed.error) ||
        (typeof parsed.data?.error === "string" && parsed.data.error) ||
        (typeof parsed.message === "string" && parsed.message) ||
        `HTTP ${response.status}`
      const log =
        (typeof parsed.log === "string" && parsed.log) ||
        (typeof parsed.data?.log === "string" && parsed.data.log) ||
        undefined
      return { error, log }
    } catch {
      // fall through
    }
  }
  return { error: (await response.text()) || `HTTP ${response.status}` }
}
