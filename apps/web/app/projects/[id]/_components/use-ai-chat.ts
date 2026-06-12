"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type {
  AiFileAction,
  AiRequestBody,
  AiStreamEvent,
} from "@/lib/ai-events"
import type { ProjectFilesHandle } from "./use-project-files"

export interface AiActionChip {
  kind: "edit" | "write" | "delete" | "error"
  path: string
  /** "created" for new files, error text for failures. */
  detail?: string
}

export interface AiDisplayMessage {
  id: string
  role: "user" | "assistant"
  text: string
  actions: AiActionChip[]
  error?: string
}

export interface AiUsage {
  used: number
  limit: number
}

interface UseAiChatOptions {
  projectId: string
  doc: ProjectFilesHandle
  activeFilePath: string | null
}

let nextId = 0
const newId = () => `ai-${++nextId}`

/**
 * Chat state for the AI assistant: streams NDJSON events from the project AI
 * endpoint and applies file actions to the live Yjs document, so edits show
 * up in the editor (and for collaborators) as the agent works.
 */
export function useAiChat({
  projectId,
  doc,
  activeFilePath,
}: UseAiChatOptions) {
  const [messages, setMessages] = useState<AiDisplayMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [usage, setUsage] = useState<AiUsage | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // The doc handle is recreated on every render; keep a ref so the streaming
  // callback always applies actions to the current document state.
  const docRef = useRef(doc)
  docRef.current = doc

  useEffect(() => () => abortRef.current?.abort(), [])

  const updateLast = useCallback(
    (update: (message: AiDisplayMessage) => AiDisplayMessage) => {
      setMessages((current) => {
        if (current.length === 0) return current
        const last = current[current.length - 1]!
        return [...current.slice(0, -1), update(last)]
      })
    },
    []
  )

  const applyAction = useCallback((action: AiFileAction): AiActionChip => {
    const d = docRef.current
    const entry = d.files.find((f) => f.path === action.path) ?? null

    if (action.kind === "delete") {
      if (entry) d.deleteFile(entry.id)
      return { kind: "delete", path: action.path }
    }
    if (action.kind === "write") {
      if (entry && entry.kind === "text") {
        d.replaceTextContent(entry.id, action.content)
      } else if (!entry) {
        d.createTextFile(action.path, action.content)
      }
      return {
        kind: "write",
        path: action.path,
        detail: action.created ? "created" : undefined,
      }
    }
    // Granular replacement keeps collaborators' cursors stable; if the local
    // text diverged from what the server validated against, fall back to the
    // server-computed full content.
    if (entry && entry.kind === "text") {
      const applied = d.applyTextEdit(
        entry.id,
        action.edit.old,
        action.edit.new,
        action.edit.all
      )
      if (!applied) d.replaceTextContent(entry.id, action.content)
    } else if (!entry) {
      d.createTextFile(action.path, action.content)
    }
    return { kind: "edit", path: action.path }
  }, [])

  const send = useCallback(
    async (prompt: string) => {
      const text = prompt.trim()
      if (!text || isStreaming || !docRef.current.ready) return

      const history = messages
        .filter((m) => m.text.length > 0)
        .map((m) => ({ role: m.role, text: m.text }))

      setMessages((current) => [
        ...current,
        { id: newId(), role: "user", text, actions: [] },
        { id: newId(), role: "assistant", text: "", actions: [] },
      ])
      setIsStreaming(true)

      const d = docRef.current
      const textFiles = d.collectTextFiles()
      const body: AiRequestBody = {
        messages: [...history, { role: "user", text }],
        files: [
          ...textFiles.map(({ path, content }) => ({ path, content })),
          ...d.files
            .filter((f) => f.kind === "binary")
            .map((f) => ({ path: f.path, binary: true })),
        ],
        mainFile: d.files.find((f) => f.id === d.mainFileId)?.path ?? undefined,
        activeFile: activeFilePath ?? undefined,
      }

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch(`/api/projects/${projectId}/ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string
            used?: number
            limit?: number
          } | null
          if (
            typeof payload?.used === "number" &&
            typeof payload?.limit === "number"
          ) {
            setUsage({ used: payload.used, limit: payload.limit })
          }
          updateLast((m) => ({
            ...m,
            error: payload?.error ?? `Request failed (${response.status})`,
          }))
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""
          for (const line of lines) {
            if (!line.trim()) continue
            let event: AiStreamEvent
            try {
              event = JSON.parse(line) as AiStreamEvent
            } catch {
              continue
            }
            if (event.type === "text") {
              updateLast((m) => ({ ...m, text: m.text + event.text }))
            } else if (event.type === "action") {
              const chip = applyAction(event.action)
              updateLast((m) => ({ ...m, actions: [...m.actions, chip] }))
            } else if (event.type === "action_error") {
              updateLast((m) => ({
                ...m,
                actions: [
                  ...m.actions,
                  { kind: "error", path: event.path, detail: event.message },
                ],
              }))
            } else if (event.type === "done") {
              setUsage({ used: event.used, limit: event.limit })
            } else if (event.type === "error") {
              updateLast((m) => ({ ...m, error: event.message }))
            }
          }
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          updateLast((m) => ({ ...m, error: "Connection lost" }))
        }
      } finally {
        abortRef.current = null
        setIsStreaming(false)
      }
    },
    [projectId, activeFilePath, isStreaming, messages, applyAction, updateLast]
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { messages, isStreaming, usage, send, stop }
}
