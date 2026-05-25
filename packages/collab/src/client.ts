"use client"

import { createClient } from "@liveblocks/client"

/**
 * Liveblocks client wired to our `/api/liveblocks-auth` route handler.
 * That handler authorizes the caller via Supabase and issues a room token.
 */
export const liveblocks = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 16,
})
