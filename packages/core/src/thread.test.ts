import { describe, expect, test } from "bun:test"
import type { VerifiedComment } from "./events"
import { applyFilter, defaultFilterMode, nest } from "./thread"

function comment(partial: {
  id: string
  pubkey?: string
  created_at: number
  parentId?: string
  content?: string
}): VerifiedComment {
  return {
    id: partial.id,
    pubkey: partial.pubkey ?? "pk",
    kind: 1111,
    created_at: partial.created_at,
    content: partial.content ?? partial.id,
    tags: [],
    sig: "sig",
    parentId: partial.parentId,
  }
}

describe("nest", () => {
  test("attaches replies, keeps orphans, sorts siblings, drops oldest beyond 200", () => {
    const parent = comment({ id: "root", created_at: 20 })
    const late = comment({ id: "late", created_at: 30, parentId: "root" })
    const early = comment({ id: "early", created_at: 10, parentId: "root" })
    const orphan = comment({ id: "orphan", created_at: 15, parentId: "missing" })

    const { roots, orphans } = nest([late, parent, orphan, early])

    expect(roots.map((node) => node.comment.id)).toEqual(["orphan", "root"])
    expect(orphans.map((node) => node.comment.id)).toEqual(["orphan"])
    expect(orphans[0]?.parentMissing).toBe(true)

    const nested = roots.find((node) => node.comment.id === "root")
    expect(nested?.children.map((node) => node.comment.id)).toEqual(["early", "late"])

    const many = Array.from({ length: 201 }, (_, index) =>
      comment({ id: `n${index}`, created_at: index }),
    )
    const capped = nest(many)
    const ids = new Set(capped.roots.map((node) => node.comment.id))
    expect(ids.size).toBe(200)
    expect(ids.has("n0")).toBe(false)
    expect(ids.has("n200")).toBe(true)
  })
})

describe("applyFilter", () => {
  test("mute drops a subtree; follows keeps a stranger root if a descendant is a follow", () => {
    const stranger = comment({ id: "stranger", pubkey: "s", created_at: 1 })
    const followReply = comment({
      id: "follow-reply",
      pubkey: "f",
      created_at: 2,
      parentId: "stranger",
    })
    const muted = comment({ id: "muted", pubkey: "m", created_at: 3 })
    const mutedChild = comment({
      id: "muted-child",
      pubkey: "f",
      created_at: 4,
      parentId: "muted",
    })
    const { roots } = nest([stranger, followReply, muted, mutedChild])

    const everyone = applyFilter(roots, {
      mode: "everyone",
      follows: new Set(["f"]),
      muted: new Set(["m"]),
    })
    expect(everyone.map((node) => node.comment.id)).toEqual(["stranger"])
    expect(everyone[0]?.children.map((node) => node.comment.id)).toEqual(["follow-reply"])

    const follows = applyFilter(roots, {
      mode: "follows",
      follows: new Set(["f"]),
      muted: new Set(["m"]),
      self: "me",
    })
    expect(follows.map((node) => node.comment.id)).toEqual(["stranger"])
    expect(follows[0]?.children.map((node) => node.comment.id)).toEqual(["follow-reply"])

    const selfOnly = applyFilter(roots, {
      mode: "follows",
      follows: new Set(),
      muted: new Set(),
      self: "s",
    })
    expect(selfOnly.map((node) => node.comment.id)).toEqual(["stranger"])
  })
})

describe("defaultFilterMode", () => {
  test("uses follows when the list is non-empty, otherwise everyone", () => {
    expect(defaultFilterMode(["aa".repeat(32)])).toBe("follows")
    expect(defaultFilterMode([])).toBe("everyone")
  })
})
