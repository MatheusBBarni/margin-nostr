import { verifyEvent, type Event } from "nostr-tools/pure"
import type { QueryPool } from "./profiles"

const PUBKEY_HEX = /^[0-9a-f]{64}$/i

export function parseFollows(event: { kind: number; tags: string[][] }): string[] {
  if (event.kind !== 3) return []

  const ids: string[] = []
  const seen = new Set<string>()
  for (const tag of event.tags) {
    if (tag[0] !== "p" || !tag[1]) continue
    const hex = tag[1].toLowerCase()
    if (!PUBKEY_HEX.test(hex) || seen.has(hex)) continue
    seen.add(hex)
    ids.push(hex)
  }
  return ids
}

export async function fetchFollows(
  pool: QueryPool,
  relays: string[],
  pubkey: string,
): Promise<string[]> {
  const self = pubkey.toLowerCase()
  const events = await pool.querySync(relays, { kinds: [3], authors: [self] })
  let newest: Event | null = null
  for (const raw of events) {
    const event = raw as Event
    if (event.kind !== 3 || event.pubkey.toLowerCase() !== self) continue
    if (!verifyEvent(event)) continue
    if (!newest || event.created_at > newest.created_at) newest = event
  }
  return newest ? parseFollows(newest) : []
}
