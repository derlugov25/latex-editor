// Server-safe barrel. Browser-only pieces (Liveblocks React context, Yjs hook,
// y-monaco binding) live behind dedicated subpaths so they never get pulled
// into server bundles like the /api/liveblocks-auth route handler.
export {
  presenceColor,
  type CollabPresence,
  type CollabStorage,
  type RoomEvent,
} from "./types"
