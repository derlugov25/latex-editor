import type { Json } from "@liveblocks/client"

/** Cursor + selection metadata broadcast to peers in the room. */
export interface CollabPresence {
  user: { id: string; name: string; color: string } | null
  cursor: { lineNumber: number; column: number } | null
  // Liveblocks' Presence generic must satisfy `JsonObject`, which requires an
  // index signature. Adding this keeps named fields useful while staying valid.
  [key: string]: Json | undefined
}

/** Empty for now — append shared values here as the app grows. */
export interface CollabStorage {
  [key: string]: Json | undefined
}

export type RoomEvent = { type: "compile-requested"; at: number }

/** Picks a deterministic cursor color from a small palette based on a user id. */
export function presenceColor(seed: string): string {
  const palette = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#06b6d4", "#3b82f6", "#a855f7", "#ec4899",
  ]
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return palette[Math.abs(hash) % palette.length]!
}
