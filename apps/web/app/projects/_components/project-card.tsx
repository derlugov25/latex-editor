"use client"

import Link from "next/link"
import {
  RiDeleteBin6Line,
  RiMoreLine,
  RiFileTextLine,
  RiTeamLine,
  RiTimeLine,
} from "@remixicon/react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Badge } from "@workspace/ui/components/badge"
import type { ProjectRow } from "@workspace/supabase/types"
import { deleteProjectAction } from "../actions"

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffSec = Math.floor((now - then) / 1000)

  if (diffSec < 60) return "just now"
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function latexSnippet(content: string): string {
  const lines = content
    .split("\n")
    .filter((l) => !l.startsWith("\\") && !l.startsWith("%") && l.trim().length > 0)
  return lines.slice(0, 3).join(" ").slice(0, 120) || "Empty document"
}

export function ProjectCard({
  project,
  isShared,
}: {
  project: ProjectRow
  isShared?: boolean
}) {
  const updated = relativeTime(project.updated_at)
  const snippet = latexSnippet(project.latex_content)

  return (
    <Card className="group hover:border-primary/40 hover:shadow-sm relative transition-all duration-200">
      <Link
        href={`/projects/${project.id}`}
        className="absolute inset-0 z-10 rounded-[inherit] focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden"
        aria-label={`Open ${project.name}`}
      />
      <CardHeader className="pointer-events-none relative z-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="bg-primary/8 text-primary mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <RiFileTextLine className="size-4.5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{project.name}</CardTitle>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                {snippet}
              </p>
            </div>
          </div>
          {!isShared && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => e.stopPropagation()}
                  className="pointer-events-auto relative z-20 size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <RiMoreLine className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <form action={deleteProjectAction}>
                  <input type="hidden" name="id" value={project.id} />
                  <DropdownMenuItem asChild>
                    <button
                      type="submit"
                      className="text-destructive flex w-full items-center gap-2"
                    >
                      <RiDeleteBin6Line className="size-4" />
                      Delete
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center gap-2 pt-2">
          {isShared && (
            <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
              <RiTeamLine className="size-3" />
              Shared
            </Badge>
          )}
          <span className="text-muted-foreground/70 flex items-center gap-1 text-[11px]">
            <RiTimeLine className="size-3" />
            {updated}
          </span>
        </div>
      </CardHeader>
    </Card>
  )
}
