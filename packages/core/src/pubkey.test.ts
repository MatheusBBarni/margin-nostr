import { describe, expect, test } from "bun:test"
import { parsePubkeyInput } from "./pubkey"

const hex = "9036cbb6452f8b5002b3c01ea5ea46449e5865964f178aaad7058aa0ca95e5ab"
const npub = "npub1jqmvhdj99794qq4ncq02t6jxgj09sevkfutc42khqk92pj54uk4s9vkz3c"

describe("parsePubkeyInput", () => {
  test("accepts hex and npub1 and rejects junk", () => {
    expect(parsePubkeyInput(hex)).toBe(hex)
    expect(parsePubkeyInput(hex.toUpperCase())).toBe(hex)
    expect(parsePubkeyInput(`  ${hex}  `)).toBe(hex)
    expect(parsePubkeyInput(npub)).toBe(hex)
    expect(parsePubkeyInput("nope")).toBeNull()
    expect(parsePubkeyInput("note1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq5syj0")).toBeNull()
    expect(parsePubkeyInput("")).toBeNull()
  })
})
