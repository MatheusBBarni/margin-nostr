import { NormalizeError, normalizeUrl } from "@margin/core"
import { isSkippableUrl } from "./skipUrl"

export type BadgeDecision = { action: "hold" } | { action: "clear" } | { action: "probe"; room: string }

export function badgeDecision(rawUrl: string | undefined): BadgeDecision {
  if (!rawUrl) return { action: "hold" }
  if (isSkippableUrl(rawUrl)) return { action: "clear" }
  try {
    return { action: "probe", room: normalizeUrl(rawUrl) }
  } catch (cause) {
    if (cause instanceof NormalizeError) return { action: "clear" }
    throw cause
  }
}

export function tabHref(tab: { url?: string; pendingUrl?: string }): string | undefined {
  return tab.url || tab.pendingUrl
}
