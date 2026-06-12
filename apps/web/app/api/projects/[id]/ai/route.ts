import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import {
  normalizeProjectPath,
  projectPathError,
} from "@workspace/compiler-client/paths"
import { createAdminClient } from "@workspace/supabase/admin"
import { getProject } from "@workspace/supabase/projects"
import { createClient } from "@workspace/supabase/server"
import type {
  AiFileAction,
  AiRequestBody,
  AiStreamEvent,
} from "@/lib/ai-events"

export const maxDuration = 300

const MODEL = "claude-opus-4-8"
/** Shared API key, so each user gets a daily request allowance. */
const DAILY_LIMIT = 30
const MAX_MODEL_TURNS = 16
const MAX_OUTPUT_TOKENS = 32_000
/** Stop starting new model turns this close to Vercel's maxDuration kill. */
const TIME_BUDGET_MS = 240_000

const MAX_FILES = 300
/** Per-file context budget; larger files are shown truncated and locked. */
const MAX_FILE_CHARS = 48_000
/** Whole-project context budget. */
const MAX_TOTAL_CHARS = 256_000
const MAX_HISTORY_MESSAGES = 24
const MAX_MESSAGE_CHARS = 8_000
const MAX_WRITE_CHARS = 200_000

interface StoredFile {
  content: string
  binary: boolean
  /** Truncated in model context — editing it would destroy the hidden tail. */
  truncated: boolean
}

/** Project state the tools operate on: normalized path -> file. */
type FileStore = Map<string, StoredFile>

/**
 * Tool calls ride inside the model's text as ```tool fenced JSON blocks
 * instead of native Anthropic tool_use. The configured upstream
 * (ANTHROPIC_BASE_URL proxy) translates requests through an OpenAI-compatible
 * layer and silently drops native tool-call blocks from responses, so a text
 * protocol is the only shape that survives the round trip. It also works
 * against the official API.
 */
const KNOWN_TOOLS = new Set(["edit_file", "write_file", "delete_file"])

const SYSTEM_PROMPT = `You are the AI assistant built into a collaborative LaTeX editor (similar to Overleaf). You help users write, fix and restructure their LaTeX projects.

The full project is provided below. You can modify any file in the project — not just the one the user has open.

To modify files, output tool calls as fenced code blocks with the language tag "tool", one JSON object per block:

\`\`\`tool
{"tool": "edit_file", "path": "main.tex", "old_string": "exact existing text", "new_string": "replacement text", "replace_all": false}
\`\`\`

\`\`\`tool
{"tool": "write_file", "path": "chapters/new.tex", "content": "full file content"}
\`\`\`

\`\`\`tool
{"tool": "delete_file", "path": "old.tex"}
\`\`\`

Tool rules:
- edit_file replaces an exact string: old_string must match the file content exactly (including whitespace and line breaks) and occur exactly once, unless "replace_all": true. Prefer it for targeted edits. old_string must never be empty.
- To insert text into an existing file, use edit_file with an existing anchor line as old_string and repeat it in new_string. Example — adding a line before \\end{document}: {"tool": "edit_file", "path": "main.tex", "old_string": "\\\\end{document}", "new_string": "\\\\input{chapters/conclusion}\\n\\\\end{document}"}
- write_file creates a new file or completely overwrites an existing one. Use it for new files or full rewrites.
- delete_file removes a file — only when the user explicitly asked for that.
- The block content must be valid JSON: escape backslashes (LaTeX \\section is written as \\\\section) and newlines (\\n).
- After your last tool block, stop your response. Each call is executed immediately and you receive a "[tool results]" message listing OK/FAILED per call; then you can continue, fix failures, or summarize.
- Never write a "[tool results]" message yourself — the editor inserts it. Do not predict or restate results before receiving them.
- Never repeat a tool call that already succeeded, and do not rewrite a file that already has the desired content.
- Never use the "tool" language tag for anything else; use ordinary fenced blocks for LaTeX examples you show in chat.

General rules:
- Make the minimal change that fulfils the request; never reformat code you were not asked to touch.
- Keep the project compiling: balance braces and environments, and add the required \\usepackage when you introduce commands that need one.
- Files marked [binary] or [truncated] cannot be edited.
- When creating files use forward-slash relative paths like "chapters/intro.tex".
- After making changes, finish with a brief summary of what you changed and why. Do not paste whole files into the reply — the user sees the changes in the editor.
- Answer questions about the project directly; not every request needs an edit.
- Respond in the language the user writes in.`

interface ToolOutcome {
  ok: boolean
  message: string
  action?: AiFileAction
  /** Path for action_error reporting (set when ok is false and a path parsed). */
  path?: string
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0
  return haystack.split(needle).length - 1
}

function resolvePath(
  store: FileStore,
  rawPath: unknown
): {
  path?: string
  error?: string
} {
  const raw = asString(rawPath)
  if (!raw) return { error: "path must be a string" }
  const path = normalizeProjectPath(raw)
  const problem = projectPathError(path)
  if (problem) return { error: `${raw}: ${problem}` }
  void store
  return { path }
}

function executeTool(
  store: FileStore,
  name: string,
  input: unknown
): ToolOutcome {
  const params = (input ?? {}) as Record<string, unknown>
  const { path, error } = resolvePath(store, params.path)
  if (!path) return { ok: false, message: error ?? "Invalid path" }

  if (name === "edit_file") {
    const oldString = asString(params.old_string)
    const newString = asString(params.new_string)
    const replaceAll = params.replace_all === true
    if (oldString === null || newString === null) {
      return {
        ok: false,
        message: "old_string and new_string must be strings",
        path,
      }
    }
    if (oldString.length === 0) {
      return { ok: false, message: "old_string must not be empty", path }
    }
    const file = store.get(path)
    if (!file) return { ok: false, message: `File not found: ${path}`, path }
    if (file.binary) {
      return {
        ok: false,
        message: `${path} is a binary file and cannot be edited`,
        path,
      }
    }
    if (file.truncated) {
      return {
        ok: false,
        message: `${path} was truncated in your context; editing it could destroy content you cannot see. Ask the user to split the file or edit it manually.`,
        path,
      }
    }
    const occurrences = countOccurrences(file.content, oldString)
    if (occurrences === 0) {
      return { ok: false, message: `old_string not found in ${path}`, path }
    }
    if (occurrences > 1 && !replaceAll) {
      return {
        ok: false,
        message: `old_string occurs ${occurrences} times in ${path}; provide a longer unique string or set replace_all`,
        path,
      }
    }
    const content = replaceAll
      ? file.content.split(oldString).join(newString)
      : file.content.replace(oldString, newString)
    store.set(path, { ...file, content })
    return {
      ok: true,
      message: `Edited ${path}`,
      action: {
        kind: "edit",
        path,
        content,
        edit: { old: oldString, new: newString, all: replaceAll },
      },
    }
  }

  if (name === "write_file") {
    const content = asString(params.content)
    if (content === null) {
      return { ok: false, message: "content must be a string", path }
    }
    if (content.length > MAX_WRITE_CHARS) {
      return {
        ok: false,
        message: `content exceeds ${MAX_WRITE_CHARS} characters`,
        path,
      }
    }
    const existing = store.get(path)
    if (existing?.binary) {
      return {
        ok: false,
        message: `${path} is a binary file and cannot be overwritten`,
        path,
      }
    }
    store.set(path, { content, binary: false, truncated: false })
    return {
      ok: true,
      message: existing ? `Overwrote ${path}` : `Created ${path}`,
      action: { kind: "write", path, content, created: !existing },
    }
  }

  if (name === "delete_file") {
    if (!store.has(path)) {
      return { ok: false, message: `File not found: ${path}`, path }
    }
    store.delete(path)
    return {
      ok: true,
      message: `Deleted ${path}`,
      action: { kind: "delete", path },
    }
  }

  return { ok: false, message: `Unknown tool: ${name}` }
}

/** A parsed (but not yet validated) tool call from a fenced block. */
type ParsedToolCall =
  | { name: string; input: Record<string, unknown> }
  | { parseError: string }

function parseToolCall(body: string): ParsedToolCall {
  let raw: unknown
  try {
    raw = JSON.parse(body)
  } catch {
    return {
      parseError: "block is not valid JSON (check \\\\ and \\n escaping)",
    }
  }
  if (!raw || typeof raw !== "object") {
    return { parseError: "block must be a JSON object" }
  }
  const obj = raw as Record<string, unknown>
  const name = asString(obj.tool) ?? asString(obj.name)
  if (!name) return { parseError: 'missing "tool" field' }
  // Accept both flat params and a nested arguments/args/input object.
  const nested = obj.arguments ?? obj.args ?? obj.input
  const input =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : obj
  return { name, input }
}

/** Does a fenced block look like a tool call (vs. an ordinary code example)? */
function isToolBlock(lang: string, body: string): boolean {
  if (lang === "tool") return true
  if (lang === "json" || lang === "") {
    const parsed = parseToolCall(body)
    return "name" in parsed && KNOWN_TOOLS.has(parsed.name)
  }
  return false
}

/**
 * Incremental filter over the model's text stream: passes prose through to
 * the client as it arrives, holds back fenced blocks, and collects the ones
 * that are tool calls (ordinary code fences are re-emitted verbatim once
 * complete). Line-oriented; only lines that may open a fence are held.
 */
class ToolStreamParser {
  readonly toolBlocks: string[] = []
  private partial = ""
  private emittedOfPartial = 0
  private mode: "text" | "fence" = "text"
  private fenceLang = ""
  private fenceOpenLine = ""
  private fenceLines: string[] = []

  constructor(private readonly emitText: (text: string) => void) {}

  feed(delta: string): void {
    this.partial += delta
    for (;;) {
      const newline = this.partial.indexOf("\n")
      if (newline === -1) break
      const line = this.partial.slice(0, newline)
      this.partial = this.partial.slice(newline + 1)
      const alreadySent = this.emittedOfPartial
      this.emittedOfPartial = 0
      this.handleLine(line, alreadySent)
    }
    // Stream the incomplete line eagerly unless it could still open a fence.
    if (this.mode === "text" && this.partial.length > this.emittedOfPartial) {
      const candidate = this.partial.trimStart()
      if (candidate.length > 0 && !candidate.startsWith("`")) {
        this.emitText(this.partial.slice(this.emittedOfPartial))
        this.emittedOfPartial = this.partial.length
      }
    }
  }

  /** Flush at end of message; an unterminated tool fence still counts. */
  end(): void {
    if (this.mode === "fence") {
      const lines = this.partial
        ? [...this.fenceLines, this.partial]
        : this.fenceLines
      const body = lines.join("\n")
      if (isToolBlock(this.fenceLang, body)) this.toolBlocks.push(body)
      else this.emitText(`${this.fenceOpenLine}\n${body}\n`)
    } else if (this.partial.length > this.emittedOfPartial) {
      this.emitText(this.partial.slice(this.emittedOfPartial))
    }
    this.partial = ""
    this.emittedOfPartial = 0
    this.mode = "text"
  }

  private handleLine(line: string, alreadySent: number): void {
    const trimmed = line.trim()
    if (this.mode === "text") {
      if (trimmed.startsWith("```")) {
        this.mode = "fence"
        this.fenceLang = trimmed.slice(3).trim().toLowerCase()
        this.fenceOpenLine = line
        this.fenceLines = []
      } else {
        this.emitText(line.slice(alreadySent) + "\n")
      }
    } else if (trimmed === "```") {
      const body = this.fenceLines.join("\n")
      if (isToolBlock(this.fenceLang, body)) {
        this.toolBlocks.push(body)
      } else {
        this.emitText(`${this.fenceOpenLine}\n${body}\n${line}\n`)
      }
      this.mode = "text"
    } else {
      this.fenceLines.push(line)
    }
  }
}

/** Render the project tree + file contents for the system prompt. */
function renderProject(
  store: FileStore,
  mainFile: string | null,
  activeFile: string | null
): string {
  const paths = [...store.keys()].sort((a, b) => a.localeCompare(b))
  const lines: string[] = ["<project>", "<file_tree>"]
  for (const path of paths) {
    const file = store.get(path)!
    const tags = [
      file.binary ? " [binary]" : "",
      file.truncated ? " [truncated]" : "",
      path === mainFile ? " [main]" : "",
      path === activeFile ? " [open in editor]" : "",
    ].join("")
    lines.push(`${path}${tags}`)
  }
  lines.push("</file_tree>")
  for (const path of paths) {
    const file = store.get(path)!
    if (file.binary) continue
    const suffix = file.truncated ? "\n... [truncated — file too large]" : ""
    lines.push(`<file path="${path}">\n${file.content}${suffix}\n</file>`)
  }
  lines.push("</project>")
  return lines.join("\n")
}

function parseBody(raw: unknown): AiRequestBody | null {
  if (!raw || typeof raw !== "object") return null
  const body = raw as Record<string, unknown>
  if (!Array.isArray(body.messages) || body.messages.length === 0) return null
  if (!Array.isArray(body.files)) return null
  if (body.messages.length > MAX_HISTORY_MESSAGES + 1) {
    body.messages = body.messages.slice(-(MAX_HISTORY_MESSAGES + 1))
  }
  const messages = (body.messages as unknown[]).flatMap(
    (entry): AiRequestBody["messages"] => {
      const m = (entry ?? {}) as Record<string, unknown>
      const role = m.role === "user" || m.role === "assistant" ? m.role : null
      const text = asString(m.text)?.slice(0, MAX_MESSAGE_CHARS)
      return role && text ? [{ role, text }] : []
    }
  )
  // The conversation must start with a user turn and end with the new request.
  while (messages.length > 0 && messages[0]!.role !== "user") messages.shift()
  if (messages.length === 0 || messages[messages.length - 1]!.role !== "user") {
    return null
  }
  return {
    messages,
    files: body.files as AiRequestBody["files"],
    mainFile: asString(body.mainFile) ?? undefined,
    activeFile: asString(body.activeFile) ?? undefined,
  }
}

/** Build the in-memory store from the client snapshot, applying size caps. */
function buildStore(
  files: AiRequestBody["files"]
): FileStore | { error: string } {
  if (files.length > MAX_FILES) return { error: "Too many files" }
  const store: FileStore = new Map()
  let budget = MAX_TOTAL_CHARS
  for (const entry of files) {
    if (!entry || typeof entry !== "object") continue
    const raw = asString(entry.path)
    if (!raw) continue
    const path = normalizeProjectPath(raw)
    if (projectPathError(path)) continue
    if (entry.binary === true) {
      store.set(path, { content: "", binary: true, truncated: false })
      continue
    }
    const content = asString(entry.content) ?? ""
    const cap = Math.min(MAX_FILE_CHARS, Math.max(budget, 0))
    const truncated = content.length > cap
    const kept = truncated ? content.slice(0, cap) : content
    budget -= kept.length
    store.set(path, { content: kept, binary: false, truncated })
  }
  if (store.size === 0) return { error: "Project has no files" }
  return store
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const project = await getProject(supabase, id)
  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI assistant is not configured (missing ANTHROPIC_API_KEY)" },
      { status: 503 }
    )
  }

  const body = parseBody(await request.json().catch(() => null))
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  const store = buildStore(body.files)
  if ("error" in store) {
    return NextResponse.json({ error: store.error }, { status: 400 })
  }

  // Shared API key -> per-user daily allowance, counted atomically in Postgres.
  const admin = createAdminClient()
  const { data: usage, error: usageError } = await admin.rpc(
    "consume_ai_request",
    { p_user_id: user.id, p_limit: DAILY_LIMIT }
  )
  if (usageError) {
    return NextResponse.json(
      { error: "Rate limiter unavailable" },
      { status: 500 }
    )
  }
  const quota = usage?.[0]
  if (!quota?.allowed) {
    return NextResponse.json(
      {
        error: `Daily AI limit reached (${DAILY_LIMIT} requests). Try again tomorrow.`,
        used: quota?.used ?? DAILY_LIMIT,
        limit: DAILY_LIMIT,
      },
      { status: 429 }
    )
  }

  const anthropic = new Anthropic()
  const mainFile = body.mainFile ? normalizeProjectPath(body.mainFile) : null
  const activeFile = body.activeFile
    ? normalizeProjectPath(body.activeFile)
    : null

  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: SYSTEM_PROMPT },
    {
      type: "text",
      text: renderProject(store, mainFile, activeFile),
      // Stable across the tool-use loop within this request.
      cache_control: { type: "ephemeral" },
    },
  ]
  const messages: Anthropic.MessageParam[] = body.messages.map((m) => ({
    role: m.role,
    content: m.text,
  }))

  const encoder = new TextEncoder()
  const streamBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const send = (event: AiStreamEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
        } catch {
          closed = true
        }
      }

      let producedOutput = false
      const startedAt = Date.now()
      try {
        for (let turn = 0; turn < MAX_MODEL_TURNS; turn++) {
          if (turn > 0 && Date.now() - startedAt > TIME_BUDGET_MS) {
            send({
              type: "error",
              message:
                "Stopped early: the request ran out of time. Changes made so far are applied; ask to continue if needed.",
            })
            break
          }
          const parser = new ToolStreamParser((text) => {
            producedOutput = true
            send({ type: "text", text })
          })
          const stream = anthropic.messages.stream(
            {
              model: MODEL,
              max_tokens: MAX_OUTPUT_TOKENS,
              thinking: { type: "adaptive" },
              system,
              messages,
            },
            { signal: request.signal }
          )
          stream.on("text", (delta) => parser.feed(delta))
          const message = await stream.finalMessage()
          parser.end()
          messages.push({ role: "assistant", content: message.content })

          if (parser.toolBlocks.length === 0) {
            // Proxies may leak OpenAI-style stop reasons ("length").
            if (
              message.stop_reason === "max_tokens" ||
              (message.stop_reason as string) === "length"
            ) {
              send({
                type: "error",
                message: "Response hit the output limit and may be incomplete.",
              })
            }
            break
          }

          const resultLines: string[] = []
          for (const block of parser.toolBlocks) {
            producedOutput = true
            const call = parseToolCall(block)
            if ("parseError" in call) {
              send({ type: "action_error", path: "", message: call.parseError })
              resultLines.push(`- tool call: FAILED — ${call.parseError}`)
              continue
            }
            const outcome = executeTool(store, call.name, call.input)
            if (outcome.ok && outcome.action) {
              send({ type: "action", action: outcome.action })
            } else if (!outcome.ok) {
              send({
                type: "action_error",
                path: outcome.path ?? "",
                message: outcome.message,
              })
            }
            resultLines.push(
              `- ${call.name}: ${outcome.ok ? "OK" : "FAILED"} — ${outcome.message}`
            )
          }
          messages.push({
            role: "user",
            content: `[tool results]\n${resultLines.join("\n")}`,
          })
        }
        send({ type: "done", used: quota.used, limit: DAILY_LIMIT })
      } catch (err) {
        const aborted =
          request.signal.aborted || err instanceof Anthropic.APIUserAbortError
        if (!aborted) {
          const message =
            err instanceof Anthropic.APIError
              ? `AI request failed (${err.status ?? "network"}): ${err.message}`
              : "AI request failed"
          send({ type: "error", message })
          // Don't burn quota on requests that produced nothing.
          if (!producedOutput) {
            try {
              await admin.rpc("refund_ai_request", { p_user_id: user.id })
            } catch {
              // best-effort refund
            }
          }
        }
      } finally {
        closed = true
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
  })

  return new Response(streamBody, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
