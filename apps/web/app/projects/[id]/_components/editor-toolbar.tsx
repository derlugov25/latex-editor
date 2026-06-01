"use client"

import type { ReactNode } from "react"
import { RiFileTextLine, RiPlayLine } from "@remixicon/react"
import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Separator } from "@workspace/ui/components/separator"
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
  return (
    <div className="flex items-center gap-3 border-b px-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <RiFileTextLine className="text-muted-foreground size-4 shrink-0" />
        <span className="truncate text-sm font-medium">{projectName}</span>
      </div>

      <Separator orientation="vertical" className="h-5" />

      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as "latex" | "bibtex")}
      >
        <TabsList>
          <TabsTrigger value="latex">main.tex</TabsTrigger>
          <TabsTrigger value="bibtex">references.bib</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="ml-auto flex items-center gap-3">
        <PresenceAvatars />
        {shareSlot}
        <Button onClick={onCompile} disabled={isCompiling} size="sm">
          <RiPlayLine className="size-4" />
          {isCompiling ? "Compiling…" : "Compile"}
        </Button>
      </div>
    </div>
  )
}
