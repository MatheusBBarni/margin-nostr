import { normalizeRelayUrl } from "./relays"

export type RelayStatus = "connected" | "failed" | "unknown"

export type RelayHealth = {
  url: string
  status: RelayStatus
}

function relayKey(url: string): string {
  return normalizeRelayUrl(url) ?? url.trim().replace(/\/+$/, "")
}

export function relayShortName(url: string): string {
  const host = relayKey(url)
    .replace(/^wss:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host
  const labels = host.split(".").filter(Boolean)
  if (labels.length <= 1) return host || url
  return labels[labels.length - 2] ?? host
}

export function relayHealth(
  urls: readonly string[],
  known: ReadonlyMap<string, Exclude<RelayStatus, "unknown">> = new Map(),
): RelayHealth[] {
  const lookup = new Map<string, Exclude<RelayStatus, "unknown">>()
  for (const [url, status] of known) lookup.set(relayKey(url), status)

  const seen = new Set<string>()
  const out: RelayHealth[] = []
  for (const raw of urls) {
    const url = relayKey(raw)
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push({ url, status: lookup.get(url) ?? "unknown" })
  }
  return out
}

function statusWord(status: RelayStatus): string {
  if (status === "connected") return "up"
  if (status === "failed") return "failed"
  return "connecting"
}

export function rememberRelayStatus(
  known: Map<string, Exclude<RelayStatus, "unknown">>,
  url: string,
  status: Exclude<RelayStatus, "unknown">,
): boolean {
  const key = relayKey(url)
  if (!key || known.get(key) === status) return false
  known.set(key, status)
  return true
}

export function syncRelayConnections(
  known: Map<string, Exclude<RelayStatus, "unknown">>,
  live: Iterable<readonly [string, boolean]>,
): boolean {
  let changed = false
  const liveKeys = new Set<string>()
  for (const [url, ok] of live) {
    liveKeys.add(relayKey(url))
    if (rememberRelayStatus(known, url, ok ? "connected" : "failed")) changed = true
  }
  for (const [url, status] of known) {
    if (status === "connected" && !liveKeys.has(url)) {
      known.set(url, "failed")
      changed = true
    }
  }
  return changed
}

export function formatRelayHealth(relays: RelayHealth[]): string {
  if (relays.length === 0) return ""
  if (relays.every((relay) => relay.status === "unknown")) {
    return `Connecting to ${relays.map((relay) => relayShortName(relay.url)).join(", ")}`
  }
  return relays.map((relay) => `${relayShortName(relay.url)} ${statusWord(relay.status)}`).join(", ")
}
