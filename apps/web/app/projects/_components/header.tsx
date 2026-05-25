"use client"

import Link from "next/link"
import { RiFileTextLine, RiLogoutBoxRLine } from "@remixicon/react"
import { Button } from "@workspace/ui/components/button"
import { signOutAction } from "@/app/login/actions"

export function AppHeader({ email }: { email: string | null }) {
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <Link href="/projects" className="flex items-center gap-2 font-medium">
        <RiFileTextLine className="size-5 text-primary" />
        <span>Kursach LaTeX</span>
      </Link>
      <div className="flex items-center gap-3 text-sm">
        {email ? (
          <span className="text-muted-foreground hidden sm:inline">{email}</span>
        ) : null}
        <form action={signOutAction}>
          <Button variant="ghost" size="sm" type="submit">
            <RiLogoutBoxRLine className="size-4" />
            Sign out
          </Button>
        </form>
      </div>
    </header>
  )
}
