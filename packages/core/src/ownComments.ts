import type { Event } from "nostr-tools/pure"
import { parseWebComment, type WebComment } from "./events"
import { ROOM_EVENT_CAP } from "./thread"

export function collectOwnWebComments(events: Event[], pubkey: string): WebComment[] {
  const self = pubkey.toLowerCase()
  const seen = new Set<string>()
  const collected: WebComment[] = []

  for (const event of events) {
    const parsed = parseWebComment(event)
    if (!parsed) continue
    if (parsed.pubkey.toLowerCase() !== self) continue
    if (seen.has(parsed.id)) continue
    seen.add(parsed.id)
    collected.push(parsed)
  }

  return collected.sort((a, b) => b.created_at - a.created_at).slice(0, ROOM_EVENT_CAP)
}
