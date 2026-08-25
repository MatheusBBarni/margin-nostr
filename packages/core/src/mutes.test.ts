import { describe, expect, test } from "bun:test"
import { addMute, parseMutes, removeMute } from "./mutes"

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
