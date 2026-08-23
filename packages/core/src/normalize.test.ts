import { describe, expect, test } from "bun:test"
import fixtures from "./normalize.fixtures.json"
import { normalizeUrl } from "./normalize"

describe("normalizeUrl", () => {
  test("maps a tracking-heavy URL to the locked room id", () => {
    const pair = fixtures[0]
    expect(pair).toBeDefined()
    expect(normalizeUrl(pair.in)).toBe(pair.out)
  })
})
