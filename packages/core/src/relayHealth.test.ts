import { describe, expect, test } from "bun:test"
import {
  formatRelayHealth,
  relayHealth,
  relayShortName,
  rememberRelayStatus,
  syncRelayConnections,
} from "./relayHealth"

describe("relayShortName", () => {
  test("uses the distinctive host label", () => {
    expect(relayShortName("wss://relay.damus.io")).toBe("damus")
    expect(relayShortName("wss://nostr.oxtr.dev")).toBe("oxtr")
    expect(relayShortName("wss://nos.lol")).toBe("nos")
    expect(relayShortName("wss://relay.primal.net")).toBe("primal")
    expect(relayShortName("wss://nostr-pub.wellorder.net")).toBe("wellorder")
  })
})

describe("relayHealth", () => {
  test("keeps list order and fills unknown", () => {
    expect(
      relayHealth(
        ["wss://relay.damus.io/", "wss://nos.lol", "wss://nostr.oxtr.dev"],
        new Map([
          ["wss://relay.damus.io/", "connected"],
          ["wss://nostr.oxtr.dev", "failed"],
        ]),
      ),
    ).toEqual([
      { url: "wss://relay.damus.io", status: "connected" },
      { url: "wss://nos.lol", status: "unknown" },
      { url: "wss://nostr.oxtr.dev", status: "failed" },
    ])
  })

  test("drops duplicate urls", () => {
    expect(relayHealth(["wss://nos.lol/", "wss://nos.lol"])).toEqual([
      { url: "wss://nos.lol", status: "unknown" },
    ])
  })
})

describe("rememberRelayStatus / syncRelayConnections", () => {
  test("normalizes trailing slash and skips no-ops", () => {
    const known = new Map<string, "connected" | "failed">()
    expect(rememberRelayStatus(known, "wss://nos.lol/", "connected")).toBe(true)
    expect(known.get("wss://nos.lol")).toBe("connected")
    expect(rememberRelayStatus(known, "wss://nos.lol", "connected")).toBe(false)
  })

  test("demotes dropped connections and keeps prior failures", () => {
    const known = new Map<string, "connected" | "failed">([
      ["wss://nos.lol", "connected"],
      ["wss://nostr.oxtr.dev", "failed"],
    ])
    expect(syncRelayConnections(known, new Map([["wss://relay.primal.net", true]]))).toBe(true)
    expect(known.get("wss://nos.lol")).toBe("failed")
    expect(known.get("wss://nostr.oxtr.dev")).toBe("failed")
    expect(known.get("wss://relay.primal.net")).toBe("connected")
  })
})

describe("formatRelayHealth", () => {
  test("a Regular can tell damus is up and oxtr failed", () => {
    expect(
      formatRelayHealth(
        relayHealth(
          ["wss://relay.damus.io", "wss://nostr.oxtr.dev"],
          new Map([
            ["wss://relay.damus.io", "connected"],
            ["wss://nostr.oxtr.dev", "failed"],
          ]),
        ),
      ),
    ).toBe("damus up, oxtr failed")
  })

  test("all unknown is connecting copy with names", () => {
    expect(formatRelayHealth(relayHealth(["wss://nos.lol", "wss://relay.primal.net"]))).toBe(
      "Connecting to nos, primal",
    )
  })

  test("mixed unknown uses connecting not the empty copy", () => {
    expect(
      formatRelayHealth([
        { url: "wss://nos.lol", status: "connected" },
        { url: "wss://nostr.oxtr.dev", status: "unknown" },
      ]),
    ).toBe("nos up, oxtr connecting")
  })
})
