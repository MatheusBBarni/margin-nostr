import { describe, expect, test } from "bun:test"
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure"
import { ROOM_EVENT_CAP } from "./thread"
import { collectOwnWebComments } from "./ownComments"

const ROOM = "https://example.com/x"
const selfSk = generateSecretKey()
const self = getPublicKey(selfSk)
const otherSk = generateSecretKey()

function sign(
  sk: Uint8Array,
  partial: {
    created_at?: number
    content?: string
    tags?: string[][]
  } = {},
) {
  return finalizeEvent(
    {
      kind: 1111,
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

describe("collectOwnWebComments", () => {
  test("keeps only self, dedups by id, newest first, and drops oldest past the cap", () => {
    const oldest = sign(selfSk, { created_at: 10, content: "oldest" })
    const middle = sign(selfSk, { created_at: 20, content: "middle" })
    const newest = sign(selfSk, { created_at: 30, content: "newest" })
    const stranger = sign(otherSk, { created_at: 40, content: "stranger" })

    const mixed = collectOwnWebComments([oldest, newest, newest, stranger, middle], self)
    expect(mixed.map((comment) => comment.content)).toEqual(["newest", "middle", "oldest"])
    expect(mixed.every((comment) => comment.pubkey === self)).toBe(true)

    const many = Array.from({ length: ROOM_EVENT_CAP + 1 }, (_, index) =>
      sign(selfSk, { created_at: index, content: `n${index}` }),
    )
    const capped = collectOwnWebComments(many, self)
    expect(capped).toHaveLength(ROOM_EVENT_CAP)
    expect(capped[0]?.content).toBe(`n${ROOM_EVENT_CAP}`)
    expect(capped.some((comment) => comment.content === "n0")).toBe(false)
  })
})
