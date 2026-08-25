import { describe, expect, test } from "bun:test"
import type { WebComment } from "./events"
import { rankRooms } from "./rooms"

const ROOM = "https://example.com/x"

function web(partial: {
  id: string
  roomUrl: string
  created_at: number
  content?: string
}): WebComment {
  return {
    id: partial.id,
    pubkey: "00".repeat(32),
    kind: 1111,
    created_at: partial.created_at,
    content: partial.content ?? partial.id,
    tags: [],
    sig: "00",
    roomUrl: partial.roomUrl,
  }
}

describe("rankRooms", () => {
  test("two comments on the same room become one ranked room with count 2 and the newer last activity", () => {
    const older = web({ id: "old", roomUrl: ROOM, created_at: 10 })
    const newer = web({ id: "new", roomUrl: ROOM, created_at: 30 })

    expect(rankRooms([older, newer])).toEqual([
      { roomUrl: ROOM, commentCount: 2, lastActivityAt: 30 },
    ])
  })
})
