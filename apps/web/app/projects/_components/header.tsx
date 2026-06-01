"use client"

import Link from "next/link"
import { RiLogoutBoxRLine, RiMoonLine, RiSunLine } from "@remixicon/react"
import { useTheme } from "next-themes"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { signOutAction } from "@/app/login/actions"

export function AppHeader({ email }: { email: string | null }) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="bg-background/80 sticky top-0 z-30 flex items-center justify-between border-b px-6 py-3 backdrop-blur-sm">
      <Link href="/projects" className="flex items-center gap-2.5 font-medium">
        <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg text-sm font-bold tracking-tight select-none">
          T<span className="text-primary/60 text-[10px]">e</span>X
        </div>
        <span className="text-sm font-semibold">Kursach LaTeX</span>
      </Link>
      <div className="flex items-center gap-2 text-sm">
        {email ? (
          <span className="text-muted-foreground hidden rounded-md bg-muted/50 px-2.5 py-1 text-xs sm:inline">
            {email}
          </span>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? (
                <RiSunLine className="size-4" />
              ) : (
                <RiMoonLine className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>
        <form action={signOutAction}>
          <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground">
            <RiLogoutBoxRLine className="size-4" />
            Sign out
          </Button>
        </form>
      </div>
    </header>
  )
}
