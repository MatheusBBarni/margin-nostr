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

export type FilterMode = "follows" | "everyone"

export function defaultFilterMode(follows: string[], stored?: FilterMode | null): FilterMode {
  if (follows.length === 0) return "everyone"
  return stored === "everyone" ? "everyone" : "follows"
}

export type FilterOptions = {
  mode: FilterMode
  follows: Set<string>
  muted: Set<string>
  self?: string
}

function dropMuted(nodes: ThreadNode[], muted: Set<string>): ThreadNode[] {
  return nodes.flatMap((node) => {
    if (muted.has(node.comment.pubkey)) return []
    return [{ ...node, children: dropMuted(node.children, muted) }]
  })
}

function subtreeHasFollow(node: ThreadNode, allowed: Set<string>): boolean {
  if (allowed.has(node.comment.pubkey)) return true
  return node.children.some((child) => subtreeHasFollow(child, allowed))
}

export function applyFilter(nodes: ThreadNode[], options: FilterOptions): ThreadNode[] {
  const visible = dropMuted(nodes, options.muted)
  if (options.mode === "everyone") return visible
  const allowed = new Set(options.follows)
  if (options.self) allowed.add(options.self)
  return visible.filter((node) => subtreeHasFollow(node, allowed))
}
