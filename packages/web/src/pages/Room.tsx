import {
  KV_KEYS,
  addMute,
  applyFilter,
  buildReply,
  buildTopLevel,
  createBunkerSigner,
  createNip07Signer,
  defaultFilterMode,
  evictProfileCache,
  fetchProfiles,
  hydrateSelfProfile,
  nest,
  normalizeUrl,
  parseComment,
  persistMutes,
  persistSelfProfile,
  publishRoom,
  readRelays,
  readSocial,
  refreshSocial,
  removeMute,
  subscribeRoom,
  writeRelays,
  type FilterMode,
  type Nip65Lists,
  type Profile,
  type Signer,
  type StoredSigner,
  type ThemePreference,
  type ThreadNode,
  type VerifiedComment,
} from "@margin/core"
import { Thread, applyTheme, showMutedToast } from "@margin/ui"
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
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<VerifiedComment[]>([])
  const [filter, setFilter] = useState<FilterMode>("everyone")
  const [replyTo, setReplyTo] = useState<VerifiedComment | null>(null)
  const [pubkey, setPubkey] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map())
  const [follows, setFollows] = useState<string[]>([])
  const [mutes, setMutes] = useState<string[]>([])
  const [user65, setUser65] = useState<Nip65Lists | null>(null)
  const signerRef = useRef<Signer | null>(null)
  const poolRef = useRef<SimplePool | null>(null)
  const seenRef = useRef(new Set<string>())
  const filterTouchedRef = useRef(false)
  const user65Ref = useRef<Nip65Lists | null>(null)

  const room = useMemo(() => {
    if (!raw) return null
    try {
      return normalizeUrl(raw)
    } catch {
      return null
    }
  }, [raw])
  const relayKey = user65 ? `${user65.read.join("\0")}\n${user65.write.join("\0")}` : ""

  const nodes: ThreadNode[] = useMemo(() => {
    const nested = nest(comments)
    return applyFilter(nested.roots, {
      mode: filter,
      follows: new Set(follows),
      muted: new Set(mutes),
      self: pubkey ?? undefined,
    })
  }, [comments, filter, follows, mutes, pubkey])

  useEffect(() => {
    void (async () => {
      const theme = (await localKv.get<ThemePreference>(KV_KEYS.theme)) ?? "system"
      applyTheme(theme)
    })()
  }, [])

  useEffect(() => {
    setComments([])
    setReplyTo(null)
    seenRef.current = new Set()
    if (!room) document.title = "Comments"
    else document.title = `Comments on ${room}`
  }, [room])

  useEffect(() => {
    if (!room) return
    const pool = new SimplePool()
    poolRef.current = pool
    return () => {
      pool.close(readRelays(user65Ref.current ?? undefined))
      poolRef.current = null
    }
  }, [room])

  useEffect(() => {
    user65Ref.current = user65
  }, [user65])

  useEffect(() => {
    if (!room || !poolRef.current) return
    const relays = readRelays(user65 ?? undefined)
    const sub = subscribeRoom(poolRef.current, relays, room, {
      onevent(comment) {
        if (seenRef.current.has(comment.id)) return
        seenRef.current.add(comment.id)
        setComments((current) => (current.some((row) => row.id === comment.id) ? current : [...current, comment]))
      },
    })
    return () => sub.close()
  }, [room, relayKey])

  useEffect(() => {
    const pubkeys = [...new Set(comments.map((comment) => comment.pubkey).concat(pubkey ? [pubkey] : []))]
    if (pubkeys.length === 0) return
    const pool = poolRef.current ?? new SimplePool()
    const relays = readRelays(user65 ?? undefined)
    let cancelled = false
    void fetchProfiles(pool, relays, pubkeys).then((next) => {
      if (cancelled) return
      setProfiles((current) => {
        const merged = new Map(current)
        for (const [key, profile] of next) merged.set(key, profile)
        return merged
      })
      if (pubkey) void persistSelfProfile(localKv, pubkey)
    })
    return () => {
      cancelled = true
    }
  }, [comments, pubkey, relayKey])

  useEffect(() => {
    void (async () => {
      const stored = await localKv.get<StoredSigner>(KV_KEYS.signer)
      try {
        if (window.nostr) {
          const signer = createNip07Signer(window.nostr)
          signerRef.current = signer
          const hex = await signer.getPublicKey()
          await applyCachedSelf(hex)
          setPubkey(hex)
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

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const snapshot = await readSocial(localKv, pubkey)
      if (cancelled) return
      setMutes(snapshot.mutes)
      if (!pubkey) {
        setFollows([])
        setUser65(null)
        filterTouchedRef.current = false
        setFilter("everyone")
        return
      }
      setFollows(snapshot.follows)
      setUser65(snapshot.nip65)
      if (!filterTouchedRef.current) setFilter(defaultFilterMode(snapshot.follows))

      const pool = poolRef.current ?? new SimplePool()
      const live = await refreshSocial(pool, readRelays(snapshot.nip65 ?? undefined), localKv, pubkey)
      if (cancelled) return
      setFollows(live.follows)
      setUser65(live.nip65)
      if (!filterTouchedRef.current) setFilter(defaultFilterMode(live.follows))
    })()
    return () => {
      cancelled = true
    }
  }, [pubkey])

  async function connectNip07() {
    if (!window.nostr) {
      setError("No NIP-07 signer on this page.")
      return
    }
    const signer = createNip07Signer(window.nostr)
    signerRef.current = signer
    const hex = await signer.getPublicKey()
    await applyCachedSelf(hex)
    setPubkey(hex)
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
    const hex = await signer.getPublicKey()
    await applyCachedSelf(hex)
    setPubkey(hex)
    await localKv.set<StoredSigner>(KV_KEYS.signer, {
      method: "bunker",
      bunkerPointer: uri,
      clientSkHex: bytesToHex(clientSk),
    })
    setError(null)
  }

  async function applyCachedSelf(hex: string) {
    const profile = await hydrateSelfProfile(localKv, hex)
    if (!profile) return
    setProfiles((current) => new Map(current).set(hex, profile))
  }

  async function logout() {
    await signerRef.current?.close?.()
    signerRef.current = null
    if (pubkey) evictProfileCache(pubkey)
    setPubkey(null)
    setProfiles(new Map())
    await localKv.delete(KV_KEYS.signer)
    await localKv.delete(KV_KEYS.selfProfile)
  }

  async function onMute(target: string) {
    const next = addMute(mutes, target)
    setMutes(next)
    await persistMutes(localKv, next)
    showMutedToast(() => {
      void (async () => {
        const undone = removeMute(next, target)
        setMutes(undone)
        await persistMutes(localKv, undone)
      })()
    })
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
    seenRef.current.add(parsed.id)
    setComments((current) => (current.some((row) => row.id === parsed.id) ? current : [...current, parsed]))
    await publishRoom(poolRef.current ?? new SimplePool(), writeRelays(user65 ?? undefined), signed)
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
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <Thread
        nodes={nodes}
        profiles={profiles}
        self={pubkey}
        filter={filter}
        onFilter={(next) => {
          filterTouchedRef.current = true
          setFilter(next)
        }}
        onReply={(parentId) => setReplyTo(comments.find((row) => row.id === parentId) ?? null)}
        onMute={onMute}
        permalink={permalinkFor(room)}
        normalizedUrl={room}
        onCopyPermalink={() => navigator.clipboard.writeText(permalinkFor(room))}
        replyTo={replyTo}
        composeDisabled={!pubkey}
        onSubmit={onSubmit}
        onCancelReply={() => setReplyTo(null)}
        pubkey={pubkey}
        hasFollows={follows.length > 0}
        onConnectNip07={() => void connectNip07()}
        onConnectBunker={() => void connectBunker()}
        onLogout={() => void logout()}
        errorMessage={error}
      />
    </div>
  )
}
