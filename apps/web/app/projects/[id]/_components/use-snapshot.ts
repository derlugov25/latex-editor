"use client"

import { useEffect, useRef } from "react"

const DEBOUNCE_MS = 1500

interface SnapshotArgs {
  projectId: string
  latex: string
  bibtex: string
  enabled: boolean
}

/**
 * Debounced PUT of the current document text to /api/projects/{id}/snapshot.
 * Lets refreshes resume from the last committed state and keeps an authoritative
 * copy outside of the Liveblocks room.
 */
export function useSnapshot({ projectId, latex, bibtex, enabled }: SnapshotArgs) {
  const lastSaved = useRef<{ latex: string; bibtex: string }>({
    latex: "",
    bibtex: "",
  })

  useEffect(() => {
    if (!enabled) return
    if (
      lastSaved.current.latex === latex &&
      lastSaved.current.bibtex === bibtex
    ) {
      return
    }

    const handle = window.setTimeout(() => {
      void fetch(`/api/projects/${projectId}/snapshot`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex_content: latex, bibtex_content: bibtex }),
      })
        .then((r) => {
          if (r.ok) lastSaved.current = { latex, bibtex }
        })
        .catch(() => {})
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(handle)
  }, [projectId, latex, bibtex, enabled])
}
