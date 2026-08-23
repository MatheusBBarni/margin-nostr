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
