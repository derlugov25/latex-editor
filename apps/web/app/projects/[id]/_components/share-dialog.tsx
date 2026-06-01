"use client"

import { useCallback, useEffect, useState } from "react"
import {
  RiFileCopyLine,
  RiLinkM,
  RiDeleteBin6Line,
  RiUserAddLine,
  RiCheckLine,
  RiLoader4Line,
} from "@remixicon/react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"
import { Badge } from "@workspace/ui/components/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

interface Invite {
  id: string
  role: string
  created_at: string
}

interface ShareDialogProps {
  projectId: string
  isOwner: boolean
}

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  document.body.removeChild(textarea)
  return Promise.resolve()
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

export function ShareDialog({ projectId, isOwner }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const loadInvites = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/invite`)
    if (res.ok) {
      const data = await res.json()
      setInvites(data ?? [])
    }
  }, [projectId])

  useEffect(() => {
    if (open) {
      setCreatedLink(null)
      setError("")
      void loadInvites()
    }
  }, [open, loadInvites])

  const handleCreateInvite = async () => {
    setError("")
    setCreating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const invite = await res.json()
        const link = `${window.location.origin}/invite/${invite.id}`
        await copyToClipboard(link)
        setCreatedLink(link)
        setCopied("new")
        setTimeout(() => setCopied(null), 2000)
        void loadInvites()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to create invite link")
      }
    } finally {
      setCreating(false)
    }
  }

  const handleCopyLink = async (inviteId: string) => {
    const link = `${window.location.origin}/invite/${inviteId}`
    await copyToClipboard(link)
    setCopied(inviteId)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleDeleteInvite = async (inviteId: string) => {
    await fetch(`/api/projects/${projectId}/invite`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    })
    void loadInvites()
  }

  if (!isOwner) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RiUserAddLine className="size-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share project</DialogTitle>
          <DialogDescription>
            Create an invite link to share this project with collaborators.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCreateInvite}
            disabled={creating}
          >
            {creating ? (
              <RiLoader4Line className="size-4 animate-spin" />
            ) : copied === "new" ? (
              <RiCheckLine className="size-4 text-green-500" />
            ) : (
              <RiLinkM className="size-4" />
            )}
            {copied === "new" ? "Link copied!" : creating ? "Creating..." : "Create invite link"}
          </Button>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          {createdLink && (
            <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-2">
              <Input
                value={createdLink}
                readOnly
                className="border-0 bg-transparent text-xs focus-visible:ring-0"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => handleCopyLink(createdLink.split("/invite/")[1]!)}
                  >
                    {copied === createdLink.split("/invite/")[1] ? (
                      <RiCheckLine className="size-4 text-green-500" />
                    ) : (
                      <RiFileCopyLine className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy link</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {invites.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Active links</h4>
                <span className="text-muted-foreground text-xs">{invites.length} link{invites.length === 1 ? "" : "s"}</span>
              </div>
              <ul className="space-y-1.5">
                {invites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <RiLinkM className="text-muted-foreground size-3.5 shrink-0" />
                      <span className="text-muted-foreground truncate font-mono text-xs">
                        ...{inv.id.slice(-8)}
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {inv.role}
                      </Badge>
                      <span className="text-muted-foreground/60 text-[10px] hidden sm:inline">
                        {timeAgo(inv.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => handleCopyLink(inv.id)}
                          >
                            {copied === inv.id ? (
                              <RiCheckLine className="size-3.5 text-green-500" />
                            ) : (
                              <RiFileCopyLine className="size-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy link</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 hover:text-destructive"
                            onClick={() => handleDeleteInvite(inv.id)}
                          >
                            <RiDeleteBin6Line className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Revoke invite</TooltipContent>
                      </Tooltip>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
