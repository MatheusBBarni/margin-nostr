import type { Kv } from "@margin/core"

export const chromeKv: Kv = {
  async get<T>(key: string) {
    const result = await browser.storage.local.get(key)
    return result[key] as T | undefined
  },
  async set<T>(key: string, value: T) {
    await browser.storage.local.set({ [key]: value })
  },
  async delete(key: string) {
    await browser.storage.local.remove(key)
  },
}
