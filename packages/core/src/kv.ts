import { normalizePubkey } from "./pubkey"

export interface Kv {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
}

export type SignerMethod = "bunker" | "extension-message" | "nip07"

export type StoredSigner = {
  method: SignerMethod
  bunkerPointer?: string
  clientSkHex?: string
  extensionId?: string
  pubkey?: string
}

function withPubkey(base: StoredSigner, record: Record<string, unknown>): StoredSigner {
  if (typeof record.pubkey !== "string") return base
  const pubkey = normalizePubkey(record.pubkey)
  return pubkey ? { ...base, pubkey } : base
}

export function parseStoredSigner(value: unknown): StoredSigner | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  if (record.method === "bunker") {
    if (typeof record.bunkerPointer !== "string" || !record.bunkerPointer) return null
    if (typeof record.clientSkHex !== "string" || !record.clientSkHex) return null
    return withPubkey(
      {
        method: "bunker",
        bunkerPointer: record.bunkerPointer,
        clientSkHex: record.clientSkHex,
      },
      record,
    )
  }
  if (record.method === "extension-message") {
    if (typeof record.extensionId !== "string" || !record.extensionId) return null
    return withPubkey({ method: "extension-message", extensionId: record.extensionId }, record)
  }
  if (record.method === "nip07") return withPubkey({ method: "nip07" }, record)
  return null
}

export type ThemePreference = "light" | "dark" | "system"
export type FilterPreference = "follows" | "everyone"

export async function clearSessionSigner(kv: Kv): Promise<void> {
  await kv.delete(KV_KEYS.signer)
  await kv.delete(KV_KEYS.selfProfile)
}

export const KV_KEYS = {
  signer: "signer",
  mutes: "mutes",
  theme: "theme",
  defaultFilter: "defaultFilter",
  extraRelays: "extraRelays",
  followsCache: "followsCache",
  nip65Cache: "nip65Cache",
  selfProfile: "selfProfile",
} as const
