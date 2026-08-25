import { decode } from "nostr-tools/nip19"

export const PUBKEY_HEX = /^[0-9a-f]{64}$/i

export function normalizePubkey(value: string): string | null {
  const hex = value.toLowerCase()
  return PUBKEY_HEX.test(hex) ? hex : null
}

export function parsePubkeyInput(raw: string): string | null {
  const trimmed = raw.trim()
  const hex = normalizePubkey(trimmed)
  if (hex) return hex
  try {
    const decoded = decode(trimmed)
    if (decoded.type !== "npub" || typeof decoded.data !== "string") return null
    return normalizePubkey(decoded.data)
  } catch {
    return null
  }
}

export function uniquePubkeys(values: unknown[]): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    if (typeof value !== "string") continue
    const hex = normalizePubkey(value)
    if (!hex || seen.has(hex)) continue
    seen.add(hex)
    ids.push(hex)
  }
  return ids
}
