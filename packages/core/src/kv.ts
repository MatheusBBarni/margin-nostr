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
}

export type ThemePreference = "light" | "dark" | "system"
export type FilterPreference = "follows" | "everyone"

export const KV_KEYS = {
  signer: "signer",
  mutes: "mutes",
  theme: "theme",
  defaultFilter: "defaultFilter",
  extraRelays: "extraRelays",
  followsCache: "followsCache",
  nip65Cache: "nip65Cache",
} as const
