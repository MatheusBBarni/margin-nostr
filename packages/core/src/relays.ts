import { verifyEvent, type Event } from "nostr-tools/pure"
import type { QueryPool } from "./profiles"

export const CURATED_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://nostr.oxtr.dev",
  "wss://nostr-pub.wellorder.net",
] as const

export type Nip65Lists = {
  read: string[]
  write: string[]
}

export function normalizeRelayUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, "")
  if (!trimmed.startsWith("wss://")) return null
  return trimmed
}

export function parseNip65(event: { tags: string[][] }): Nip65Lists {
  const read: string[] = []
  const write: string[] = []
  const seenRead = new Set<string>()
  const seenWrite = new Set<string>()

  for (const tag of event.tags) {
    if (tag[0] !== "r" || !tag[1]) continue
    const url = normalizeRelayUrl(tag[1])
    if (!url) continue
    const marker = tag[2]
    if (!marker || marker === "read") {
      if (!seenRead.has(url)) {
        seenRead.add(url)
        read.push(url)
      }
    }
    if (!marker || marker === "write") {
      if (!seenWrite.has(url)) {
        seenWrite.add(url)
        write.push(url)
      }
    }
  }

  return { read, write }
}

export async function fetchNip65(
  pool: QueryPool,
  relays: string[],
  pubkey: string,
): Promise<Nip65Lists | null> {
  const self = pubkey.toLowerCase()
  const events = await pool.querySync(relays, { kinds: [10002], authors: [self] })
  let newest: Event | null = null
  for (const raw of events) {
    const event = raw as Event
    if (event.kind !== 10002 || event.pubkey.toLowerCase() !== self) continue
    if (!verifyEvent(event)) continue
    if (!newest || event.created_at > newest.created_at) newest = event
  }
  return newest ? parseNip65(newest) : null
}

function unique(urls: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const url of urls) {
    const normalized = normalizeRelayUrl(url)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }
  return out
}

export function readRelays(user65?: Nip65Lists): string[] {
  return unique([...CURATED_RELAYS, ...(user65?.read ?? []), ...(user65?.write ?? [])])
}

export function writeRelays(user65?: Nip65Lists): string[] {
  return unique([...CURATED_RELAYS, ...(user65?.write ?? [])])
}
