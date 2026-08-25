import type { Event } from "nostr-tools/pure"
import type { UnsignedComment } from "../events"
import type { ExtensionMessenger, Signer } from "./types"

export const EXTENSION_SIGNER_IDS = {
  nos2x: {
    chromium: "kpgefcfmnafjgpblomihpgmejjdanjjp",
    firefox: "{fdacee2c-bab4-490d-bc4b-ecdd03d5d68a}",
  },
  alby: {
    chromium: "iokeahhehimjnekafflcihljlcjccdbe",
    firefox: "extension@getalby.com",
  },
} as const

export const KNOWN_EXTENSION_SIGNER_IDS = [
  EXTENSION_SIGNER_IDS.nos2x.chromium,
  EXTENSION_SIGNER_IDS.alby.chromium,
  EXTENSION_SIGNER_IDS.nos2x.firefox,
  EXTENSION_SIGNER_IDS.alby.firefox,
] as const

export function extensionSignerLabel(id: string): "nos2x" | "Alby" | "extension" {
  if (id === EXTENSION_SIGNER_IDS.nos2x.chromium || id === EXTENSION_SIGNER_IDS.nos2x.firefox) return "nos2x"
  if (id === EXTENSION_SIGNER_IDS.alby.chromium || id === EXTENSION_SIGNER_IDS.alby.firefox) return "Alby"
  return "extension"
}

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
  ids: string[] = [...KNOWN_EXTENSION_SIGNER_IDS],
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
