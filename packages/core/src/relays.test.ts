import { describe, expect, test } from "bun:test"
import { CURATED_RELAYS, parseNip65, readRelays, writeRelays } from "./relays"

describe("parseNip65", () => {
  test("honors missing, read, and write markers", () => {
    expect(
      parseNip65({
        tags: [
          ["r", "wss://both.example/"],
          ["r", "wss://read.example", "read"],
          ["r", "wss://write.example", "write"],
          ["r", "https://not-a-relay.example"],
        ],
      }),
    ).toEqual({
      read: ["wss://both.example", "wss://read.example"],
      write: ["wss://both.example", "wss://write.example"],
    })
  })
})

describe("readRelays / writeRelays", () => {
  test("always include every curated relay", () => {
    expect(readRelays()).toEqual([...CURATED_RELAYS])
    expect(writeRelays()).toEqual([...CURATED_RELAYS])

    const user65 = {
      read: ["wss://inbox.example"],
      write: ["wss://outbox.example"],
    }
    for (const url of CURATED_RELAYS) {
      expect(readRelays(user65)).toContain(url)
      expect(writeRelays(user65)).toContain(url)
    }
    expect(readRelays(user65)).toContain("wss://inbox.example")
    expect(readRelays(user65)).toContain("wss://outbox.example")
    expect(writeRelays(user65)).toContain("wss://outbox.example")
    expect(writeRelays(user65)).not.toContain("wss://inbox.example")
  })
})
