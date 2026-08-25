import {
  KV_KEYS,
  clearSessionSigner,
  createBunkerSigner,
  createNip07Signer,
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
import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router"
import { localKv } from "../localKv"

const PUBLIC_ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN ?? window.location.origin

function permalinkFor(normalized: string): string {
  return `${PUBLIC_ORIGIN}/u/${encodeURIComponent(normalized)}`
}

export function Room() {
  const params = useParams()
  const raw = useMemo(() => {
    const splat = params["*"] ?? ""
    if (!splat) return ""
    if (/^https?:\/\//i.test(splat)) return splat
    try {
      return decodeURIComponent(splat)
    } catch {
      return ""
    }
  }, [params])
  const [pubkey, setPubkey] = useState<string | null>(null)
  const [pool, setPool] = useState<SimplePool | null>(null)
  const signerRef = useRef<Signer | null>(null)
  const user65Ref = useRef<ReturnType<typeof useRoomSession>["user65"]>(null)

  const room = useMemo(() => {
    if (!raw) return null
    try {
      return normalizeUrl(raw)
    } catch {
      return null
    }
  }, [raw])

  const session = useRoomSession({
    kv: localKv,
    room,
    pubkey,
    pool: pool as SessionPool | null,
    signerRef,
  })
  user65Ref.current = session.user65

  useEffect(() => {
    void (async () => {
      const theme = (await localKv.get<ThemePreference>(KV_KEYS.theme)) ?? "system"
      applyTheme(theme)
    })()
  }, [])

  useEffect(() => {
    document.title = room ? `Comments on ${room}` : "Comments"
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
      const stored = parseStoredSigner(await localKv.get(KV_KEYS.signer))
      try {
        if (window.nostr) {
          const signer = createNip07Signer(window.nostr)
          signerRef.current = signer
          const hex = await signer.getPublicKey()
          await session.applyCachedSelf(hex)
          setPubkey(hex)
          await localKv.set<StoredSigner>(KV_KEYS.signer, { method: "nip07" })
          return
        }
        if (stored?.method === "bunker" && stored.bunkerPointer && stored.clientSkHex && pool) {
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

  async function connectNip07() {
    if (!window.nostr) {
      session.setError("No NIP-07 signer on this page.")
      return
    }
    const signer = createNip07Signer(window.nostr)
    signerRef.current = signer
    const hex = await signer.getPublicKey()
    await session.applyCachedSelf(hex)
    setPubkey(hex)
    await localKv.set<StoredSigner>(KV_KEYS.signer, { method: "nip07" })
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
    await localKv.set<StoredSigner>(KV_KEYS.signer, {
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
    await clearSessionSigner(localKv)
  }

  if (!room) {
    return (
      <main className="p-8 text-sm">
        <p role="alert">That is not a valid http(s) URL, so there is no room.</p>
      </main>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
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
        onConnectNip07={() => void connectNip07()}
        onConnectBunker={() => void connectBunker()}
        onLogout={() => void logout()}
        errorMessage={session.error}
      />
    </div>
  )
}
