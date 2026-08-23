import type { Event } from "nostr-tools/pure"
import type { UnsignedComment } from "../events"

export type SignerId = "nip07" | "bunker" | "extension-message"

export interface Signer {
  id: SignerId
  getPublicKey(): Promise<string>
  signEvent(unsigned: UnsignedComment): Promise<Event>
  close?(): Promise<void>
}

export type Nip07Nostr = {
  getPublicKey(): Promise<string>
  signEvent(unsigned: UnsignedComment): Promise<Event>
}

export type ExtensionMessenger = (
  extensionId: string,
  message: { type: string; params: Record<string, unknown> },
) => Promise<unknown>
