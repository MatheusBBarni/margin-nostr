import type { Event } from "nostr-tools/pure"
import { KIND_COMMENT, parseComment, parseWebComment, type VerifiedComment, type WebComment } from "./events"
import { collectOwnWebComments } from "./ownComments"
import { ROOM_EVENT_CAP } from "./thread"
import { collectRecentWebComments } from "./webComments"

export type RoomSub = {
  close: () => void
}

export type RoomHandlers = {
  onevent: (comment: VerifiedComment) => void
}

export type WebCommentHandlers = {
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

export type CommentQueryPool = {
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

function ownCommentsFilter(pubkey: string, limit?: number) {
  const self = pubkey.toLowerCase()
  return limit === undefined
    ? { kinds: [KIND_COMMENT], authors: [self] }
    : { kinds: [KIND_COMMENT], authors: [self], limit }
}

function subscribeWebComments(
  pool: PoolLike,
  relays: string[],
  filter: object,
  handlers: WebCommentHandlers,
  keep: (comment: WebComment) => boolean,
): RoomSub {
  const seen = new Set<string>()
  return pool.subscribeMany(relays, filter, {
    onevent(event: Event) {
      const parsed = parseWebComment(event)
      if (!parsed || !keep(parsed) || seen.has(parsed.id)) return
      seen.add(parsed.id)
      handlers.onevent(parsed)
    },
  })
}

export function subscribeOwnComments(
  pool: PoolLike,
  relays: string[],
  pubkey: string,
  handlers: WebCommentHandlers,
): RoomSub {
  const self = pubkey.toLowerCase()
  return subscribeWebComments(
    pool,
    relays,
    ownCommentsFilter(self),
    handlers,
    (comment) => comment.pubkey.toLowerCase() === self,
  )
}

function recentWebCommentsFilter() {
  return { kinds: [KIND_COMMENT], limit: ROOM_EVENT_CAP }
}

export function subscribeRecentWebComments(
  pool: PoolLike,
  relays: string[],
  handlers: WebCommentHandlers,
): RoomSub {
  return subscribeWebComments(pool, relays, recentWebCommentsFilter(), handlers, () => true)
}

export async function fetchRecentWebComments(
  pool: CommentQueryPool,
  relays: string[],
): Promise<WebComment[]> {
  const events = await pool.querySync(relays, recentWebCommentsFilter())
  return collectRecentWebComments(events)
}

export async function fetchOwnComments(
  pool: CommentQueryPool,
  relays: string[],
  pubkey: string,
): Promise<WebComment[]> {
  const self = pubkey.toLowerCase()
  const events = await pool.querySync(relays, ownCommentsFilter(self, ROOM_EVENT_CAP))
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
