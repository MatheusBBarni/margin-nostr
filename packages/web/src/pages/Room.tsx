import {
  KV_KEYS,
  NormalizeError,
  applyFilter,
  buildReply,
  buildTopLevel,
  createBunkerSigner,
  createNip07Signer,
  nest,
  normalizeUrl,
  parseComment,
  publishRoom,
  readRelays,
  subscribeRoom,
  writeRelays,
  type Signer,
  type StoredSigner,
  type ThemePreference,
  type ThreadNode,
  type VerifiedComment,
} from "@margin/core"
import { Thread, applyTheme } from "@margin/ui"
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
  const raw = params["*"] ? decodeURIComponent(params["*"]) : ""
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<VerifiedComment[]>([])
  const [filter, setFilter] = useState<"follows" | "everyone">("everyone")
  const [replyTo, setReplyTo] = useState<VerifiedComment | null>(null)
  const [pubkey, setPubkey] = useState<string | null>(null)
  const signerRef = useRef<Signer | null>(null)
  const poolRef = useRef<SimplePool | null>(null)

  const room = useMemo(() => {
    if (!raw) return null
    try {
      return normalizeUrl(raw)
    } catch (cause) {
      return cause instanceof NormalizeError ? null : null
    }
  }, [raw])

  const nodes: ThreadNode[] = useMemo(() => {
    const nested = nest(comments)
    return applyFilter(nested.roots, {
      mode: filter,
      follows: new Set(),
      muted: new Set(),
      self: pubkey ?? undefined,
    })
  }, [comments, filter, pubkey])

  useEffect(() => {
    void (async () => {
      const theme = (await localKv.get<ThemePreference>(KV_KEYS.theme)) ?? "system"
      applyTheme(theme)
    })()
  }, [])

  useEffect(() => {
    if (!room) {
      document.title = "Comments"
      setComments([])
      return
    }
    document.title = `Comments on ${room}`
    const pool = new SimplePool()
    poolRef.current = pool
    const sub = subscribeRoom(pool, readRelays(), room, {
      onevent(comment) {
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
    void (async () => {
      const stored = await localKv.get<StoredSigner>(KV_KEYS.signer)
      try {
        if (window.nostr) {
          const signer = createNip07Signer(window.nostr)
          signerRef.current = signer
          setPubkey(await signer.getPublicKey())
          await localKv.set<StoredSigner>(KV_KEYS.signer, { method: "nip07" })
          return
        }
        if (stored?.method === "bunker" && stored.bunkerPointer && stored.clientSkHex && poolRef.current) {
          const { signer } = await createBunkerSigner({
            bunkerUri: stored.bunkerPointer,
            clientSk: hexToBytes(stored.clientSkHex),
            pool: poolRef.current,
          })
          signerRef.current = signer
          setPubkey(await signer.getPublicKey())
        }
      } catch {
        signerRef.current = null
        setPubkey(null)
      }
    })()
  }, [room])

  async function connectNip07() {
    if (!window.nostr) {
      setError("No NIP-07 signer on this page.")
      return
    }
    const signer = createNip07Signer(window.nostr)
    signerRef.current = signer
    setPubkey(await signer.getPublicKey())
    await localKv.set<StoredSigner>(KV_KEYS.signer, { method: "nip07" })
    setError(null)
  }

  async function connectBunker() {
    const uri = window.prompt("Paste a bunker:// URI")
    if (!uri) return
    const pool = poolRef.current ?? new SimplePool()
    poolRef.current = pool
    const { signer, clientSk } = await createBunkerSigner({ bunkerUri: uri, pool })
    signerRef.current = signer
    setPubkey(await signer.getPublicKey())
    await localKv.set<StoredSigner>(KV_KEYS.signer, {
      method: "bunker",
      bunkerPointer: uri,
      clientSkHex: bytesToHex(clientSk),
    })
    setError(null)
  }

  async function logout() {
    await signerRef.current?.close?.()
    signerRef.current = null
    setPubkey(null)
    await localKv.delete(KV_KEYS.signer)
  }

  async function onSubmit(text: string) {
    if (!room || !signerRef.current) return
    const unsigned = replyTo ? buildReply(room, text, replyTo) : buildTopLevel(room, text)
    const signed = await signerRef.current.signEvent(unsigned)
    const parsed = parseComment(signed, room)
    if (parsed) setComments((current) => [...current, parsed])
    await publishRoom(poolRef.current ?? new SimplePool(), writeRelays(), signed)
    setReplyTo(null)
  }

  if (!room) {
    return (
      <main className="p-8 text-sm">
        <p role="alert">That is not a valid http(s) URL, so there is no room.</p>
      </main>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      <Thread
        nodes={nodes}
        profiles={new Map()}
        self={pubkey}
        filter={filter}
        onFilter={setFilter}
        onReply={(parentId) => setReplyTo(comments.find((row) => row.id === parentId) ?? null)}
        onMute={() => undefined}
        permalink={permalinkFor(room)}
        normalizedUrl={room}
        replyTo={replyTo}
        composeDisabled={!pubkey}
        onSubmit={onSubmit}
        onCancelReply={() => setReplyTo(null)}
        pubkey={pubkey}
        onConnectNip07={() => void connectNip07()}
        onConnectBunker={() => void connectBunker()}
        onLogout={() => void logout()}
        errorMessage={error}
      />
    </div>
  )
}
