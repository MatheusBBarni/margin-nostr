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
