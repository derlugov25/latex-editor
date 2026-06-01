"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
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
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <CardTitle>Loading invite...</CardTitle>
              <CardDescription>Please wait</CardDescription>
            </>
          )}
          {status === "ready" && (
            <>
              <CardTitle>Join project</CardTitle>
              <CardDescription>
                You have been invited to collaborate on <strong>{projectName}</strong>
              </CardDescription>
              <div className="pt-4">
                <Button onClick={handleJoin} className="w-full">
                  Join project
                </Button>
              </div>
            </>
          )}
          {status === "joining" && (
            <>
              <CardTitle>Joining...</CardTitle>
              <CardDescription>Setting up access</CardDescription>
            </>
          )}
          {status === "error" && (
            <>
              <CardTitle>Error</CardTitle>
              <CardDescription className="text-destructive">{error}</CardDescription>
              <div className="pt-4">
                <Button variant="outline" onClick={() => router.push("/projects")}>
                  Go to projects
                </Button>
              </div>
            </>
          )}
        </CardHeader>
      </Card>
    </div>
  )
}
