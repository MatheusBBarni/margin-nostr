import { KV_KEYS, type Kv } from "./kv"
import type { QueryPool } from "./profiles"
import { PUBKEY_HEX } from "./pubkey"
import { pickNewestVerified } from "./replaceable"

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

export type Nip65Cache = {
  pubkey: string
  read: string[]
  write: string[]
  fetchedAt: number
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
  const newest = pickNewestVerified(events, 10002, self)
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

export function parseExtraRelays(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return unique(value.filter((url): url is string => typeof url === "string"))
}

export async function hydrateExtraRelays(kv: Kv): Promise<string[]> {
  return parseExtraRelays(await kv.get(KV_KEYS.extraRelays))
}

export async function persistExtraRelays(kv: Kv, urls: string[]): Promise<void> {
  await kv.set<string[]>(KV_KEYS.extraRelays, parseExtraRelays(urls))
}

export function readRelays(user65?: Nip65Lists, extraRelays?: readonly string[]): string[] {
  return unique([
    ...CURATED_RELAYS,
    ...(user65?.read ?? []),
    ...(user65?.write ?? []),
    ...parseExtraRelays(extraRelays ?? []),
  ])
}

export function writeRelays(user65?: Nip65Lists, extraRelays?: readonly string[]): string[] {
  return unique([...CURATED_RELAYS, ...(user65?.write ?? []), ...parseExtraRelays(extraRelays ?? [])])
}

export function parseNip65Cache(value: unknown): Nip65Cache | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  if (typeof record.pubkey !== "string" || !PUBKEY_HEX.test(record.pubkey)) return null
  if (typeof record.fetchedAt !== "number" || !Number.isFinite(record.fetchedAt)) return null
  if (!Array.isArray(record.read) || !Array.isArray(record.write)) return null
  return {
    pubkey: record.pubkey.toLowerCase(),
    read: unique(record.read.filter((url): url is string => typeof url === "string")),
    write: unique(record.write.filter((url): url is string => typeof url === "string")),
    fetchedAt: record.fetchedAt,
  }
}

export async function hydrateNip65(kv: Kv, pubkey: string): Promise<Nip65Lists | null> {
  const stored = parseNip65Cache(await kv.get(KV_KEYS.nip65Cache))
  if (!stored || stored.pubkey !== pubkey.toLowerCase()) return null
  return { read: stored.read, write: stored.write }
}

export async function persistNip65(kv: Kv, pubkey: string, lists: Nip65Lists): Promise<void> {
  await kv.set<Nip65Cache>(KV_KEYS.nip65Cache, {
    pubkey: pubkey.toLowerCase(),
    read: unique(lists.read),
    write: unique(lists.write),
    fetchedAt: Date.now(),
  })
}
