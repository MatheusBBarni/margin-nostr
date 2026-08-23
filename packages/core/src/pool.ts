import type { Event } from "nostr-tools/pure"
import { KIND_COMMENT, parseComment, type VerifiedComment } from "./events"

export type RoomSub = {
  close: () => void
}

export type RoomHandlers = {
  onevent: (comment: VerifiedComment) => void
}

export type PoolLike = {
  subscribeMany: (
    relays: string[],
    filters: object[],
    opts: { onevent: (event: Event) => void },
  ) => RoomSub
}

export function subscribeRoom(
  pool: PoolLike,
  relays: string[],
  normalizedUrl: string,
  handlers: RoomHandlers,
): RoomSub {
  const seen = new Set<string>()
  return pool.subscribeMany(
    relays,
    [
      { kinds: [KIND_COMMENT], "#I": [normalizedUrl], limit: 200 },
      { kinds: [KIND_COMMENT], "#i": [normalizedUrl], limit: 200 },
    ],
    {
      onevent(event) {
        const parsed = parseComment(event, normalizedUrl)
        if (!parsed || seen.has(parsed.id)) return
        seen.add(parsed.id)
        handlers.onevent(parsed)
      },
    },
  )
}
