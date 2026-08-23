import type { VerifiedComment } from "./events"

export const ROOM_EVENT_CAP = 200

export type ThreadNode = {
  comment: VerifiedComment
  children: ThreadNode[]
  parentMissing?: boolean
}

export function nest(comments: VerifiedComment[]): { roots: ThreadNode[]; orphans: ThreadNode[] } {
  const newest = [...comments].sort((a, b) => b.created_at - a.created_at).slice(0, ROOM_EVENT_CAP)
  const byId = new Map(newest.map((comment) => [comment.id, comment]))

  const nodes = new Map<string, ThreadNode>()
  for (const comment of newest) {
    nodes.set(comment.id, { comment, children: [] })
  }

  const roots: ThreadNode[] = []
  const orphans: ThreadNode[] = []

  for (const comment of newest) {
    const node = nodes.get(comment.id)
    if (!node) continue
    const parentId = comment.parentId
    if (!parentId) {
      roots.push(node)
      continue
    }
    const parent = nodes.get(parentId)
    if (parent && byId.has(parentId)) {
      parent.children.push(node)
      continue
    }
    node.parentMissing = true
    orphans.push(node)
    roots.push(node)
  }

  const byCreated = (a: ThreadNode, b: ThreadNode) => a.comment.created_at - b.comment.created_at
  roots.sort(byCreated)
  for (const node of nodes.values()) node.children.sort(byCreated)

  return { roots, orphans }
}
