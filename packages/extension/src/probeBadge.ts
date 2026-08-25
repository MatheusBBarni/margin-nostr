import {
  KV_KEYS,
  badgeHits,
  badgeSocial,
  badgeState,
  hydrateExtraRelays,
  hydrateMutes,
  hydrateNip65,
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

async function loadBadgeSocial() {
  const mutes = await hydrateMutes(chromeKv)
  const signer = await chromeKv.get<StoredSigner>(KV_KEYS.signer)
  const cache = await chromeKv.get(KV_KEYS.followsCache)
  return badgeSocial(signer, cache, mutes)
}

async function probeTab(tabId: number, rawUrl: string | undefined): Promise<void> {
  abortProbe(tabId)

  const decision = badgeDecision(rawUrl)
  if (decision.action === "hold") return
  if (decision.action === "clear") {
    await paintTabBadge(tabId, { text: "" })
    return
  }

  const social = await loadBadgeSocial()
  const user65 = social.mode === "follows" ? await hydrateNip65(chromeKv, social.self) : null
  const extraRelays = await hydrateExtraRelays(chromeKv)
  const pool = new SimplePool()
  const relays = readRelays(user65 ?? undefined, extraRelays)
  const comments: VerifiedComment[] = []
  const seen = new Set<string>()
  let closed = false

  const paint = () => {
    const hits = badgeHits(comments, social)
    void paintTabBadge(tabId, badgeState(hits.followsHits, hits.everyoneHits))
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
