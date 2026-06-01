"use client"

import { useEffect, type ReactNode } from "react"
import Link from "next/link"
import {
  RiArrowLeftSLine,
  RiFileTextLine,
  RiLoader4Line,
  RiPlayLine,
} from "@remixicon/react"
import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
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
  activeTab: "latex" | "bibtex"
  onTabChange(tab: "latex" | "bibtex"): void
  onCompile(): void
  isCompiling: boolean
  shareSlot?: ReactNode
}

export function EditorToolbar({
  projectName,
  activeTab,
  onTabChange,
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
        <RiFileTextLine className="text-muted-foreground size-4 shrink-0" />
        <span className="truncate text-sm font-medium">{projectName}</span>
      </div>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as "latex" | "bibtex")}
      >
        <TabsList>
          <TabsTrigger value="latex">main.tex</TabsTrigger>
          <TabsTrigger value="bibtex">references.bib</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <PresenceAvatars />
        {shareSlot}
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
