import {
  applyFilter,
  buildReply,
  buildTopLevel,
  createCommentIngest,
  defaultFilterMode,
  fetchProfiles,
  hydrateExtraRelays,
  hydrateSelfProfile,
  KV_KEYS,
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
  type FilterPreference,
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
  prefsEpoch?: number
  onAfterWrite?: () => void
  onSocialReady?: () => void
}

function parseFilterPref(value: unknown): FilterPreference | null {
  return value === "follows" || value === "everyone" ? value : null
}

export function useRoomSession({
  kv,
  room,
  pubkey,
  pool,
  signerRef,
  prefsEpoch = 0,
  onAfterWrite,
  onSocialReady,
}: Options) {
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<VerifiedComment[]>([])
  const [filter, setFilter] = useState<FilterMode>("everyone")
  const [replyTo, setReplyTo] = useState<VerifiedComment | null>(null)
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map())
  const [follows, setFollows] = useState<string[]>([])
  const [mutes, setMutes] = useState<string[]>([])
  const [user65, setUser65] = useState<Nip65Lists | null>(null)
  const [extraRelays, setExtraRelays] = useState<string[]>([])
  const ingest = useRef(createCommentIngest()).current
  const filterTouched = useRef(false)
  const relaysKey = `${relayListKey(user65)}\n${extraRelays.join("\0")}`

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
    const relays = readRelays(user65 ?? undefined, extraRelays)
    const sub = subscribeRoom(pool, relays, room, {
      onevent(comment) {
        if (!ingest.accept(comment.id)) return
        setComments((current) => (current.some((row) => row.id === comment.id) ? current : [...current, comment]))
      },
    })
    return () => sub.close()
  }, [extraRelays, ingest, pool, room, relaysKey, user65])

  useEffect(() => {
    const authors = [...new Set(comments.map((comment) => comment.pubkey).concat(pubkey ? [pubkey] : []))]
    if (authors.length === 0 || !pool) return
    let cancelled = false
    void fetchProfiles(pool, readRelays(user65 ?? undefined, extraRelays), authors).then((next) => {
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
  }, [comments, extraRelays, kv, pool, pubkey, relaysKey, user65])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [snapshot, extras, storedFilter] = await Promise.all([
        readSocial(kv, pubkey),
        hydrateExtraRelays(kv),
        kv.get(KV_KEYS.defaultFilter),
      ])
      if (cancelled) return
      setMutes(snapshot.mutes)
      setExtraRelays(extras)
      const pref = parseFilterPref(storedFilter)
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
      if (!filterTouched.current) setFilter(defaultFilterMode(snapshot.follows, pref))
      onSocialReady?.()
      if (!pool) return
      const live = await refreshSocial(pool, readRelays(snapshot.nip65 ?? undefined, extras), kv, pubkey)
      if (cancelled) return
      setFollows(live.follows)
      setUser65(live.nip65)
      if (!filterTouched.current) setFilter(defaultFilterMode(live.follows, pref))
      onSocialReady?.()
    })()
    return () => {
      cancelled = true
    }
  }, [kv, onSocialReady, pool, prefsEpoch, pubkey])

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
      if (pool) await publishRoom(pool, writeRelays(user65 ?? undefined, extraRelays), signed)
      setReplyTo(null)
      onAfterWrite?.()
    },
    [extraRelays, ingest, onAfterWrite, pool, replyTo, room, signerRef, user65],
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
    extraRelays,
    hasFollows: follows.length > 0,
  }
}
