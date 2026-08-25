import { describe, expect, test } from "bun:test"
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure"
import type { WebComment } from "./events"
import { collectRecentWebComments, rankRooms } from "./rooms"
import { ROOM_EVENT_CAP } from "./thread"

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

function sign(
  sk: Uint8Array,
  partial: {
    created_at?: number
    content?: string
    kind?: number
    tags?: string[][]
  } = {},
) {
  return finalizeEvent(
    {
      kind: partial.kind ?? 1111,
      created_at: partial.created_at ?? 1_700_000_000,
      content: partial.content ?? "Nice article!",
      tags: partial.tags ?? [
        ["I", ROOM],
        ["K", "web"],
        ["i", ROOM],
        ["k", "web"],
      ],
    },
    sk,
  )
}

describe("collectRecentWebComments", () => {
  test("drops junk, keeps any pubkey, dedups by id, and keeps the newest 200", () => {
    const alice = generateSecretKey()
    const bob = generateSecretKey()
    const oldest = sign(alice, { created_at: 10, content: "oldest" })
    const middle = sign(bob, { created_at: 20, content: "middle" })
    const newest = sign(alice, { created_at: 30, content: "newest" })
    const badSig = { ...newest, sig: "00".repeat(64) }
    const nonWeb = sign(alice, {
      created_at: 40,
      content: "non-web",
      tags: [
        ["I", ROOM],
        ["i", ROOM],
      ],
    })
    const badPointer = sign(alice, {
      created_at: 50,
      content: "bad pointer",
      tags: [
        ["I", "not-a-url"],
        ["K", "web"],
        ["i", "not-a-url"],
        ["k", "web"],
      ],
    })

    const mixed = collectRecentWebComments([oldest, newest, newest, badSig, nonWeb, badPointer, middle])
    expect(mixed.map((comment) => comment.content)).toEqual(["newest", "middle", "oldest"])

    const many = Array.from({ length: ROOM_EVENT_CAP + 1 }, (_, index) =>
      sign(alice, { created_at: index, content: `n${index}` }),
    )
    const capped = collectRecentWebComments(many)
    expect(capped).toHaveLength(ROOM_EVENT_CAP)
    expect(capped[0]?.content).toBe(`n${ROOM_EVENT_CAP}`)
    expect(capped.some((comment) => comment.content === "n0")).toBe(false)
  })

  test("collapses two raw I/i values that normalize to the same room", () => {
    const alice = generateSecretKey()
    const raw = "http://www.Example.com/a//b/?utm_source=x&id=1#frag"
    const normalized = "https://example.com/a/b?id=1"
    const first = sign(alice, {
      created_at: 10,
      content: "raw",
      tags: [
        ["I", raw],
        ["K", "web"],
        ["i", raw],
        ["k", "web"],
      ],
    })
    const second = sign(alice, {
      created_at: 20,
      content: "normalized",
      tags: [
        ["I", normalized],
        ["K", "web"],
        ["i", normalized],
        ["k", "web"],
      ],
    })

    expect(rankRooms(collectRecentWebComments([first, second]))).toEqual([
      { roomUrl: normalized, commentCount: 2, lastActivityAt: 20 },
    ])
  })
})
