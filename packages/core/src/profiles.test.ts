import { beforeEach, describe, expect, test } from "bun:test"
import type { Kv } from "./kv"
import {
  clearProfileCache,
  fetchProfiles,
  hydrateSelfProfile,
  parseProfile,
  parseStoredSelfProfile,
  persistSelfProfile,
} from "./profiles"

const alice = "aa".repeat(32)
const bob = "bb".repeat(32)

function memoryKv(initial: Record<string, unknown> = {}): Kv & { store: Map<string, unknown> } {
  const store = new Map(Object.entries(initial))
  return {
    store,
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

beforeEach(() => {
  clearProfileCache()
})

describe("parseProfile", () => {
  test("reads name, display_name, and https picture from kind 0", () => {
    expect(
      parseProfile({
        pubkey: "aa".repeat(32),
        kind: 0,
        created_at: 10,
        content: JSON.stringify({
          name: "alice",
          display_name: "Alice",
          picture: "https://example.com/a.png",
          about: "ignore",
        }),
      }),
    ).toEqual({
      name: "alice",
      display_name: "Alice",
      picture: "https://example.com/a.png",
    })
  })

  test("drops invalid json, wrong kind, and non-http pictures", () => {
    expect(parseProfile({ pubkey: "p", kind: 1, created_at: 1, content: "{}" })).toBeNull()
    expect(parseProfile({ pubkey: "p", kind: 0, created_at: 1, content: "not-json" })).toBeNull()
    expect(
      parseProfile({
        pubkey: "p",
        kind: 0,
        created_at: 1,
        content: JSON.stringify({ picture: "javascript:alert(1)" }),
      }),
    ).toEqual({})
  })
})

describe("fetchProfiles", () => {
  test("keeps the newest kind 0 per pubkey", async () => {
    const profiles = await fetchProfiles(
      {
        async querySync() {
          return [
            {
              pubkey: "aa".repeat(32),
              kind: 0,
              created_at: 1,
              content: JSON.stringify({ name: "old" }),
            },
            {
              pubkey: "aa".repeat(32),
              kind: 0,
              created_at: 5,
              content: JSON.stringify({ name: "new", display_name: "New" }),
            },
            {
              pubkey: "bb".repeat(32),
              kind: 0,
              created_at: 3,
              content: JSON.stringify({ name: "bob" }),
            },
          ]
        },
      },
      ["wss://relay.example"],
      ["aa".repeat(32), "bb".repeat(32)],
    )

    expect(profiles.get(alice)).toEqual({ name: "new", display_name: "New" })
    expect(profiles.get(bob)).toEqual({ name: "bob" })
  })
})

describe("stored self profile", () => {
  test("parseStoredSelfProfile keeps name, display_name, and http picture", () => {
    expect(
      parseStoredSelfProfile({
        pubkey: alice,
        created_at: 9,
        profile: {
          name: "alice",
          display_name: "Alice",
          picture: "https://example.com/a.png",
        },
      }),
    ).toEqual({
      pubkey: alice,
      created_at: 9,
      profile: {
        name: "alice",
        display_name: "Alice",
        picture: "https://example.com/a.png",
      },
    })
  })

  test("parseStoredSelfProfile drops junk and non-http pictures", () => {
    expect(parseStoredSelfProfile(null)).toBeNull()
    expect(parseStoredSelfProfile({ pubkey: "nope", created_at: 1, profile: {} })).toBeNull()
    expect(
      parseStoredSelfProfile({
        pubkey: alice,
        created_at: 1,
        profile: { picture: "javascript:alert(1)" },
      }),
    ).toEqual({ pubkey: alice, created_at: 1, profile: {} })
  })

  test("hydrateSelfProfile seeds cache so fetchProfiles does not query that pubkey", async () => {
    const kv = memoryKv({
      selfProfile: {
        pubkey: alice,
        created_at: 4,
        profile: { name: "alice", picture: "https://example.com/a.png" },
      },
    })
    let queried = 0
    const hydrated = await hydrateSelfProfile(kv, alice)
    expect(hydrated).toEqual({ name: "alice", picture: "https://example.com/a.png" })

    const profiles = await fetchProfiles(
      {
        async querySync() {
          queried += 1
          return []
        },
      },
      ["wss://relay.example"],
      [alice],
    )

    expect(queried).toBe(0)
    expect(profiles.get(alice)).toEqual({ name: "alice", picture: "https://example.com/a.png" })
  })

  test("hydrateSelfProfile ignores a profile stored for someone else", async () => {
    const kv = memoryKv({
      selfProfile: { pubkey: bob, created_at: 1, profile: { name: "bob" } },
    })
    expect(await hydrateSelfProfile(kv, alice)).toBeNull()
  })

  test("persistSelfProfile writes the cached self profile", async () => {
    const kv = memoryKv()
    await fetchProfiles(
      {
        async querySync() {
          return [
            {
              pubkey: alice,
              kind: 0,
              created_at: 7,
              content: JSON.stringify({ name: "alice", display_name: "Alice" }),
            },
          ]
        },
      },
      ["wss://relay.example"],
      [alice],
    )
    await persistSelfProfile(kv, alice)
    expect(kv.store.get("selfProfile")).toEqual({
      pubkey: alice,
      created_at: 7,
      profile: { name: "alice", display_name: "Alice" },
    })
  })
})
