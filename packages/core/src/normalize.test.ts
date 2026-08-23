import { describe, expect, test } from "bun:test"
import fixtures from "./normalize.fixtures.json"
import { NormalizeError, normalizeUrl } from "./normalize"

describe("normalizeUrl", () => {
  test("maps a tracking-heavy URL to the locked room id", () => {
    const pair = fixtures[0]
    expect(pair).toBeDefined()
    expect(normalizeUrl(pair.in)).toBe(pair.out)
  })

  test("rejects non-http(s) and unparseable input", () => {
    expect(() => normalizeUrl("not a url")).toThrow(NormalizeError)
    expect(() => normalizeUrl("ftp://example.com/x")).toThrow(NormalizeError)
    expect(() => normalizeUrl("javascript:alert(1)")).toThrow(NormalizeError)
  })
})
