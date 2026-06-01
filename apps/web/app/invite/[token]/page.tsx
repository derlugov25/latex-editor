"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { RiLoader4Line, RiTeamLine, RiErrorWarningLine } from "@remixicon/react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "ready" | "joining" | "error">("loading")
  const [projectName, setProjectName] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/invite/${token}`, { method: "GET" })
      .then(async (r) => {
        if (!r.ok) {
          setStatus("error")
          setError("Invite not found or expired")
          return
        }
        const data = await r.json()
        setProjectName(data.project_name)
        setStatus("ready")
      })
      .catch(() => {
        setStatus("error")
        setError("Failed to load invite")
      })
  }, [token])

  const handleJoin = async () => {
    setStatus("joining")
    try {
      const res = await fetch(`/api/invite/${token}`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to join")
        setStatus("error")
        return
      }
      const { projectId } = await res.json()
      router.push(`/projects/${projectId}`)
    } catch {
      setError("Failed to join project")
      setStatus("error")
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="flex justify-center pb-2">
                <RiLoader4Line className="text-primary size-8 animate-spin" />
              </div>
              <CardTitle>Loading invite...</CardTitle>
              <CardDescription>Please wait</CardDescription>
            </>
          )}
          {status === "ready" && (
            <>
              <div className="flex justify-center pb-2">
                <div className="bg-primary/10 flex size-14 items-center justify-center rounded-2xl">
                  <RiTeamLine className="text-primary size-7" />
                </div>
              </div>
              <CardTitle>Join project</CardTitle>
              <CardDescription>
                You have been invited to collaborate on
              </CardDescription>
            </>
          )}
          {status === "joining" && (
            <>
              <div className="flex justify-center pb-2">
                <RiLoader4Line className="text-primary size-8 animate-spin" />
              </div>
              <CardTitle>Joining...</CardTitle>
              <CardDescription>Setting up access</CardDescription>
            </>
          )}
          {status === "error" && (
            <>
              <div className="flex justify-center pb-2">
                <div className="bg-destructive/10 flex size-14 items-center justify-center rounded-2xl">
                  <RiErrorWarningLine className="text-destructive size-7" />
                </div>
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription className="text-destructive">{error}</CardDescription>
            </>
          )}
        </CardHeader>

        {status === "ready" && (
          <CardContent className="space-y-4 text-center">
            <div className="bg-muted/50 rounded-lg px-4 py-3">
              <p className="text-base font-semibold">{projectName}</p>
            </div>
            <Button onClick={handleJoin} className="w-full" size="lg">
              <RiTeamLine className="size-4" />
              Join project
            </Button>
          </CardContent>
        )}

        {status === "error" && (
          <CardContent>
            <Button
              variant="outline"
              onClick={() => router.push("/projects")}
              className="w-full"
            >
              Go to projects
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
