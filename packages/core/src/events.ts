export const KIND_COMMENT = 1111
export const K_WEB = "web"

export type UnsignedComment = {
  kind: 1111
  created_at: number
  content: string
  tags: string[][]
}

export function buildTopLevel(normalizedUrl: string, content: string): UnsignedComment {
  return {
    kind: KIND_COMMENT,
    created_at: Math.floor(Date.now() / 1000),
    content: content.trim(),
    tags: [
      ["I", normalizedUrl],
      ["K", K_WEB],
      ["i", normalizedUrl],
      ["k", K_WEB],
    ],
  }
}
