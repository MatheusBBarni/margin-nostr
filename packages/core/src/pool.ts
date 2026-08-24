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
    filter: object,
    opts: { onevent: (event: Event) => void },
  ) => RoomSub
  publish: (relays: string[], event: Event) => Promise<unknown>[]
}

export function subscribeRoom(
  pool: PoolLike,
  relays: string[],
  normalizedUrl: string,
  handlers: RoomHandlers,
): RoomSub {
  const seen = new Set<string>()
  const opts = {
    onevent(event: Event) {
      const parsed = parseComment(event, normalizedUrl)
      if (!parsed || seen.has(parsed.id)) return
      seen.add(parsed.id)
      handlers.onevent(parsed)
    },
  }
  const subs = [
    pool.subscribeMany(relays, { kinds: [KIND_COMMENT], "#I": [normalizedUrl], limit: 200 }, opts),
    pool.subscribeMany(relays, { kinds: [KIND_COMMENT], "#i": [normalizedUrl], limit: 200 }, opts),
  ]
  return {
    close() {
      for (const sub of subs) sub.close()
    },
  }
}

export async function publishRoom(
  pool: PoolLike,
  relays: string[],
  signed: Event,
): Promise<{ ok: string[]; failed: string[] }> {
  const results = await Promise.allSettled(pool.publish(relays, signed))
  const ok: string[] = []
  const failed: string[] = []
  for (const [index, result] of results.entries()) {
    const relay = relays[index]
    if (!relay) continue
    if (result.status === "fulfilled") ok.push(relay)
    else failed.push(relay)
  }
  return { ok, failed }
}
