import { verifyEvent, type Event } from "nostr-tools/pure"

export function pickNewestVerified(events: readonly unknown[], kind: number, pubkey: string): Event | null {
  const self = pubkey.toLowerCase()
  let newest: Event | null = null
  for (const raw of events) {
    const event = raw as Event
    if (event.kind !== kind || typeof event.pubkey !== "string") continue
    if (event.pubkey.toLowerCase() !== self) continue
    if (!verifyEvent(event)) continue
    if (!newest || event.created_at > newest.created_at) newest = event
  }
  return newest
}
