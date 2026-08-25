import type { WebComment } from "./events"

export type RankedRoom = {
  roomUrl: string
  commentCount: number
  lastActivityAt: number
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
