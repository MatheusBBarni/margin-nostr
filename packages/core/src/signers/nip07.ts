import type { Nip07Nostr, Signer } from "./types"

export function createNip07Signer(nostr: Nip07Nostr): Signer {
  return {
    id: "nip07",
    getPublicKey: () => nostr.getPublicKey(),
    signEvent: (unsigned) => nostr.signEvent(unsigned),
  }
}
