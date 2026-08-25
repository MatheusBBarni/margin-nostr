import {
  KV_KEYS,
  badgeState,
  countFollowsHits,
  hydrateMutes,
  hydrateNip65,
  parseFollowsCache,
  readRelays,
  subscribeRoom,
  type StoredSigner,
  type VerifiedComment,
} from "@margin/core"
import { SimplePool } from "nostr-tools"
import { paintTabBadge } from "./badge"
import { badgeDecision, tabHref } from "./badgeDecision"
import { chromeKv } from "./chromeKv"

const DEBOUNCE_MS = 300
const MAX_WAIT_MS = 2500

type Probe = { abort: () => void }

const probes = new Map<number, Probe>()
const debounce = new Map<number, ReturnType<typeof setTimeout>>()

function abortProbe(tabId: number): void {
  probes.get(tabId)?.abort()
  probes.delete(tabId)
}

async function badgeContext(): Promise<{
  follows: Set<string>
  self?: string
  muted: Set<string>
  nip65Self?: string
}> {
  const muted = new Set(await hydrateMutes(chromeKv))
  const signer = await chromeKv.get<StoredSigner>(KV_KEYS.signer)
  if (!signer) return { follows: new Set(), muted }
  const cache = parseFollowsCache(await chromeKv.get(KV_KEYS.followsCache))
  if (!cache) return { follows: new Set(), muted }
  return {
    follows: new Set(cache.ids),
    self: cache.pubkey,
    muted,
    nip65Self: cache.pubkey,
  }
}

async function probeTab(tabId: number, rawUrl: string | undefined): Promise<void> {
  abortProbe(tabId)

  const decision = badgeDecision(rawUrl)
  if (decision.action === "hold") return
  if (decision.action === "clear") {
    await paintTabBadge(tabId, { text: "" })
    return
  }

  const context = await badgeContext()
  const user65 = context.nip65Self ? await hydrateNip65(chromeKv, context.nip65Self) : null
  const pool = new SimplePool()
  const relays = readRelays(user65 ?? undefined)
  const comments: VerifiedComment[] = []
  const seen = new Set<string>()
  let closed = false

  const paint = () => {
    const everyoneHits = comments.length
    const followsHits = context.self
      ? countFollowsHits(comments, {
          follows: context.follows,
          self: context.self,
          muted: context.muted,
        })
      : 0
    void paintTabBadge(tabId, badgeState(followsHits, everyoneHits))
  }

  const stop = (shouldPaint: boolean) => {
    if (closed) return
    closed = true
    clearTimeout(timer)
    sub.close()
    pool.close(relays)
    probes.delete(tabId)
    if (shouldPaint) paint()
  }

  const sub = subscribeRoom(pool, relays, decision.room, {
    onevent(comment) {
      if (closed) return
      if (seen.has(comment.id)) return
      seen.add(comment.id)
      comments.push(comment)
      paint()
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
      void probeTab(tabId, rawUrl).catch(() => {})
    }, DEBOUNCE_MS),
  )
}

export function startBadgeWatcher(): void {
  const onActivated = (info: { tabId: number }) => {
    void browser.tabs.get(info.tabId).then(
      (tab) => scheduleBadgeProbe(info.tabId, tabHref(tab)),
      () => {},
    )
  }

  const onUpdated = (
    tabId: number,
    info: { url?: string; status?: string },
    tab: { url?: string; pendingUrl?: string },
  ) => {
    if (info.url) {
      scheduleBadgeProbe(tabId, info.url)
      return
    }
    if (info.status === "complete") scheduleBadgeProbe(tabId, tabHref(tab))
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
    scheduleBadgeProbe(tab.id, tabHref(tab))
  })
}

export function probeActiveTab(): void {
  void browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const tab = tabs[0]
    if (tab?.id == null) return
    scheduleBadgeProbe(tab.id, tabHref(tab))
  })
}
