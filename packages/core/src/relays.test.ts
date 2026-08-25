import { describe, expect, test } from "bun:test"
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure"
import { CURATED_RELAYS, fetchNip65, parseNip65, readRelays, writeRelays } from "./relays"

const sk = generateSecretKey()
const self = getPublicKey(sk)

function relayList(created_at: number, tags: string[][]) {
  return finalizeEvent({ kind: 10002, created_at, content: "", tags }, sk)
}

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

describe("fetchNip65", () => {
  test("returns parsed lists from the newest kind 10002, or null if none", async () => {
    const older = relayList(10, [["r", "wss://old.example"]])
    const newer = relayList(20, [
      ["r", "wss://read.example", "read"],
      ["r", "wss://write.example", "write"],
    ])
    const pool = {
      async querySync() {
        return [older, newer]
      },
    }
    expect(await fetchNip65(pool, ["wss://relay.example"], self)).toEqual({
      read: ["wss://read.example"],
      write: ["wss://write.example"],
    })
    expect(
      await fetchNip65(
        {
          async querySync() {
            return []
          },
        },
        ["wss://relay.example"],
        self,
      ),
    ).toBeNull()
  })
})
