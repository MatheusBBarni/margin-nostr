import { NormalizeError, normalizeUrl, readRelays, subscribeRoom } from "@margin/core"
import { SimplePool } from "nostr-tools"
import { setTabBadge } from "./badge"
import { isSkippableUrl } from "./skipUrl"

const DEBOUNCE_MS = 300
const MAX_WAIT_MS = 2500

type Probe = { abort: () => void }

const probes = new Map<number, Probe>()
const debounce = new Map<number, ReturnType<typeof setTimeout>>()

function abortProbe(tabId: number): void {
  probes.get(tabId)?.abort()
  probes.delete(tabId)
}

async function probeTab(tabId: number, rawUrl: string | undefined): Promise<void> {
  abortProbe(tabId)

  if (!rawUrl || isSkippableUrl(rawUrl)) {
    await setTabBadge(tabId, 0)
    return
  }

  let room: string
  try {
    room = normalizeUrl(rawUrl)
  } catch (cause) {
    if (!(cause instanceof NormalizeError)) throw cause
    await setTabBadge(tabId, 0)
    return
  }

  const pool = new SimplePool()
  const relays = readRelays()
  const seen = new Set<string>()
  let closed = false

  const stop = (paint: boolean) => {
    if (closed) return
    closed = true
    clearTimeout(timer)
    sub.close()
    pool.close(relays)
    probes.delete(tabId)
    if (paint) void setTabBadge(tabId, seen.size)
  }

  const sub = subscribeRoom(pool, relays, room, {
    onevent(comment) {
      if (closed) return
      seen.add(comment.id)
      void setTabBadge(tabId, seen.size)
    },
  })

  const timer = setTimeout(() => stop(true), MAX_WAIT_MS)
  probes.set(tabId, {
    abort() {
      stop(false)
    },
  })
}

export function scheduleBadgeProbe(tabId: number, rawUrl: string | undefined): void {
  const pending = debounce.get(tabId)
  if (pending) clearTimeout(pending)
  debounce.set(
    tabId,
    setTimeout(() => {
      debounce.delete(tabId)
      void probeTab(tabId, rawUrl)
    }, DEBOUNCE_MS),
  )
}

export function startBadgeWatcher(): void {
  const onActivated = (info: { tabId: number }) => {
    void browser.tabs.get(info.tabId).then(
      (tab) => scheduleBadgeProbe(info.tabId, tab.url),
      () => {},
    )
  }

  const onUpdated = (tabId: number, info: { url?: string }) => {
    if (info.url) scheduleBadgeProbe(tabId, info.url)
  }

  const onRemoved = (tabId: number) => {
    const pending = debounce.get(tabId)
    if (pending) clearTimeout(pending)
    debounce.delete(tabId)
    abortProbe(tabId)
  }

  browser.tabs.onActivated.addListener(onActivated)
  browser.tabs.onUpdated.addListener(onUpdated)
  browser.tabs.onRemoved.addListener(onRemoved)

  void browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const tab = tabs[0]
    if (tab?.id == null) return
    scheduleBadgeProbe(tab.id, tab.url)
  })
}

export function probeActiveTab(): void {
  void browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const tab = tabs[0]
    if (tab?.id == null) return
    scheduleBadgeProbe(tab.id, tab.url)
  })
}
