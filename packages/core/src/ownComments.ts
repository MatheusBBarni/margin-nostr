import type { Event } from "nostr-tools/pure"
import type { WebComment } from "./events"
import { mergeWebCommentWindow, parseWebComments } from "./webComments"

function ownComments(comments: WebComment[], pubkey: string): WebComment[] {
  const self = pubkey.toLowerCase()
  return comments.filter((comment) => comment.pubkey.toLowerCase() === self)
}

export function mergeOwnWebComments(
  current: WebComment[],
  incoming: WebComment[],
  pubkey: string,
): WebComment[] {
  return mergeWebCommentWindow(ownComments(current, pubkey), ownComments(incoming, pubkey))
}

export function collectOwnWebComments(events: Event[], pubkey: string): WebComment[] {
  return mergeOwnWebComments([], parseWebComments(events), pubkey)
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
