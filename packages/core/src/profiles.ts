import { KV_KEYS, type Kv } from "./kv"

export type Profile = {
  name?: string
  display_name?: string
  picture?: string
}

export type StoredSelfProfile = {
  pubkey: string
  created_at: number
  profile: Profile
}

const PUBKEY_HEX = /^[0-9a-f]{64}$/i

export type ProfileEvent = {
  pubkey: string
  kind: number
  created_at: number
  content: string
}

export type QueryPool = {
  querySync: (relays: string[], filter: object) => Promise<ProfileEvent[]>
}

const cache = new Map<string, { created_at: number; profile: Profile }>()

function safeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  try {
    const url = new URL(value)
    if (url.protocol === "https:" || url.protocol === "http:") return value
  } catch {
    return undefined
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function parseProfile(event: ProfileEvent): Profile | null {
  if (event.kind !== 0) return null
  try {
    const raw = JSON.parse(event.content) as unknown
    if (!raw || typeof raw !== "object") return null
    const record = raw as Record<string, unknown>
    const profile: Profile = {}
    const name = optionalString(record.name)
    const displayName = optionalString(record.display_name)
    const picture = safeHttpUrl(record.picture)
    if (name) profile.name = name
    if (displayName) profile.display_name = displayName
    if (picture) profile.picture = picture
    return profile
  } catch {
    return null
  }
}

export async function fetchProfiles(
  pool: QueryPool,
  relays: string[],
  pubkeys: string[],
): Promise<Map<string, Profile>> {
  const unique = [...new Set(pubkeys.filter(Boolean))]
  const missing = unique.filter((pubkey) => !cache.has(pubkey))
  if (missing.length > 0) {
    const events = await pool.querySync(relays, { kinds: [0], authors: missing })
    for (const event of events) {
      const parsed = parseProfile(event)
      if (!parsed) continue
      const current = cache.get(event.pubkey)
      if (!current || event.created_at >= current.created_at) {
        cache.set(event.pubkey, { created_at: event.created_at, profile: parsed })
      }
    }
  }

  const out = new Map<string, Profile>()
  for (const pubkey of unique) {
    const hit = cache.get(pubkey)
    if (hit) out.set(pubkey, hit.profile)
  }
  return out
}

export function clearProfileCache(): void {
  cache.clear()
}

export function evictProfileCache(pubkey: string): void {
  cache.delete(pubkey)
}

function sanitizeProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const profile: Profile = {}
  const name = optionalString(record.name)
  const displayName = optionalString(record.display_name)
  const picture = safeHttpUrl(record.picture)
  if (name) profile.name = name
  if (displayName) profile.display_name = displayName
  if (picture) profile.picture = picture
  return profile
}

export function parseStoredSelfProfile(value: unknown): StoredSelfProfile | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  if (typeof record.pubkey !== "string" || !PUBKEY_HEX.test(record.pubkey)) return null
  if (typeof record.created_at !== "number" || !Number.isFinite(record.created_at)) return null
  const profile = sanitizeProfile(record.profile)
  if (!profile) return null
  return { pubkey: record.pubkey.toLowerCase(), created_at: record.created_at, profile }
}

export function seedProfileCache(pubkey: string, profile: Profile, created_at: number): void {
  cache.set(pubkey, { created_at, profile })
}

export async function hydrateSelfProfile(kv: Kv, pubkey: string): Promise<Profile | null> {
  const stored = parseStoredSelfProfile(await kv.get(KV_KEYS.selfProfile))
  if (!stored || stored.pubkey !== pubkey.toLowerCase()) return null
  seedProfileCache(pubkey, stored.profile, stored.created_at)
  return stored.profile
}

export async function persistSelfProfile(kv: Kv, pubkey: string): Promise<void> {
  const hit = cache.get(pubkey)
  if (!hit) return
  await kv.set<StoredSelfProfile>(KV_KEYS.selfProfile, {
    pubkey: pubkey.toLowerCase(),
    created_at: hit.created_at,
    profile: hit.profile,
  })
}
