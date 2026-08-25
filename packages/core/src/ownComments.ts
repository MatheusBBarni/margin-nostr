import type { Event } from "nostr-tools/pure"
import { parseWebComment, type WebComment } from "./events"
import { ROOM_EVENT_CAP } from "./thread"

export function mergeOwnWebComments(
  current: WebComment[],
  incoming: WebComment[],
  pubkey: string,
): WebComment[] {
  const self = pubkey.toLowerCase()
  const byId = new Map<string, WebComment>()
  for (const comment of [...current, ...incoming]) {
    if (comment.pubkey.toLowerCase() !== self) continue
    byId.set(comment.id, comment)
  }
  return [...byId.values()].sort((a, b) => b.created_at - a.created_at).slice(0, ROOM_EVENT_CAP)
}

export function collectOwnWebComments(events: Event[], pubkey: string): WebComment[] {
  const parsed: WebComment[] = []
  for (const event of events) {
    const comment = parseWebComment(event)
    if (comment) parsed.push(comment)
  }
  return mergeOwnWebComments([], parsed, pubkey)
}

export type OwnCommentGroup = {
  roomUrl: string
  comments: WebComment[]
}

export function groupOwnWebComments(comments: WebComment[]): OwnCommentGroup[] {
  const groups = new Map<string, WebComment[]>()
  for (const comment of comments) {
    const existing = groups.get(comment.roomUrl)
    if (existing) existing.push(comment)
    else groups.set(comment.roomUrl, [comment])
  }

  return [...groups.entries()]
    .map(([roomUrl, rows]) => ({
      roomUrl,
      comments: [...rows].sort((a, b) => b.created_at - a.created_at),
    }))
    .sort((a, b) => (b.comments[0]?.created_at ?? 0) - (a.comments[0]?.created_at ?? 0))
}
