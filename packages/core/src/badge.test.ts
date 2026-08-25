import { describe, expect, test } from "bun:test"
import { countFollowsHits } from "./badge"

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
