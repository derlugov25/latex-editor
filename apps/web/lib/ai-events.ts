/**
 * Wire protocol between the AI assistant endpoint
 * (`POST /api/projects/[id]/ai`, NDJSON stream) and the chat panel.
 */

/** A file mutation the agent performed, already validated server-side. */
export type AiFileAction =
  | {
      kind: "edit"
      path: string
      /** Full file content after the edit — fallback if the client-side
       * string replacement no longer matches (file changed mid-run). */
      content: string
      edit: { old: string; new: string; all: boolean }
    }
  | { kind: "write"; path: string; content: string; created: boolean }
  | { kind: "delete"; path: string }

export type AiStreamEvent =
  | { type: "text"; text: string }
  | { type: "action"; action: AiFileAction }
  | { type: "action_error"; path: string; message: string }
  | { type: "done"; used: number; limit: number }
  | { type: "error"; message: string }

/** Chat history entry sent by the client (text-only). */
export interface AiChatMessage {
  role: "user" | "assistant"
  text: string
}

/** Project file snapshot sent by the client. */
export interface AiProjectFile {
  path: string
  /** Omitted for binary files. */
  content?: string
  binary?: boolean
}

export interface AiRequestBody {
  messages: AiChatMessage[]
  files: AiProjectFile[]
  /** Path of the project's main .tex file, if known. */
  mainFile?: string
  /** Path of the file currently open in the editor, if any. */
  activeFile?: string
}
