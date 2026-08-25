import { verifyEvent, type Event } from "nostr-tools/pure"
import { normalizeUrl } from "./normalize"

export const KIND_COMMENT = 1111
export const K_WEB = "web"

export type UnsignedComment = {
  kind: 1111
  created_at: number
  content: string
  tags: string[][]
}

export type ReplyParent = {
  id: string
  pubkey: string
}

const MAX_CONTENT = 4000

function prepareContent(content: string): string {
  const trimmed = content.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_CONTENT) {
    throw new Error("invalid comment content")
  }
  return trimmed
}

export function buildTopLevel(normalizedUrl: string, content: string): UnsignedComment {
  return {
    kind: KIND_COMMENT,
    created_at: Math.floor(Date.now() / 1000),
    content: prepareContent(content),
    tags: [
      ["I", normalizedUrl],
      ["K", K_WEB],
      ["i", normalizedUrl],
      ["k", K_WEB],
    ],
  }
}

export function buildReply(
  normalizedUrl: string,
  content: string,
  parent: ReplyParent,
): UnsignedComment {
  return {
    kind: KIND_COMMENT,
    created_at: Math.floor(Date.now() / 1000),
    content: prepareContent(content),
    tags: [
      ["I", normalizedUrl],
      ["K", K_WEB],
      ["e", parent.id, "", parent.pubkey],
      ["k", "1111"],
      ["p", parent.pubkey, ""],
    ],
  }
}

export type VerifiedComment = {
  id: string
  pubkey: string
  kind: 1111
  created_at: number
  content: string
  tags: string[][]
  sig: string
  parentId?: string
}

export type WebComment = VerifiedComment & { roomUrl: string }

function pointerMatchesRoom(value: string, roomUrl: string): boolean {
  try {
    return normalizeUrl(value) === roomUrl
  } catch {
    return value === roomUrl
  }
}

function firstNormalizablePointer(event: Event): string | null {
  for (const tag of event.tags) {
    if ((tag[0] !== "I" && tag[0] !== "i") || !tag[1]) continue
    try {
      return normalizeUrl(tag[1])
    } catch {
      continue
    }
  }
  return null
}

export function parseWebComment(event: Event): WebComment | null {
  const roomUrl = firstNormalizablePointer(event)
  if (!roomUrl) return null
  const parsed = parseComment(event, roomUrl)
  if (!parsed) return null
  return { ...parsed, roomUrl }
}

export function parseComment(event: Event, roomUrl: string): VerifiedComment | null {
  const candidate: Event = {
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: event.tags,
    content: event.content,
    sig: event.sig,
  }
  if (!verifyEvent(candidate)) return null
  if (candidate.kind !== KIND_COMMENT) return null

  const pointers = event.tags
    .filter((tag) => (tag[0] === "I" || tag[0] === "i") && tag[1])
    .map((tag) => tag[1])
  if (!pointers.some((value) => pointerMatchesRoom(value, roomUrl))) return null

  const hasWeb = event.tags.some((tag) => (tag[0] === "K" || tag[0] === "k") && tag[1] === K_WEB)
  if (!hasWeb) return null

  const eTags = event.tags.filter((tag) => tag[0] === "e" && tag[1])
  const isReply = eTags.length > 0 && event.tags.some((tag) => tag[0] === "k" && tag[1] === "1111")

  return {
    id: event.id,
    pubkey: event.pubkey,
    kind: KIND_COMMENT,
    created_at: event.created_at,
    content: event.content,
    tags: event.tags,
    sig: event.sig,
    parentId: isReply ? eTags[0][1] : undefined,
  }
}
