export class NormalizeError extends Error {
  readonly name = "NormalizeError"

  constructor(message = "Invalid URL") {
    super(message)
  }
}

const HOST_PREFIXES = ["www.", "mobile.", "m."] as const

const DENIED_QUERY_KEYS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "twclid",
  "igshid",
  "mc_eid",
  "mc_cid",
  "si",
  "ref",
])

export function normalizeUrl(raw: string): string {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new NormalizeError("unparseable URL")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new NormalizeError("non-http(s) URL")
  }

  url.protocol = "https:"
  url.hostname = stripHostPrefix(url.hostname)

  if (url.port === "80" || url.port === "443") {
    url.port = ""
  }

  url.pathname = collapsePath(url.pathname)
  url.hash = ""
  dropDeniedQuery(url.searchParams)
  url.searchParams.sort()

  return url.origin + url.pathname + (url.search || "")
}

function stripHostPrefix(hostname: string): string {
  const lower = hostname.toLowerCase()
  for (const prefix of HOST_PREFIXES) {
    if (lower.startsWith(prefix)) return lower.slice(prefix.length)
  }
  return lower
}

function collapsePath(pathname: string): string {
  const collapsed = pathname.replace(/\/+/g, "/")
  if (collapsed !== "/" && collapsed.endsWith("/")) {
    return collapsed.slice(0, -1)
  }
  return collapsed
}

function isDeniedQueryKey(key: string): boolean {
  const name = key.toLowerCase()
  return name.startsWith("utm_") || DENIED_QUERY_KEYS.has(name)
}

function dropDeniedQuery(params: URLSearchParams): void {
  const denied = new Set<string>()
  for (const key of params.keys()) {
    if (isDeniedQueryKey(key)) denied.add(key)
  }
  for (const key of denied) params.delete(key)
}
