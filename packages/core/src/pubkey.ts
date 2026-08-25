export const PUBKEY_HEX = /^[0-9a-f]{64}$/i

export function normalizePubkey(value: string): string | null {
  const hex = value.toLowerCase()
  return PUBKEY_HEX.test(hex) ? hex : null
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
