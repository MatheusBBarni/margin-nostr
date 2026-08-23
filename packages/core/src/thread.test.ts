import { describe, expect, test } from "bun:test"
import type { VerifiedComment } from "./events"
import { nest } from "./thread"

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
