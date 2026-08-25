import type { WebComment } from "./events"

export type RankedRoom = {
  roomUrl: string
  commentCount: number
  lastActivityAt: number
}

export function rankRooms(comments: WebComment[]): RankedRoom[] {
  const first = comments[0]
  if (!first) return []

  let lastActivityAt = first.created_at
  for (const comment of comments) {
    if (comment.created_at > lastActivityAt) lastActivityAt = comment.created_at
  }

  return [
    {
      roomUrl: first.roomUrl,
      commentCount: comments.length,
      lastActivityAt,
    },
  ]
}
