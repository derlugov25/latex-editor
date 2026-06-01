"use client"

import { useCallback, useEffect, useState } from "react"
import {
  RiFileCopyLine,
  RiLinkM,
  RiDeleteBin6Line,
  RiUserAddLine,
  RiCheckLine,
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

export function ShareDialog({ projectId, isOwner }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [createdLink, setCreatedLink] = useState<string | null>(null)
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
      void loadInvites()
    }
  }, [open, loadInvites])

  const handleCreateInvite = async () => {
    setError("")
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
          Share
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
          <Button variant="outline" className="w-full" onClick={handleCreateInvite}>
            <RiLinkM className="size-4" />
            {copied === "new" ? "Link copied!" : "Create invite link"}
          </Button>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          {createdLink && (
            <div className="flex items-center gap-2">
              <Input value={createdLink} readOnly className="text-xs" />
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => handleCopyLink(createdLink.split("/invite/")[1]!)}
              >
                {copied === createdLink.split("/invite/")[1] ? (
                  <RiCheckLine className="size-4" />
                ) : (
                  <RiFileCopyLine className="size-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        {invites.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Active links</h4>
              <ul className="space-y-2">
                {invites.map((inv) => {
                  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inv.id}`
                  return (
                    <li key={inv.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate font-mono text-xs">
                        ...{inv.id.slice(-12)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => handleCopyLink(inv.id)}
                        >
                          {copied === inv.id ? (
                            <RiCheckLine className="size-3.5" />
                          ) : (
                            <RiFileCopyLine className="size-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => handleDeleteInvite(inv.id)}
                        >
                          <RiDeleteBin6Line className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
