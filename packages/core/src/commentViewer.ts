import { neventEncode } from "nostr-tools/nip19"
import { KIND_COMMENT, type VerifiedComment } from "./events"

export function commentViewerUrl(comment: Pick<VerifiedComment, "id" | "pubkey">): string {
  return `https://njump.me/${neventEncode({ id: comment.id, author: comment.pubkey, kind: KIND_COMMENT })}`
}
