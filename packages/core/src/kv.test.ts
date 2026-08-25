import { describe, expect, test } from "bun:test"
import { parseStoredSigner } from "./kv"

describe("parseStoredSigner", () => {
  test("accepts bunker with pointer and client key and rejects missing clientSkHex", () => {
    const clientSkHex = "ab".repeat(32)
    expect(
      parseStoredSigner({
        method: "bunker",
        bunkerPointer: "bunker://abc",
        clientSkHex,
      }),
    ).toEqual({
      method: "bunker",
      bunkerPointer: "bunker://abc",
      clientSkHex,
    })
    expect(
      parseStoredSigner({
        method: "bunker",
        bunkerPointer: "bunker://abc",
      }),
    ).toBeNull()
  })
})
