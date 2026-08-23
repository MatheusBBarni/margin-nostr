import { describe, expect, test } from "bun:test"
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure"
import { KIND_COMMENT } from "./events"
import { subscribeRoom, type PoolLike } from "./pool"

const ROOM = "https://example.com/x"
const sk = generateSecretKey()

function sign(tags: string[][], content = "hi") {
  return finalizeEvent(
    {
      kind: KIND_COMMENT,
      created_at: 1_700_000_000,
      content,
      tags,
    },
    sk,
  )
}

describe("subscribeRoom", () => {
  test("verifies, room-checks, and dedups by id", () => {
    const seen: string[] = []
    let capturedFilters: unknown[] = []
    let closed = false

    const good = sign([
      ["I", ROOM],
      ["K", "web"],
      ["i", ROOM],
      ["k", "web"],
    ])
    const otherRoom = sign([
      ["I", "https://other.example/x"],
      ["K", "web"],
      ["i", "https://other.example/x"],
      ["k", "web"],
    ])

    const pool: PoolLike = {
      subscribeMany(_relays, filters, opts) {
        capturedFilters = filters
        opts.onevent(good)
        opts.onevent(good)
        opts.onevent({ ...good, sig: "00".repeat(64) })
        opts.onevent(otherRoom)
        return {
          close() {
            closed = true
          },
        }
      },
    }

    const sub = subscribeRoom(pool, ["wss://relay.example"], ROOM, {
      onevent(comment) {
        seen.push(comment.id)
      },
    })
    sub.close()

    expect(seen).toEqual([good.id])
    expect(capturedFilters).toEqual([
      { kinds: [1111], "#I": [ROOM], limit: 200 },
      { kinds: [1111], "#i": [ROOM], limit: 200 },
    ])
    expect(closed).toBe(true)
  })
})
