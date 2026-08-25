import {
  applyFilter,
  buildReply,
  buildTopLevel,
  createCommentIngest,
  defaultFilterMode,
  fetchProfiles,
  hydrateSelfProfile,
  mutePubkey,
  nest,
  parseComment,
  persistSelfProfile,
  publishRoom,
  readRelays,
  readSocial,
  refreshSocial,
  relayListKey,
  subscribeRoom,
  unmutePubkey,
  writeRelays,
  type FilterMode,
  type Kv,
  type Nip65Lists,
  type PoolLike,
  type QueryPool,
  type Signer,
  type ThreadNode,
  type VerifiedComment,
} from "@margin/core"
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { showMutedToast } from "./muteToast"
import type { Profile } from "./Comment"

export type SessionPool = PoolLike & QueryPool

type Options = {
  kv: Kv
  room: string | null
  pubkey: string | null
  pool: SessionPool | null
  signerRef: RefObject<Signer | null>
  onAfterWrite?: () => void
  onSocialReady?: () => void
}

export function useRoomSession({ kv, room, pubkey, pool, signerRef, onAfterWrite, onSocialReady }: Options) {
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<VerifiedComment[]>([])
  const [filter, setFilter] = useState<FilterMode>("everyone")
  const [replyTo, setReplyTo] = useState<VerifiedComment | null>(null)
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map())
  const [follows, setFollows] = useState<string[]>([])
  const [mutes, setMutes] = useState<string[]>([])
  const [user65, setUser65] = useState<Nip65Lists | null>(null)
  const ingest = useRef(createCommentIngest()).current
  const filterTouched = useRef(false)
  const relaysKey = relayListKey(user65)

  const nodes: ThreadNode[] = useMemo(
    () =>
      applyFilter(nest(comments).roots, {
        mode: filter,
        follows: new Set(follows),
        muted: new Set(mutes),
        self: pubkey ?? undefined,
      }),
    [comments, filter, follows, mutes, pubkey],
  )

  useEffect(() => {
    setComments([])
    setReplyTo(null)
    ingest.reset()
  }, [ingest, room])

  useEffect(() => {
    if (!room || !pool) return
    const relays = readRelays(user65 ?? undefined)
    const sub = subscribeRoom(pool, relays, room, {
      onevent(comment) {
        if (!ingest.accept(comment.id)) return
        setComments((current) => (current.some((row) => row.id === comment.id) ? current : [...current, comment]))
      },
    })
    return () => sub.close()
  }, [ingest, pool, room, relaysKey, user65])

  useEffect(() => {
    const authors = [...new Set(comments.map((comment) => comment.pubkey).concat(pubkey ? [pubkey] : []))]
    if (authors.length === 0 || !pool) return
    let cancelled = false
    void fetchProfiles(pool, readRelays(user65 ?? undefined), authors).then((next) => {
      if (cancelled) return
      setProfiles((current) => {
        const merged = new Map(current)
        for (const [key, profile] of next) merged.set(key, profile)
        return merged
      })
      if (pubkey) void persistSelfProfile(kv, pubkey)
    })
    return () => {
      cancelled = true
    }
  }, [comments, kv, pool, pubkey, relaysKey, user65])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const snapshot = await readSocial(kv, pubkey)
      if (cancelled) return
      setMutes(snapshot.mutes)
      if (!pubkey) {
        setFollows([])
        setUser65(null)
        filterTouched.current = false
        setFilter("everyone")
        onSocialReady?.()
        return
      }
      setFollows(snapshot.follows)
      setUser65(snapshot.nip65)
      if (!filterTouched.current) setFilter(defaultFilterMode(snapshot.follows))
      onSocialReady?.()
      if (!pool) return
      const live = await refreshSocial(pool, readRelays(snapshot.nip65 ?? undefined), kv, pubkey)
      if (cancelled) return
      setFollows(live.follows)
      setUser65(live.nip65)
      if (!filterTouched.current) setFilter(defaultFilterMode(live.follows))
      onSocialReady?.()
    })()
    return () => {
      cancelled = true
    }
  }, [kv, onSocialReady, pool, pubkey])

  const applyCachedSelf = useCallback(
    async (hex: string) => {
      const profile = await hydrateSelfProfile(kv, hex)
      if (!profile) return
      setProfiles((current) => new Map(current).set(hex, profile))
    },
    [kv],
  )

  const onMute = useCallback(
    async (target: string) => {
      const next = await mutePubkey(kv, mutes, target)
      setMutes(next)
      showMutedToast(() => {
        void unmutePubkey(kv, next, target).then((undone) => {
          setMutes(undone)
          onAfterWrite?.()
        })
      })
      onAfterWrite?.()
    },
    [kv, mutes, onAfterWrite],
  )

  const onSubmit = useCallback(
    async (text: string) => {
      const signer = signerRef.current
      if (!room || !signer) return
      const unsigned = replyTo ? buildReply(room, text, replyTo) : buildTopLevel(room, text)
      const signed = await signer.signEvent(unsigned)
      const parsed = parseComment(signed, room)
      if (!parsed) {
        setError("Signer returned an event we could not verify.")
        return
      }
      if (ingest.accept(parsed.id)) {
        setComments((current) => (current.some((row) => row.id === parsed.id) ? current : [...current, parsed]))
      }
      if (pool) await publishRoom(pool, writeRelays(user65 ?? undefined), signed)
      setReplyTo(null)
      onAfterWrite?.()
    },
    [ingest, onAfterWrite, pool, replyTo, room, signerRef, user65],
  )

  return {
    error,
    setError,
    comments,
    nodes,
    filter,
    onFilter(next: FilterMode) {
      filterTouched.current = true
      setFilter(next)
    },
    replyTo,
    onReply(parentId: string) {
      setReplyTo(comments.find((row) => row.id === parentId) ?? null)
    },
    onCancelReply() {
      setReplyTo(null)
    },
    onMute,
    onSubmit,
    profiles,
    applyCachedSelf,
    user65,
    hasFollows: follows.length > 0,
  }
}
