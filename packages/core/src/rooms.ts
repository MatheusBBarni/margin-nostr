import type { Event } from "nostr-tools/pure"
import { parseWebComment, type WebComment } from "./events"
import { ROOM_EVENT_CAP } from "./thread"

export type RankedRoom = {
  roomUrl: string
  commentCount: number
  lastActivityAt: number
}

export function mergeRecentWebComments(
  current: WebComment[],
  incoming: WebComment[],
): WebComment[] {
  const byId = new Map<string, WebComment>()
  for (const comment of [...current, ...incoming]) {
    byId.set(comment.id, comment)
  }
  return [...byId.values()].sort((a, b) => b.created_at - a.created_at).slice(0, ROOM_EVENT_CAP)
}

export function collectRecentWebComments(events: Event[]): WebComment[] {
  const parsed: WebComment[] = []
  for (const event of events) {
    const comment = parseWebComment(event)
    if (comment) parsed.push(comment)
  }
  return mergeRecentWebComments([], parsed)
}

export function rankRooms(comments: WebComment[]): RankedRoom[] {
  const byRoom = new Map<string, RankedRoom>()

  for (const comment of comments) {
    const existing = byRoom.get(comment.roomUrl)
    if (existing) {
      existing.commentCount += 1
      if (comment.created_at > existing.lastActivityAt) {
        existing.lastActivityAt = comment.created_at
      }
    } else {
      byRoom.set(comment.roomUrl, {
        roomUrl: comment.roomUrl,
        commentCount: 1,
        lastActivityAt: comment.created_at,
      })
    }
  }

  return [...byRoom.values()].sort((a, b) => {
    if (b.commentCount !== a.commentCount) return b.commentCount - a.commentCount
    return b.lastActivityAt - a.lastActivityAt
  })
}
