import type { Event } from "nostr-tools/pure"
import type { UnsignedComment } from "../events"
import type { ExtensionMessenger, Signer } from "./types"

export const EXTENSION_SIGNER_IDS = {
  nos2x: {
    chromium: "kpgefcfmnafjgpblomihpgmejjdanjjp",
  },
  alby: {
    chromium: "iokeahhehimjnekafflcihljlcjccdbe",
  },
} as const

export function createExtensionMessageSigner(
  sendMessage: ExtensionMessenger,
  extensionId: string,
): Signer {
  return {
    id: "extension-message",
    async getPublicKey() {
      const result = await sendMessage(extensionId, { type: "getPublicKey", params: {} })
      if (typeof result === "string") return result
      if (result && typeof result === "object" && "error" in result) {
        throw new Error(String((result as { error: unknown }).error))
      }
      throw new Error("extension signer did not return a pubkey")
    },
    async signEvent(unsigned: UnsignedComment) {
      const result = await sendMessage(extensionId, {
        type: "signEvent",
        params: { event: unsigned },
      })
      if (result && typeof result === "object" && "error" in result) {
        throw new Error(String((result as { error: unknown }).error))
      }
      return result as Event
    },
  }
}

export async function detectExtensionSigner(
  sendMessage: ExtensionMessenger,
  ids: string[] = [
    EXTENSION_SIGNER_IDS.nos2x.chromium,
    EXTENSION_SIGNER_IDS.alby.chromium,
  ],
): Promise<{ signer: Signer; extensionId: string } | null> {
  for (const extensionId of ids) {
    try {
      const signer = createExtensionMessageSigner(sendMessage, extensionId)
      await signer.getPublicKey()
      return { signer, extensionId }
    } catch {
      continue
    }
  }
  return null
}
