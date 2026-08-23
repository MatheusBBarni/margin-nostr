import { describe, expect, test } from "bun:test"
import { buildTopLevel } from "./events"

describe("buildTopLevel", () => {
  test("builds a kind 1111 with I/K=web/i/k=web and trimmed content", () => {
    const event = buildTopLevel("https://example.com/a/b?id=1", "  Nice article!  ")
    expect(event.kind).toBe(1111)
    expect(event.content).toBe("Nice article!")
    expect(event.tags).toEqual([
      ["I", "https://example.com/a/b?id=1"],
      ["K", "web"],
      ["i", "https://example.com/a/b?id=1"],
      ["k", "web"],
    ])
    expect(event.created_at).toBeGreaterThan(1_700_000_000)
  })
})
