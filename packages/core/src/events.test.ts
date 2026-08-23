import { describe, expect, test } from "bun:test"
import { buildReply, buildTopLevel } from "./events"

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

describe("buildReply", () => {
  test("builds I/K + e + k=1111 + p and no E/P on a URL root", () => {
    const parent = {
      id: "aa".repeat(32),
      pubkey: "bb".repeat(32),
    }
    const event = buildReply("https://example.com/x", "  a reply  ", parent)
    expect(event.kind).toBe(1111)
    expect(event.content).toBe("a reply")
    expect(event.tags).toEqual([
      ["I", "https://example.com/x"],
      ["K", "web"],
      ["e", parent.id, "", parent.pubkey],
      ["k", "1111"],
      ["p", parent.pubkey, ""],
    ])
    expect(event.tags.some((tag) => tag[0] === "E" || tag[0] === "P")).toBe(false)
  })
})

describe("comment content", () => {
  test("rejects empty and overlong content", () => {
    const parent = { id: "aa".repeat(32), pubkey: "bb".repeat(32) }
    expect(() => buildTopLevel("https://example.com/x", "   ")).toThrow()
    expect(() => buildTopLevel("https://example.com/x", "a".repeat(4001))).toThrow()
    expect(() => buildReply("https://example.com/x", "", parent)).toThrow()
  })
})
