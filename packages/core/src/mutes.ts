import { KV_KEYS, type Kv } from "./kv"

const PUBKEY_HEX = /^[0-9a-f]{64}$/i

export function parseMutes(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ids: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    if (typeof item !== "string") continue
    const hex = item.toLowerCase()
    if (!PUBKEY_HEX.test(hex) || seen.has(hex)) continue
    seen.add(hex)
    ids.push(hex)
  }
  return ids
}

export function addMute(mutes: string[], pubkey: string): string[] {
  return parseMutes([...mutes, pubkey])
}

export function removeMute(mutes: string[], pubkey: string): string[] {
  const hex = pubkey.toLowerCase()
  return parseMutes(mutes).filter((id) => id !== hex)
}

export async function hydrateMutes(kv: Kv): Promise<string[]> {
  return parseMutes(await kv.get(KV_KEYS.mutes))
}

export async function persistMutes(kv: Kv, mutes: string[]): Promise<void> {
  await kv.set<string[]>(KV_KEYS.mutes, parseMutes(mutes))
}
