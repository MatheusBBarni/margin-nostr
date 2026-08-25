import {
  KV_KEYS,
  NormalizeError,
  createBunkerSigner,
  createExtensionMessageSigner,
  detectExtensionSigner,
  evictProfileCache,
  normalizeUrl,
  readRelays,
  type Signer,
  type StoredSigner,
  type ThemePreference,
} from "@margin/core"
import { Thread, applyTheme, useRoomSession, type SessionPool } from "@margin/ui"
import { SimplePool } from "nostr-tools"
import { bytesToHex, hexToBytes } from "nostr-tools/utils"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { chromeKv } from "./chromeKv"
import { isSkippableUrl } from "./skipUrl"

const PUBLIC_ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN ?? "http://localhost:5173"

function permalinkFor(normalized: string): string {
  return `${PUBLIC_ORIGIN}/u/${encodeURIComponent(normalized)}`
}

function probeBadge() {
  void browser.runtime.sendMessage({ type: "probeBadge" }).catch(() => {})
}

export function App() {
  const [tabUrl, setTabUrl] = useState<string | null>(null)
  const [pubkey, setPubkey] = useState<string | null>(null)
  const [pool, setPool] = useState<SimplePool | null>(null)
  const signerRef = useRef<Signer | null>(null)
  const user65Ref = useRef<ReturnType<typeof useRoomSession>["user65"]>(null)

  const roomState = useMemo(() => {
    if (!tabUrl || isSkippableUrl(tabUrl)) return { status: "skippable" as const }
    try {
      return { status: "ok" as const, url: normalizeUrl(tabUrl) }
    } catch (cause) {
      return { status: "invalid" as const, reason: cause instanceof NormalizeError ? cause.message : "invalid URL" }
    }
  }, [tabUrl])
  const room = roomState.status === "ok" ? roomState.url : null

  const session = useRoomSession({
    kv: chromeKv,
    room,
    pubkey,
    pool: pool as SessionPool | null,
    signerRef,
    onAfterWrite: probeBadge,
  })
  user65Ref.current = session.user65

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
    if (!room) {
      setPool(null)
      return
    }
    const next = new SimplePool()
    setPool(next)
    return () => {
      next.close(readRelays(user65Ref.current ?? undefined))
      setPool(null)
    }
  }, [room])

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
          await session.applyCachedSelf(hex)
          setPubkey(hex)
          return
        }
        if (stored.method === "bunker" && stored.bunkerPointer && stored.clientSkHex && pool) {
          const { signer } = await createBunkerSigner({
            bunkerUri: stored.bunkerPointer,
            clientSk: hexToBytes(stored.clientSkHex),
            pool,
          })
          signerRef.current = signer
          const hex = await signer.getPublicKey()
          await session.applyCachedSelf(hex)
          setPubkey(hex)
        }
      } catch {
        signerRef.current = null
        setPubkey(null)
      }
    })()
  }, [pool, room, session.applyCachedSelf])

  async function connectExtension() {
    const found = await detectExtensionSigner((id, message) => browser.runtime.sendMessage(id, message))
    if (!found) {
      session.setError("No extension signer found. Connect a bunker or install nos2x/Alby.")
      return
    }
    signerRef.current = found.signer
    const hex = await found.signer.getPublicKey()
    await session.applyCachedSelf(hex)
    setPubkey(hex)
    await chromeKv.set<StoredSigner>(KV_KEYS.signer, {
      method: "extension-message",
      extensionId: found.extensionId,
    })
    session.setError(null)
  }

  async function connectBunker() {
    const uri = window.prompt("Paste a bunker:// URI")
    if (!uri) return
    const active = pool ?? new SimplePool()
    if (!pool) setPool(active)
    const { signer, clientSk } = await createBunkerSigner({ bunkerUri: uri, pool: active })
    signerRef.current = signer
    const hex = await signer.getPublicKey()
    await session.applyCachedSelf(hex)
    setPubkey(hex)
    await chromeKv.set<StoredSigner>(KV_KEYS.signer, {
      method: "bunker",
      bunkerPointer: uri,
      clientSkHex: bytesToHex(clientSk),
    })
    session.setError(null)
  }

  async function logout() {
    await signerRef.current?.close?.()
    signerRef.current = null
    if (pubkey) evictProfileCache(pubkey)
    setPubkey(null)
    await chromeKv.delete(KV_KEYS.signer)
    await chromeKv.delete(KV_KEYS.selfProfile)
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
      nodes={session.nodes}
      profiles={session.profiles}
      self={pubkey}
      filter={session.filter}
      onFilter={session.onFilter}
      onReply={session.onReply}
      onMute={session.onMute}
      permalink={permalinkFor(room)}
      normalizedUrl={room}
      onCopyPermalink={() => navigator.clipboard.writeText(permalinkFor(room))}
      replyTo={session.replyTo}
      composeDisabled={!pubkey}
      onSubmit={session.onSubmit}
      onCancelReply={session.onCancelReply}
      pubkey={pubkey}
      hasFollows={session.hasFollows}
      onConnectNip07={() => void connectExtension()}
      onConnectBunker={() => void connectBunker()}
      onLogout={() => void logout()}
      errorMessage={session.error}
    />
  )
}
