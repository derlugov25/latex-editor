"use client"

import { useEffect, type ReactNode } from "react"
import Link from "next/link"
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiCheckLine,
  RiFileTextLine,
  RiLoader4Line,
  RiPlayLine,
} from "@remixicon/react"
import { COMPILE_ENGINES } from "@workspace/compiler-client"
import type { CompileEngine } from "@workspace/compiler-client/types"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Separator } from "@workspace/ui/components/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { Badge } from "@workspace/ui/components/badge"
import { PresenceAvatars } from "./presence-avatars"

interface EditorToolbarProps {
  projectName: string
  activeFilePath: string | null
  engine: CompileEngine
  onEngineChange(engine: CompileEngine): void
  onCompile(): void
  isCompiling: boolean
  shareSlot?: ReactNode
}

export function EditorToolbar({
  projectName,
  activeFilePath,
  engine,
  onEngineChange,
  onCompile,
  isCompiling,
  shareSlot,
}: EditorToolbarProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        onCompile()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onCompile])

  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent)
  const shortcut = isMac ? "⌘↵" : "Ctrl+↵"

  return (
    <div className="bg-background/80 flex items-center gap-2 border-b px-3 py-1.5 backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7 shrink-0" asChild>
            <Link href="/projects">
              <RiArrowLeftSLine className="size-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Back to projects</TooltipContent>
      </Tooltip>

      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium">{projectName}</span>
      </div>

      {activeFilePath ? (
        <>
          <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
          <div className="text-muted-foreground hidden min-w-0 items-center gap-1.5 sm:flex">
            <RiFileTextLine className="size-3.5 shrink-0" />
            <span className="truncate font-mono text-xs">{activeFilePath}</span>
          </div>
        </>
      ) : null}

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <PresenceAvatars />
        {shareSlot}

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-1 font-mono text-xs">
                  {engine}
                  <RiArrowDownSLine className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>LaTeX engine</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-36">
            {COMPILE_ENGINES.map((candidate) => (
              <DropdownMenuItem
                key={candidate}
                onClick={() => onEngineChange(candidate)}
                className="justify-between font-mono"
              >
                {candidate}
                {candidate === engine ? <RiCheckLine className="size-3.5" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onCompile} disabled={isCompiling} size="sm" className="gap-1.5">
              {isCompiling ? (
                <RiLoader4Line className="size-4 animate-spin" />
              ) : (
                <RiPlayLine className="size-4" />
              )}
              <span className="hidden sm:inline">
                {isCompiling ? "Compiling..." : "Compile"}
              </span>
              <Badge variant="secondary" className="ml-0.5 hidden px-1.5 py-0 text-[10px] font-normal sm:inline-flex">
                {shortcut}
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{shortcut} to compile</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
