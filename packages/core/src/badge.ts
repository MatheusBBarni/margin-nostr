export type BadgeState = {
  text: string
  background?: string
}

export function badgeState(followsHits: number, everyoneHits: number): BadgeState {
  if (followsHits > 0) {
    return { text: String(Math.min(followsHits, 99)), background: "#1863dc" }
  }
  if (everyoneHits > 0) return { text: "•", background: "#93939f" }
  return { text: "" }
}

export function countFollowsHits(
  events: { pubkey: string }[],
  options: { follows: Set<string>; self?: string; muted: Set<string> },
): number {
  const follows = new Set([...options.follows].map((hex) => hex.toLowerCase()))
  const muted = new Set([...options.muted].map((hex) => hex.toLowerCase()))
  const self = options.self?.toLowerCase()
  let hits = 0
  for (const event of events) {
    const pubkey = event.pubkey.toLowerCase()
    if (muted.has(pubkey)) continue
    if (follows.has(pubkey) || (self && pubkey === self)) hits += 1
  }
  return hits
}
