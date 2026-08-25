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
