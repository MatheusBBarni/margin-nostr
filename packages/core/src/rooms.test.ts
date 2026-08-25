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

  test("sorts higher count first, then newer last activity", () => {
    const busy = "https://example.com/busy"
    const quiet = "https://example.com/quiet"
    const alsoBusy = "https://example.com/also-busy"

    expect(
      rankRooms([
        web({ id: "quiet-1", roomUrl: quiet, created_at: 50 }),
        web({ id: "busy-1", roomUrl: busy, created_at: 10 }),
        web({ id: "busy-2", roomUrl: busy, created_at: 20 }),
        web({ id: "also-1", roomUrl: alsoBusy, created_at: 30 }),
        web({ id: "also-2", roomUrl: alsoBusy, created_at: 40 }),
      ]),
    ).toEqual([
      { roomUrl: alsoBusy, commentCount: 2, lastActivityAt: 40 },
      { roomUrl: busy, commentCount: 2, lastActivityAt: 20 },
      { roomUrl: quiet, commentCount: 1, lastActivityAt: 50 },
    ])
  })
})
