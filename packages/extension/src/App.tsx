import {
  KV_KEYS,
  NormalizeError,
  applyFilter,
  buildReply,
  buildTopLevel,
  createBunkerSigner,
  createExtensionMessageSigner,
  detectExtensionSigner,
  evictProfileCache,
  fetchProfiles,
  hydrateSelfProfile,
  nest,
  normalizeUrl,
  parseComment,
  persistSelfProfile,
  publishRoom,
  readRelays,
  subscribeRoom,
  writeRelays,
  type Profile,
  type Signer,
  type StoredSigner,
  type ThemePreference,
  type ThreadNode,
  type VerifiedComment,
} from "@margin/core"
import { Thread, applyTheme } from "@margin/ui"
import { SimplePool } from "nostr-tools"
import { bytesToHex, hexToBytes } from "nostr-tools/utils"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { setTabBadge } from "./badge"
import { chromeKv } from "./chromeKv"
import { isSkippableUrl } from "./skipUrl"

const PUBLIC_ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN ?? "http://localhost:5173"

function isSkippable(url: string): boolean {
  return isSkippableUrl(url)
}

function permalinkFor(normalized: string): string {
  return `${PUBLIC_ORIGIN}/u/${encodeURIComponent(normalized)}`
}

export function App() {
  const [tabUrl, setTabUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<VerifiedComment[]>([])
  const [filter, setFilter] = useState<"follows" | "everyone">("everyone")
  const [replyTo, setReplyTo] = useState<VerifiedComment | null>(null)
  const [pubkey, setPubkey] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map())
  const signerRef = useRef<Signer | null>(null)
  const poolRef = useRef<SimplePool | null>(null)

  const roomState = useMemo(() => {
    if (!tabUrl || isSkippable(tabUrl)) return { status: "skippable" as const }
    try {
      return { status: "ok" as const, url: normalizeUrl(tabUrl) }
    } catch (cause) {
      return { status: "invalid" as const, reason: cause instanceof NormalizeError ? cause.message : "invalid URL" }
    }
  }, [tabUrl])
  const room = roomState.status === "ok" ? roomState.url : null

  const nodes: ThreadNode[] = useMemo(() => {
    const nested = nest(comments)
    return applyFilter(nested.roots, {
      mode: filter,
      follows: new Set(),
      muted: new Set(),
      self: pubkey ?? undefined,
    })
  }, [comments, filter, pubkey])

  const refreshTab = useCallback(async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    setTabUrl(tabs[0]?.url ?? null)
  }, [])

  useEffect(() => {
    void (async () => {
      const theme = (await chromeKv.get<ThemePreference>(KV_KEYS.theme)) ?? "system"
      applyTheme(theme)
    })()
    void refreshTab()
    const onActivated = () => void refreshTab()
    const onUpdated = (_id: number, info: { url?: string }) => {
      if (info.url) void refreshTab()
    }
    browser.tabs.onActivated.addListener(onActivated)
    browser.tabs.onUpdated.addListener(onUpdated)
    return () => {
      browser.tabs.onActivated.removeListener(onActivated)
      browser.tabs.onUpdated.removeListener(onUpdated)
    }
  }, [refreshTab])

  useEffect(() => {
    setComments([])
    setReplyTo(null)
    if (!room) return
    const pool = new SimplePool()
    poolRef.current = pool
    const seen = new Set<string>()
    const sub = subscribeRoom(pool, readRelays(), room, {
      onevent(comment) {
        if (seen.has(comment.id)) return
        seen.add(comment.id)
        setComments((current) => (current.some((row) => row.id === comment.id) ? current : [...current, comment]))
      },
    })
    return () => {
      sub.close()
      pool.close(readRelays())
      poolRef.current = null
    }
  }, [room])

  useEffect(() => {
    const pubkeys = [...new Set(comments.map((comment) => comment.pubkey).concat(pubkey ? [pubkey] : []))]
    if (pubkeys.length === 0) return
    const pool = poolRef.current ?? new SimplePool()
    let cancelled = false
    void fetchProfiles(pool, readRelays(), pubkeys).then((next) => {
      if (cancelled) return
      setProfiles((current) => {
        const merged = new Map(current)
        for (const [key, profile] of next) merged.set(key, profile)
        return merged
      })
      if (pubkey) void persistSelfProfile(chromeKv, pubkey)
    })
    return () => {
      cancelled = true
    }
  }, [comments, pubkey])

  useEffect(() => {
    void (async () => {
      const stored = await chromeKv.get<StoredSigner>(KV_KEYS.signer)
      if (!stored) return
      try {
        if (stored.method === "extension-message" && stored.extensionId) {
          const signer = createExtensionMessageSigner(
            (id, message) => browser.runtime.sendMessage(id, message),
            stored.extensionId,
          )
          signerRef.current = signer
          const hex = await signer.getPublicKey()
          await applyCachedSelf(hex)
          setPubkey(hex)
          return
        }
        if (stored.method === "bunker" && stored.bunkerPointer && stored.clientSkHex && poolRef.current) {
          const { signer } = await createBunkerSigner({
            bunkerUri: stored.bunkerPointer,
            clientSk: hexToBytes(stored.clientSkHex),
            pool: poolRef.current,
          })
          signerRef.current = signer
          const hex = await signer.getPublicKey()
          await applyCachedSelf(hex)
          setPubkey(hex)
        }
      } catch {
        signerRef.current = null
        setPubkey(null)
      }
    })()
  }, [room])

  async function connectExtension() {
    const found = await detectExtensionSigner((id, message) => browser.runtime.sendMessage(id, message))
    if (!found) {
      setError("No extension signer found. Connect a bunker or install nos2x/Alby.")
      return
    }
    signerRef.current = found.signer
    const hex = await found.signer.getPublicKey()
    await applyCachedSelf(hex)
    setPubkey(hex)
    await chromeKv.set<StoredSigner>(KV_KEYS.signer, {
      method: "extension-message",
      extensionId: found.extensionId,
    })
    setError(null)
  }

  async function connectBunker() {
    const uri = window.prompt("Paste a bunker:// URI")
    if (!uri) return
    const pool = poolRef.current ?? new SimplePool()
    poolRef.current = pool
    const { signer, clientSk } = await createBunkerSigner({ bunkerUri: uri, pool })
    signerRef.current = signer
    const hex = await signer.getPublicKey()
    await applyCachedSelf(hex)
    setPubkey(hex)
    await chromeKv.set<StoredSigner>(KV_KEYS.signer, {
      method: "bunker",
      bunkerPointer: uri,
      clientSkHex: bytesToHex(clientSk),
    })
    setError(null)
  }

  async function applyCachedSelf(hex: string) {
    const profile = await hydrateSelfProfile(chromeKv, hex)
    if (!profile) return
    setProfiles((current) => new Map(current).set(hex, profile))
  }

  async function logout() {
    await signerRef.current?.close?.()
    signerRef.current = null
    if (pubkey) evictProfileCache(pubkey)
    setPubkey(null)
    setProfiles(new Map())
    await chromeKv.delete(KV_KEYS.signer)
    await chromeKv.delete(KV_KEYS.selfProfile)
  }

  async function onSubmit(text: string) {
    if (!room || !signerRef.current) return
    const unsigned = replyTo ? buildReply(room, text, replyTo) : buildTopLevel(room, text)
    const signed = await signerRef.current.signEvent(unsigned)
    const parsed = parseComment(signed, room)
    if (!parsed) {
      setError("Signer returned an event we could not verify.")
      return
    }
    setComments((current) => [...current, parsed])
    await publishRoom(poolRef.current ?? new SimplePool(), writeRelays(), signed)
    setReplyTo(null)
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    const tabId = tabs[0]?.id
    if (tabId != null) await setTabBadge(tabId, comments.length + 1)
    void browser.runtime.sendMessage({ type: "probeBadge" }).catch(() => {})
  }

  if (roomState.status === "skippable") {
    return (
      <div className="bg-background text-foreground p-4 text-sm">
        Open an https page to see this room.
      </div>
    )
  }

  if (roomState.status === "invalid" || !room) {
    return (
      <div className="bg-background text-foreground p-4 text-sm" role="alert">
        This URL is not a valid room.
      </div>
    )
  }

  return (
    <Thread
      nodes={nodes}
      profiles={profiles}
      self={pubkey}
      filter={filter}
      onFilter={setFilter}
      onReply={(parentId) => setReplyTo(comments.find((row) => row.id === parentId) ?? null)}
      permalink={permalinkFor(room)}
      normalizedUrl={room}
      onCopyPermalink={() => navigator.clipboard.writeText(permalinkFor(room))}
      replyTo={replyTo}
      composeDisabled={!pubkey}
      onSubmit={onSubmit}
      onCancelReply={() => setReplyTo(null)}
      pubkey={pubkey}
      onConnectNip07={() => void connectExtension()}
      onConnectBunker={() => void connectBunker()}
      onLogout={() => void logout()}
      errorMessage={error}
    />
  )
}
