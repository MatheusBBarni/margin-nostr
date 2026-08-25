import type { Event } from "nostr-tools/pure"
import { KIND_COMMENT, parseComment, parseWebComment, type VerifiedComment, type WebComment } from "./events"
import { collectOwnWebComments } from "./ownComments"
import { ROOM_EVENT_CAP } from "./thread"

export type RoomSub = {
  close: () => void
}

export type RoomHandlers = {
  onevent: (comment: VerifiedComment) => void
}

export type OwnCommentHandlers = {
  onevent: (comment: WebComment) => void
}

export type PoolLike = {
  subscribeMany: (
    relays: string[],
    filter: object,
    opts: { onevent: (event: Event) => void },
  ) => RoomSub
  publish: (relays: string[], event: Event) => Promise<unknown>[]
}

export type OwnCommentQueryPool = {
  querySync: (relays: string[], filter: object) => Promise<Event[]>
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

export function subscribeOwnComments(
  pool: PoolLike,
  relays: string[],
  pubkey: string,
  handlers: OwnCommentHandlers,
): RoomSub {
  const self = pubkey.toLowerCase()
  const seen = new Set<string>()
  const sub = pool.subscribeMany(relays, { kinds: [KIND_COMMENT], authors: [self] }, {
    onevent(event: Event) {
      const parsed = parseWebComment(event)
      if (!parsed || parsed.pubkey.toLowerCase() !== self || seen.has(parsed.id)) return
      seen.add(parsed.id)
      handlers.onevent(parsed)
    },
  })
  return {
    close() {
      sub.close()
    },
  }
}

export async function fetchOwnComments(
  pool: OwnCommentQueryPool,
  relays: string[],
  pubkey: string,
): Promise<WebComment[]> {
  const self = pubkey.toLowerCase()
  const events = await pool.querySync(relays, {
    kinds: [KIND_COMMENT],
    authors: [self],
    limit: ROOM_EVENT_CAP,
  })
  return collectOwnWebComments(events, self)
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
