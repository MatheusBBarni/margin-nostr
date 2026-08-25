import { describe, expect, test } from "bun:test"
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure"
import { buildReply, buildTopLevel, parseComment, parseWebComment } from "./events"

const ROOM = "https://example.com/x"
const sk = generateSecretKey()

function sign(partial: {
  kind?: number
  content?: string
  tags?: string[][]
}) {
  return finalizeEvent(
    {
      kind: partial.kind ?? 1111,
      created_at: 1_700_000_000,
      content: partial.content ?? "Nice article!",
      tags: partial.tags ?? [
        ["I", ROOM],
        ["K", "web"],
        ["i", ROOM],
        ["k", "web"],
      ],
    },
    sk,
  )
}

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

describe("parseComment", () => {
  test("accepts a valid signed room event and drops invalid ones", () => {
    const good = sign({})
    const parsed = parseComment(good, ROOM)
    expect(parsed).not.toBeNull()
    expect(parsed?.id).toBe(good.id)
    expect(parsed?.content).toBe("Nice article!")
    expect(parsed?.parentId).toBeUndefined()

    const badSig = { ...good, sig: "00".repeat(64) }
    expect(parseComment(badSig, ROOM)).toBeNull()
    expect(parseComment(sign({ kind: 1 }), ROOM)).toBeNull()
    expect(parseComment(sign({}), "https://other.example/x")).toBeNull()
    expect(
      parseComment(
        sign({
          tags: [
            ["I", ROOM],
            ["i", ROOM],
          ],
        }),
        ROOM,
      ),
    ).toBeNull()
  })

  test("classifies a signed reply by e + k=1111", () => {
    const parentId = "aa".repeat(32)
    const parentPubkey = "bb".repeat(32)
    const reply = sign({
      content: "a reply",
      tags: [
        ["I", ROOM],
        ["K", "web"],
        ["e", parentId, "", parentPubkey],
        ["k", "1111"],
        ["p", parentPubkey, ""],
      ],
    })
    const parsed = parseComment(reply, ROOM)
    expect(parsed?.parentId).toBe(parentId)
  })
})

describe("parseWebComment", () => {
  test("returns a WebComment with roomUrl and no parentId for a signed top-level web comment", () => {
    const event = sign({})
    const parsed = parseWebComment(event)
    expect(parsed).not.toBeNull()
    expect(parsed?.id).toBe(event.id)
    expect(parsed?.pubkey).toBe(event.pubkey)
    expect(parsed?.content).toBe("Nice article!")
    expect(parsed?.roomUrl).toBe(ROOM)
    expect(parsed?.parentId).toBeUndefined()
  })
})
