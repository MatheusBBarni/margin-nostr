import { KV_KEYS, type Kv } from "./kv"
import { uniquePubkeys } from "./pubkey"

export function parseMutes(value: unknown): string[] {
  return Array.isArray(value) ? uniquePubkeys(value) : []
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
