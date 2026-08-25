import { describe, expect, test } from "bun:test"
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure"
import { KIND_COMMENT } from "./events"
import {
  fetchOwnComments,
  fetchRecentWebComments,
  publishRoom,
  subscribeOwnComments,
  subscribeRecentWebComments,
  subscribeRoom,
  type PoolLike,
} from "./pool"

const ROOM = "https://example.com/x"
const sk = generateSecretKey()

function sign(tags: string[][], content = "hi", key = sk) {
  return finalizeEvent(
    {
      kind: KIND_COMMENT,
      created_at: 1_700_000_000,
      content,
      tags,
    },
    key,
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

describe("subscribeOwnComments", () => {
  test("uses authors filter and ignores junk, other pubkeys, and dupes", () => {
    const self = getPublicKey(sk)
    const other = sign(
      [
        ["I", ROOM],
        ["K", "web"],
        ["i", ROOM],
        ["k", "web"],
      ],
      "nope",
      generateSecretKey(),
    )
    const good = sign([
      ["I", ROOM],
      ["K", "web"],
      ["i", ROOM],
      ["k", "web"],
    ])
    const seen: string[] = []
    const capturedFilters: object[] = []
    let closed = 0

    const pool: PoolLike = {
      subscribeMany(_relays, filter, opts) {
        capturedFilters.push(filter)
        opts.onevent(good)
        opts.onevent(good)
        opts.onevent({ ...good, sig: "00".repeat(64) })
        opts.onevent(other)
        return {
          close() {
            closed += 1
          },
        }
      },
      publish: () => [],
    }

    const sub = subscribeOwnComments(pool, ["wss://relay.example"], self, {
      onevent(comment) {
        seen.push(comment.id)
      },
    })
    sub.close()

    expect(seen).toEqual([good.id])
    expect(capturedFilters).toEqual([{ kinds: [1111], authors: [self] }])
    expect(closed).toBe(1)
  })
})

describe("fetchOwnComments", () => {
  test("querySyncs authors filter with limit 200 and returns collected own comments", async () => {
    const self = getPublicKey(sk)
    const good = sign([
      ["I", ROOM],
      ["K", "web"],
      ["i", ROOM],
      ["k", "web"],
    ])
    const other = sign(
      [
        ["I", ROOM],
        ["K", "web"],
        ["i", ROOM],
        ["k", "web"],
      ],
      "nope",
      generateSecretKey(),
    )
    let captured: object | undefined

    const comments = await fetchOwnComments(
      {
        async querySync(_relays, filter) {
          captured = filter
          return [other, good, good, { ...good, sig: "00".repeat(64) }]
        },
      },
      ["wss://relay.example"],
      self,
    )

    expect(captured).toEqual({ kinds: [1111], authors: [self], limit: 200 })
    expect(comments.map((comment) => comment.id)).toEqual([good.id])
    expect(comments[0]?.roomUrl).toBe(ROOM)
  })
})

describe("subscribeRecentWebComments", () => {
  test("uses a kind 1111 window and ignores junk and dupes", () => {
    const good = sign([
      ["I", ROOM],
      ["K", "web"],
      ["i", ROOM],
      ["k", "web"],
    ])
    const other = sign(
      [
        ["I", ROOM],
        ["K", "web"],
        ["i", ROOM],
        ["k", "web"],
      ],
      "also",
      generateSecretKey(),
    )
    const nonWeb = sign([
      ["I", ROOM],
      ["i", ROOM],
    ])
    const seen: string[] = []
    const capturedFilters: object[] = []
    let closed = 0

    const pool: PoolLike = {
      subscribeMany(_relays, filter, opts) {
        capturedFilters.push(filter)
        opts.onevent(good)
        opts.onevent(good)
        opts.onevent({ ...good, sig: "00".repeat(64) })
        opts.onevent(nonWeb)
        opts.onevent(other)
        return {
          close() {
            closed += 1
          },
        }
      },
      publish: () => [],
    }

    const sub = subscribeRecentWebComments(pool, ["wss://relay.example"], {
      onevent(comment) {
        seen.push(comment.id)
      },
    })
    sub.close()

    expect(seen).toEqual([good.id, other.id])
    expect(capturedFilters).toEqual([{ kinds: [1111], limit: 200 }])
    expect(closed).toBe(1)
  })
})

describe("fetchRecentWebComments", () => {
  test("querySyncs kind 1111 with limit 200 and returns collected comments", async () => {
    const good = sign([
      ["I", ROOM],
      ["K", "web"],
      ["i", ROOM],
      ["k", "web"],
    ])
    const other = sign(
      [
        ["I", ROOM],
        ["K", "web"],
        ["i", ROOM],
        ["k", "web"],
      ],
      "also",
      generateSecretKey(),
    )
    const nonWeb = sign([
      ["I", ROOM],
      ["i", ROOM],
    ])
    let captured: object | undefined

    const comments = await fetchRecentWebComments(
      {
        async querySync(_relays, filter) {
          captured = filter
          return [nonWeb, good, good, { ...good, sig: "00".repeat(64) }, other]
        },
      },
      ["wss://relay.example"],
    )

    expect(captured).toEqual({ kinds: [1111], limit: 200 })
    expect(comments.map((comment) => comment.id)).toEqual([good.id, other.id])
    expect(comments[0]?.roomUrl).toBe(ROOM)
  })
})
