import type { Event } from "nostr-tools/pure"
import { parseWebComment, type WebComment } from "./events"
import { ROOM_EVENT_CAP } from "./thread"

export function parseWebComments(events: Event[]): WebComment[] {
  const parsed: WebComment[] = []
  for (const event of events) {
    const comment = parseWebComment(event)
    if (comment) parsed.push(comment)
  }
  return parsed
}

export function mergeWebCommentWindow(
  current: WebComment[],
  incoming: WebComment[],
): WebComment[] {
  const byId = new Map<string, WebComment>()
  for (const comment of [...current, ...incoming]) {
    byId.set(comment.id, comment)
  }
  return [...byId.values()].sort((a, b) => b.created_at - a.created_at).slice(0, ROOM_EVENT_CAP)
}

export const mergeRecentWebComments = mergeWebCommentWindow

export function collectRecentWebComments(events: Event[]): WebComment[] {
  return mergeWebCommentWindow([], parseWebComments(events))
}
