import {
  KV_KEYS,
  NormalizeError,
  clearSessionSigner,
  createBunkerSigner,
  createExtensionMessageSigner,
  detectExtensionSigner,
  evictProfileCache,
  normalizeUrl,
  parseStoredSigner,
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
import {
  decideFocusTarget,
  shouldApplyOpenFocus,
  shouldHandleComposeShortcut,
  type FocusTarget,
} from "./panelKeyboard"
import { isSkippableUrl } from "./skipUrl"

const PUBLIC_ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN ?? "http://localhost:5173"
const PANEL_PORT = "sidepanel"

function targetIsEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true
  }
  return target.isContentEditable
}

function landFocus(target: FocusTarget) {
  if (target === "compose") {
    document.querySelector<HTMLElement>("[data-margin-compose]")?.focus()
    return
  }
  if (target === "auth") {
    document.querySelector<HTMLElement>("[data-margin-auth] button")?.focus()
  }
}

function permalinkFor(normalized: string): string {
  return `${PUBLIC_ORIGIN}/u/${encodeURIComponent(normalized)}`
}

function probeBadge() {
  void browser.runtime.sendMessage({ type: "probeBadge" }).catch(() => {})
}

function sendToExtension(id: string, message: { type: string; params: Record<string, unknown> }) {
  return browser.runtime.sendMessage(id, message)
}

export function App() {
  const [tabUrl, setTabUrl] = useState<string | null>(null)
  const [tabReady, setTabReady] = useState(false)
  const [pubkey, setPubkey] = useState<string | null>(null)
  const [signerReady, setSignerReady] = useState(false)
  const [pool, setPool] = useState<SimplePool | null>(null)
  const [prefsEpoch, setPrefsEpoch] = useState(0)
  const [signerEpoch, setSignerEpoch] = useState(0)
  const signerRef = useRef<Signer | null>(null)
  const user65Ref = useRef<ReturnType<typeof useRoomSession>["user65"]>(null)
  const extraRelaysRef = useRef<string[]>([])
  const userMovedFocusRef = useRef(false)
  const openFocusAttemptedRef = useRef(false)
  const focusStateRef = useRef({
    signerReady: false,
    hasSigner: false,
    roomFocusable: false,
  })

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
    prefsEpoch,
    onAfterWrite: probeBadge,
    onSocialReady: probeBadge,
  })
  user65Ref.current = session.user65
  extraRelaysRef.current = session.extraRelays
  focusStateRef.current = {
    signerReady,
    hasSigner: Boolean(pubkey),
    roomFocusable: roomState.status === "ok",
  }

  const refreshTab = useCallback(async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    setTabUrl(tabs[0]?.url ?? null)
    setTabReady(true)
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
    const onChanged: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, area) => {
      if (area !== "local") return
      if (changes[KV_KEYS.theme]) {
        const theme = (changes[KV_KEYS.theme].newValue as ThemePreference | undefined) ?? "system"
        applyTheme(theme)
      }
      if (changes[KV_KEYS.signer]) setSignerEpoch((n) => n + 1)
      if (changes[KV_KEYS.mutes] || changes[KV_KEYS.defaultFilter] || changes[KV_KEYS.extraRelays]) {
        setPrefsEpoch((n) => n + 1)
      }
    }
    browser.storage.onChanged.addListener(onChanged)
    return () => browser.storage.onChanged.removeListener(onChanged)
  }, [])

  useEffect(() => {
    if (!room) {
      setPool(null)
      return
    }
    const next = new SimplePool()
    setPool(next)
    return () => {
      next.close(readRelays(user65Ref.current ?? undefined, extraRelaysRef.current))
      setPool(null)
    }
  }, [room])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const stored = parseStoredSigner(await chromeKv.get(KV_KEYS.signer))
      if (!stored) {
        await signerRef.current?.close?.()
        signerRef.current = null
        if (!cancelled) {
          setPubkey(null)
          setSignerReady(true)
        }
        return
      }
      if (stored.method === "bunker" && stored.bunkerPointer && stored.clientSkHex && !pool) {
        return
      }
      try {
        if (stored.method === "extension-message" && stored.extensionId) {
          const signer = createExtensionMessageSigner(sendToExtension, stored.extensionId)
          signerRef.current = signer
          const hex = await signer.getPublicKey()
          await session.applyCachedSelf(hex)
          if (!cancelled) setPubkey(hex)
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
          if (!cancelled) setPubkey(hex)
        }
      } catch {
        signerRef.current = null
        if (!cancelled) setPubkey(null)
      } finally {
        if (!cancelled) setSignerReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pool, room, session.applyCachedSelf, signerEpoch])

  useEffect(() => {
    const markMoved = () => {
      userMovedFocusRef.current = true
    }
    document.addEventListener("pointerdown", markMoved)
    document.addEventListener("keydown", markMoved)
    return () => {
      document.removeEventListener("pointerdown", markMoved)
      document.removeEventListener("keydown", markMoved)
    }
  }, [])

  useEffect(() => {
    const port = browser.runtime.connect({ name: PANEL_PORT })
    const onMessage = (message: { type?: string }) => {
      if (message?.type !== "landFocus") return
      landFocus(decideFocusTarget(focusStateRef.current))
    }
    port.onMessage.addListener(onMessage)
    return () => {
      port.onMessage.removeListener(onMessage)
      port.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!tabReady || !signerReady || openFocusAttemptedRef.current) return
    if (!shouldApplyOpenFocus({ userHasMovedFocus: userMovedFocusRef.current })) {
      openFocusAttemptedRef.current = true
      return
    }
    const target = decideFocusTarget(focusStateRef.current)
    if (target === "wait") return
    openFocusAttemptedRef.current = true
    landFocus(target)
  }, [tabReady, signerReady, pubkey, roomState.status])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !shouldHandleComposeShortcut({
          key: event.key,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          targetIsEditable: targetIsEditable(event.target),
        })
      ) {
        return
      }
      event.preventDefault()
      landFocus(decideFocusTarget(focusStateRef.current))
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  async function connectExtension() {
    const found = await detectExtensionSigner(sendToExtension)
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
    await clearSessionSigner(chromeKv)
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
