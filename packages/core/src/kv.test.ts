import { describe, expect, test } from "bun:test"
import { KV_KEYS, clearSessionSigner, parseStoredSigner, type Kv } from "./kv"

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

describe("parseStoredSigner", () => {
  test("accepts bunker with pointer and client key and rejects missing clientSkHex", () => {
    const clientSkHex = "ab".repeat(32)
    expect(
      parseStoredSigner({
        method: "bunker",
        bunkerPointer: "bunker://abc",
        clientSkHex,
      }),
    ).toEqual({
      method: "bunker",
      bunkerPointer: "bunker://abc",
      clientSkHex,
    })
    expect(
      parseStoredSigner({
        method: "bunker",
        bunkerPointer: "bunker://abc",
      }),
    ).toBeNull()
  })
})

describe("clearSessionSigner", () => {
  test("makes signer and selfProfile unreadable", async () => {
    const kv = memoryKv({
      [KV_KEYS.signer]: {
        method: "bunker",
        bunkerPointer: "bunker://abc",
        clientSkHex: "ab".repeat(32),
      },
      [KV_KEYS.selfProfile]: { pubkey: "aa".repeat(32), name: "Ada" },
      [KV_KEYS.mutes]: ["cc".repeat(32)],
    })
    await clearSessionSigner(kv)
    expect(await kv.get(KV_KEYS.signer)).toBeUndefined()
    expect(await kv.get(KV_KEYS.selfProfile)).toBeUndefined()
    expect(await kv.get(KV_KEYS.mutes)).toEqual(["cc".repeat(32)])
  })
})
