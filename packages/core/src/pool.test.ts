import { describe, expect, test } from "bun:test"
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure"
import { KIND_COMMENT } from "./events"
import { publishRoom, subscribeRoom, type PoolLike } from "./pool"

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
    const capturedFilters: object[] = []
    let closed = 0

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
      subscribeMany(_relays, filter, opts) {
        capturedFilters.push(filter)
        if (capturedFilters.length === 1) {
          opts.onevent(good)
          opts.onevent(good)
          opts.onevent({ ...good, sig: "00".repeat(64) })
          opts.onevent(otherRoom)
        }
        return {
          close() {
            closed += 1
          },
        }
      },
      publish: () => [],
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
    expect(closed).toBe(2)
  })

  test("publishRoom reports per-relay ok and failed", async () => {
    const signed = sign([
      ["I", ROOM],
      ["K", "web"],
      ["i", ROOM],
      ["k", "web"],
    ])
    const pool: PoolLike = {
      subscribeMany() {
        return { close() {} }
      },
      publish(relays) {
        return relays.map((relay) =>
          relay.includes("ok") ? Promise.resolve() : Promise.reject(new Error("no")),
        )
      },
    }
    const result = await publishRoom(pool, ["wss://ok.example", "wss://bad.example"], signed)
    expect(result.ok).toEqual(["wss://ok.example"])
    expect(result.failed).toEqual(["wss://bad.example"])
  })
})
