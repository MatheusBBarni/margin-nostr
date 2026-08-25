import { verifyEvent, type Event } from "nostr-tools/pure"
import { KV_KEYS, type Kv } from "./kv"
import type { QueryPool } from "./profiles"
import { PUBKEY_HEX, uniquePubkeys } from "./pubkey"

export type FollowsCache = {
  pubkey: string
  ids: string[]
  fetchedAt: number
}

export function parseFollows(event: { kind: number; tags: string[][] }): string[] {
  if (event.kind !== 3) return []
  return uniquePubkeys(event.tags.filter((tag) => tag[0] === "p").map((tag) => tag[1]))
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

export function parseFollowsCache(value: unknown): FollowsCache | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  if (typeof record.pubkey !== "string" || !PUBKEY_HEX.test(record.pubkey)) return null
  if (typeof record.fetchedAt !== "number" || !Number.isFinite(record.fetchedAt)) return null
  if (!Array.isArray(record.ids)) return null
  return { pubkey: record.pubkey.toLowerCase(), ids: uniquePubkeys(record.ids), fetchedAt: record.fetchedAt }
}

export async function hydrateFollows(kv: Kv, pubkey: string): Promise<string[] | null> {
  const stored = parseFollowsCache(await kv.get(KV_KEYS.followsCache))
  if (!stored || stored.pubkey !== pubkey.toLowerCase()) return null
  return stored.ids
}

export async function persistFollows(kv: Kv, pubkey: string, ids: string[]): Promise<void> {
  await kv.set<FollowsCache>(KV_KEYS.followsCache, {
    pubkey: pubkey.toLowerCase(),
    ids: uniquePubkeys(ids),
    fetchedAt: Date.now(),
  })
}
