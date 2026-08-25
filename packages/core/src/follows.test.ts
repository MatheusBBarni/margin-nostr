import { describe, expect, test } from "bun:test"
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure"
import { fetchFollows, hydrateFollows, parseFollows } from "./follows"
import { KV_KEYS, type Kv } from "./kv"

function memoryKv(initial: Record<string, unknown> = {}): Kv {
  const store = new Map(Object.entries(initial))
  return {
    async get<T>(key: string) {
      return store.get(key) as T | undefined
    },
    async set<T>(key: string, value: T) {
      store.set(key, value)
    },
    async delete(key: string) {
      store.delete(key)
    },
  }
}

const alice = "aa".repeat(32)
const bob = "BB".repeat(32)
const sk = generateSecretKey()
const self = getPublicKey(sk)

function contactList(created_at: number, tags: string[][]) {
  return finalizeEvent({ kind: 3, created_at, content: "", tags }, sk)
}

describe("parseFollows", () => {
  test("keeps 64-hex p tags and drops junk or the wrong kind", () => {
    expect(
      parseFollows({
        kind: 3,
        tags: [
          ["p", alice],
          ["p", bob],
          ["p", alice],
          ["p", "not-a-pubkey"],
          ["p", "abc"],
          ["p"],
          ["e", alice],
        ],
      }),
    ).toEqual([alice, bob.toLowerCase()])

    expect(
      parseFollows({
        kind: 0,
        tags: [["p", alice]],
      }),
    ).toEqual([])
  })
})

describe("fetchFollows", () => {
  test("returns p tags from the newest kind 3 only", async () => {
    const older = contactList(10, [["p", alice]])
    const newer = contactList(20, [["p", bob]])
    const ids = await fetchFollows(
      {
        async querySync() {
          return [older, newer]
        },
      },
      ["wss://relay.example"],
      self,
    )
    expect(ids).toEqual([bob.toLowerCase()])
  })
})

describe("hydrateFollows", () => {
  test("returns cached ids for the same pubkey and ignores another pubkey or garbage", async () => {
    const cached = {
      pubkey: alice,
      ids: [bob.toLowerCase()],
      fetchedAt: 100,
    }
    const hit = memoryKv({ [KV_KEYS.followsCache]: cached })
    expect(await hydrateFollows(hit, alice)).toEqual([bob.toLowerCase()])
    expect(await hydrateFollows(hit, "cc".repeat(32))).toBeNull()
    expect(await hydrateFollows(memoryKv({ [KV_KEYS.followsCache]: { nope: true } }), alice)).toBeNull()
    expect(await hydrateFollows(memoryKv(), alice)).toBeNull()
  })
})
