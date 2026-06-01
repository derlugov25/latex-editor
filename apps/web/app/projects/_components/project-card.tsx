"use client"

import Link from "next/link"
import { RiDeleteBin6Line, RiMoreLine } from "@remixicon/react"
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
import type { ProjectRow } from "@workspace/supabase/types"
import { deleteProjectAction } from "../actions"

export function ProjectCard({
  project,
  isShared,
}: {
  project: ProjectRow
  isShared?: boolean
}) {
  const updated = new Date(project.updated_at).toLocaleString()

  return (
    <Card className="group hover:border-primary/50 relative transition-colors">
      <Link
        href={`/projects/${project.id}`}
        className="absolute inset-0 z-10 rounded-[inherit] focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden"
        aria-label={`Open ${project.name}`}
      />
      <CardHeader className="pointer-events-none relative z-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate">{project.name}</CardTitle>
            <CardDescription>
              {isShared && <span className="text-primary mr-1">Shared</span>}
              Updated {updated}
            </CardDescription>
          </div>
          {!isShared && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => e.stopPropagation()}
                  className="pointer-events-auto relative z-20"
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
      </CardHeader>
    </Card>
  )
}
