import type { Nip07Nostr } from "@margin/core"

declare global {
  interface Window {
    nostr?: Nip07Nostr
  }
}

export {}
