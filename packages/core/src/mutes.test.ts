import { describe, expect, test } from "bun:test"
import { KV_KEYS, type Kv } from "./kv"
import { addMute, hydrateMutes, parseMutes, persistMutes, removeMute } from "./mutes"

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

describe("parseMutes / addMute / removeMute", () => {
  test("keeps unique lowercased 64-hex pubkeys and drops junk", () => {
    expect(parseMutes([alice, bob, alice, "nope", 1, null])).toEqual([alice, bob.toLowerCase()])
    expect(parseMutes("bad")).toEqual([])

    expect(addMute([alice], bob)).toEqual([alice, bob.toLowerCase()])
    expect(addMute([alice], alice)).toEqual([alice])
    expect(addMute([alice], "nope")).toEqual([alice])

    expect(removeMute([alice, bob.toLowerCase()], alice)).toEqual([bob.toLowerCase()])
    expect(removeMute([alice], "cc".repeat(32))).toEqual([alice])
  })
})

describe("hydrateMutes / persistMutes", () => {
  test("round-trips the mute list through Kv", async () => {
    const kv = memoryKv()
    await persistMutes(kv, [alice, bob, "nope"])
    expect(await hydrateMutes(kv)).toEqual([alice, bob.toLowerCase()])
    expect(await hydrateMutes(memoryKv({ [KV_KEYS.mutes]: "bad" }))).toEqual([])
  })
})
