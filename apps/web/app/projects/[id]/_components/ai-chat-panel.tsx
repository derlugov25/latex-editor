"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiFileAddLine,
  RiPencilLine,
  RiSendPlane2Line,
  RiSparkling2Line,
  RiStopFill,
  RiSubtractLine,
} from "@remixicon/react"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useAiChat, type AiActionChip } from "./use-ai-chat"
import type { ProjectFilesHandle } from "./use-project-files"

const OPEN_STORAGE_KEY = "latex-editor:ai-chat-open"

const SUGGESTIONS = [
  "Fix the compile errors in this project",
  "Improve the structure of the document",
  "Add a results table with sample data",
]

interface AiChatPanelProps {
  projectId: string
  doc: ProjectFilesHandle
  activeFilePath: string | null
}

/**
 * Floating AI assistant chat. Collapses to a small launcher button in the
 * corner of the editor so it never blocks the workspace.
 */
export function AiChatPanel({
  projectId,
  doc,
  activeFilePath,
}: AiChatPanelProps) {
  // Only mounted client-side (after the collab room is ready), so reading
  // localStorage in the initializer is safe and avoids a flash of the
  // wrong state.
  const [open, setOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem(OPEN_STORAGE_KEY) === "1"
  )
  const [input, setInput] = useState("")
  const { messages, isStreaming, usage, send, stop } = useAiChat({
    projectId,
    doc,
    activeFilePath,
  })

  const toggle = useCallback((next: boolean) => {
    setOpen(next)
    localStorage.setItem(OPEN_STORAGE_KEY, next ? "1" : "0")
  }, [])

  const scrollRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const submit = useCallback(() => {
    if (!input.trim() || isStreaming) return
    void send(input)
    setInput("")
  }, [input, isStreaming, send])

  if (!open) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => toggle(true)}
            size="icon"
            className="absolute right-4 bottom-4 z-20 size-11 rounded-full shadow-lg"
            aria-label="Open AI assistant"
          >
            <RiSparkling2Line className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">AI assistant</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="absolute right-4 bottom-4 z-20 flex max-h-[min(560px,calc(100%-2rem))] w-[380px] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl border bg-background shadow-xl">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <RiSparkling2Line className="size-4 text-primary" />
        <span className="text-sm font-medium">AI assistant</span>
        {usage ? (
          <span className="text-xs text-muted-foreground">
            {usage.used}/{usage.limit} today
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => toggle(false)}
                aria-label="Minimize AI assistant"
              >
                <RiSubtractLine className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hide (chat is kept)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-40 flex-1 space-y-3 overflow-y-auto px-3 py-3"
      >
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Ask anything about your LaTeX project — the assistant can edit
              every file in it, not just the open one.
            </p>
            <div className="flex flex-col items-start gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="rounded-md border px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => void send(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={message.id} className="space-y-1.5">
              {message.role === "user" ? (
                <div className="ml-6 rounded-lg bg-primary/10 px-2.5 py-1.5 text-sm whitespace-pre-wrap">
                  {message.text}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {message.text ? (
                    <div className="text-sm whitespace-pre-wrap">
                      {message.text}
                    </div>
                  ) : isStreaming && index === messages.length - 1 ? (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
                      Thinking...
                    </div>
                  ) : null}
                  {message.actions.map((action, actionIndex) => (
                    <ActionChip key={actionIndex} action={action} />
                  ))}
                  {message.error ? (
                    <div className="flex items-start gap-1.5 text-xs text-destructive">
                      <RiErrorWarningLine className="mt-0.5 size-3.5 shrink-0" />
                      {message.error}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t p-2">
        <div className="flex items-end gap-1.5 rounded-lg border bg-muted/40 px-2 py-1.5 focus-within:ring-1 focus-within:ring-ring">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={Math.min(4, Math.max(1, input.split("\n").length))}
            placeholder="Ask AI to edit your project..."
            className="max-h-28 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {isStreaming ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={stop}
              aria-label="Stop generating"
            >
              <RiStopFill className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="size-7 shrink-0"
              disabled={!input.trim()}
              onClick={submit}
              aria-label="Send message"
            >
              <RiSendPlane2Line className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function ActionChip({ action }: { action: AiActionChip }) {
  const icon =
    action.kind === "edit" ? (
      <RiPencilLine className="size-3.5 shrink-0" />
    ) : action.kind === "write" ? (
      <RiFileAddLine className="size-3.5 shrink-0" />
    ) : action.kind === "delete" ? (
      <RiDeleteBinLine className="size-3.5 shrink-0" />
    ) : (
      <RiErrorWarningLine className="size-3.5 shrink-0 text-destructive" />
    )
  const label =
    action.kind === "edit"
      ? "Edited"
      : action.kind === "write"
        ? action.detail === "created"
          ? "Created"
          : "Rewrote"
        : action.kind === "delete"
          ? "Deleted"
          : "Failed"
  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
      {icon}
      <span className="shrink-0">{label}</span>
      <span className="truncate font-mono text-foreground">{action.path}</span>
      {action.kind === "error" && action.detail ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="ml-auto shrink-0 cursor-default text-destructive">
              details
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-72">{action.detail}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}
