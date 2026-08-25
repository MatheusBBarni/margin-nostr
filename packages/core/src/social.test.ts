import { describe, expect, test } from "bun:test"
import { badgeHits, badgeSocial } from "./social"

const alice = "aa".repeat(32)
const bob = "bb".repeat(32)

describe("badgeSocial / badgeHits", () => {
  test("anonymous social never counts follows hits", () => {
    const social = badgeSocial(undefined, undefined, [bob])
    expect(social.mode).toBe("anonymous")
    expect(
      badgeHits([{ pubkey: alice }, { pubkey: bob }], social),
    ).toEqual({ followsHits: 0, everyoneHits: 2 })
  })

  test("follows cache counts self and follows, not mutes", () => {
    const social = badgeSocial(
      { method: "nip07" },
      { pubkey: alice, ids: [bob], fetchedAt: 1 },
      [bob],
    )
    expect(social).toEqual({
      mode: "follows",
      follows: new Set([bob]),
      self: alice,
      muted: new Set([bob]),
    })
    expect(
      badgeHits([{ pubkey: alice }, { pubkey: bob }, { pubkey: "cc".repeat(32) }], social),
    ).toEqual({ followsHits: 1, everyoneHits: 3 })
  })
})
