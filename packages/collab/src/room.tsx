"use client"

import {
  ClientSideSuspense,
  createRoomContext,
} from "@liveblocks/react"
import type { ReactNode } from "react"
import { liveblocks } from "./client"
import type { CollabPresence, CollabStorage, RoomEvent } from "./types"

/**
 * Strongly-typed Liveblocks Room context.
 * Re-export individual hooks if you need fine-grained types per call-site.
 */
export const {
  RoomProvider,
  useRoom,
  useSelf,
  useOthers,
  useMyPresence,
  useUpdateMyPresence,
  useBroadcastEvent,
  useEventListener,
  useStorage,
} = createRoomContext<CollabPresence, CollabStorage, never, RoomEvent>(liveblocks)

interface CollabRoomProps {
  roomId: string
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Convenience wrapper: enters the room with empty presence and suspends
 * until the initial sync resolves.
 */
export function CollabRoom({ roomId, fallback = null, children }: CollabRoomProps) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ user: null, cursor: null }}
      initialStorage={{}}
    >
      <ClientSideSuspense fallback={fallback}>{children}</ClientSideSuspense>
    </RoomProvider>
  )
}
