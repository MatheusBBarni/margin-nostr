import { describe, expect, test } from "bun:test"
import { parseFollows } from "./follows"

const alice = "aa".repeat(32)
const bob = "BB".repeat(32)

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
