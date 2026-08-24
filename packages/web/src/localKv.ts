import type { Kv } from "@margin/core"

export const localKv: Kv = {
  async get<T>(key: string) {
    const raw = localStorage.getItem(key)
    if (raw == null) return undefined
    return JSON.parse(raw) as T
  },
  async set<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value))
  },
  async delete(key: string) {
    localStorage.removeItem(key)
  },
}
