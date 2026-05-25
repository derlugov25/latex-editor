"use client"

import { useOthers, useSelf } from "@workspace/collab/room"
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

interface UserInfo {
  name?: string
  color?: string
}

export function PresenceAvatars() {
  const others = useOthers()
  const self = useSelf()

  const items: { id: string | number; info: UserInfo; you: boolean }[] = []
  if (self) {
    items.push({
      id: self.connectionId,
      info: (self.info ?? {}) as UserInfo,
      you: true,
    })
  }
  for (const peer of others) {
    items.push({
      id: peer.connectionId,
      info: (peer.info ?? {}) as UserInfo,
      you: false,
    })
  }

  if (items.length === 0) return null

  return (
    <div className="flex items-center -space-x-2">
      {items.slice(0, 5).map(({ id, info, you }) => {
        const name = info.name ?? "User"
        const color = info.color ?? "#64748b"
        return (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <Avatar className="border-background size-7 border-2">
                <AvatarFallback
                  style={{ backgroundColor: color }}
                  className="text-xs font-medium text-white"
                >
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              {name}
              {you ? " (you)" : ""}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
