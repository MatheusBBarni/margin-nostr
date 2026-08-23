import { BunkerSigner, parseBunkerInput } from "nostr-tools/nip46"
import { generateSecretKey } from "nostr-tools/pure"
import type { Event } from "nostr-tools/pure"
import type { UnsignedComment } from "../events"
import type { Signer } from "./types"

export type BunkerPool = ConstructorParameters<typeof BunkerSigner>[2] extends { pool: infer P }
  ? P
  : never

export async function createBunkerSigner(input: {
  bunkerUri: string
  clientSk?: Uint8Array
  pool: { subscribeMany: unknown; publish: unknown }
}): Promise<{ signer: Signer; clientSk: Uint8Array }> {
  const clientSk = input.clientSk ?? generateSecretKey()
  const pointer = await parseBunkerInput(input.bunkerUri)
  if (!pointer) throw new Error("invalid bunker input")

  const bunker = BunkerSigner.fromBunker(clientSk, pointer, {
    pool: input.pool as never,
  })
  await bunker.connect()

  const signer: Signer = {
    id: "bunker",
    getPublicKey: () => bunker.getPublicKey(),
    signEvent: (unsigned: UnsignedComment) => bunker.signEvent(unsigned) as Promise<Event>,
    close: () => bunker.close(),
  }

  return { signer, clientSk }
}
