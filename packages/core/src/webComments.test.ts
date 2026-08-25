import { describe, expect, test } from "bun:test"
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure"
import { rankRooms } from "./rooms"
import { ROOM_EVENT_CAP } from "./thread"
import { collectRecentWebComments } from "./webComments"

const ROOM = "https://example.com/x"

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

  test("counts a NIP-22 reply toward the same room as a top-level", () => {
    const alice = generateSecretKey()
    const top = sign(alice, { created_at: 10, content: "top" })
    const parentId = top.id
    const parentPubkey = top.pubkey
    const reply = sign(alice, {
      created_at: 20,
      content: "reply",
      tags: [
        ["I", ROOM],
        ["K", "web"],
        ["e", parentId, "", parentPubkey],
        ["k", "1111"],
        ["p", parentPubkey, ""],
      ],
    })

    const comments = collectRecentWebComments([top, reply])
    expect(comments).toHaveLength(2)
    expect(comments.some((comment) => comment.parentId === parentId)).toBe(true)
    expect(rankRooms(comments)).toEqual([
      { roomUrl: ROOM, commentCount: 2, lastActivityAt: 20 },
    ])
  })
})
