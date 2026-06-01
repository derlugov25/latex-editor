"use client"

import { LiveblocksYjsProvider } from "@liveblocks/yjs"
import { useEffect, useMemo, useRef, useState } from "react"
import * as Y from "yjs"
import { useRoom } from "./room"

export interface YjsHandle {
  doc: Y.Doc
  provider: LiveblocksYjsProvider
  /** True once initial state has been synced from Liveblocks. */
  ready: boolean
}

/**
 * Create a Y.Doc bound to the current Liveblocks room.
 * The doc and provider live for the lifetime of the hook.
 */
export function useYjs(): YjsHandle {
  const room = useRoom()
  const doc = useMemo(() => new Y.Doc(), [room])
  const providerRef = useRef<LiveblocksYjsProvider | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const provider = new LiveblocksYjsProvider(room, doc)
    providerRef.current = provider

    const onSync = (synced: boolean) => {
      if (synced) setReady(true)
    }
    provider.on("sync", onSync)

    return () => {
      provider.off("sync", onSync)
      provider.destroy()
      doc.destroy()
      providerRef.current = null
    }
  }, [room, doc])

  // provider is always non-null once `ready` is true — callers must
  // gate on `ready` before touching `provider`.
  return { doc, provider: providerRef.current as LiveblocksYjsProvider, ready }
}
