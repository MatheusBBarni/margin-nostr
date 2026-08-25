import { describe, expect, test } from "bun:test"
import { badgeState, countFollowsHits } from "./badge"

const follow = "aa".repeat(32)
const self = "bb".repeat(32)
const stranger = "cc".repeat(32)
const mutedFollow = "dd".repeat(32)

describe("countFollowsHits", () => {
  test("counts comments by follows or self and skips mutes", () => {
    expect(
      countFollowsHits(
        [
          { pubkey: follow },
          { pubkey: self },
          { pubkey: stranger },
          { pubkey: mutedFollow },
          { pubkey: follow.toUpperCase() },
        ],
        {
          follows: new Set([follow]),
          self,
          muted: new Set([mutedFollow]),
        },
      ),
    ).toBe(3)
  })
})

describe("badgeState", () => {
  test("paints a capped count, a quiet dot, or a clear badge", () => {
    expect(badgeState(3, 10)).toEqual({ text: "3", background: "#1863dc" })
    expect(badgeState(120, 10)).toEqual({ text: "99", background: "#1863dc" })
    expect(badgeState(0, 4)).toEqual({ text: "•", background: "#93939f" })
    expect(badgeState(0, 0)).toEqual({ text: "" })
  })
})
