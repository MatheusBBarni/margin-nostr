import {
  fetchOwnComments,
  hydrateExtraRelays,
  mergeOwnWebComments,
  readRelays,
  readSocial,
  refreshSocial,
  subscribeOwnComments,
  writeRelays,
  type OwnCommentQueryPool,
  type PoolLike,
  type QueryPool,
  type RoomSub,
  type WebComment,
} from "@margin/core"
import { SimplePool } from "nostr-tools"
import { useEffect, useState } from "react"
import { localKv } from "./localKv"

function relayKey(urls: string[]): string {
  return urls.join("\0")
}

export function useOwnComments(pubkey: string | null): {
  comments: WebComment[]
  error: string | null
  loading: boolean
} {
  const [comments, setComments] = useState<WebComment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setComments([])
    setError(null)
    setLoading(false)
    if (!pubkey) return

    const pool = new SimplePool()
    const session = pool as unknown as PoolLike & QueryPool & OwnCommentQueryPool
    let cancelled = false
    let sub: RoomSub | undefined
    let closeRelays = readRelays()

    const listen = (relays: string[]) => {
      sub?.close()
      sub = subscribeOwnComments(session, relays, pubkey, {
        onevent(comment) {
          if (cancelled) return
          setComments((current) => mergeOwnWebComments(current, [comment], pubkey))
        },
      })
    }

    void (async () => {
      setLoading(true)
      const [snapshot, extras] = await Promise.all([readSocial(localKv, pubkey), hydrateExtraRelays(localKv)])
      if (cancelled) return
      closeRelays = readRelays(snapshot.nip65 ?? undefined, extras)
      let write = writeRelays(snapshot.nip65 ?? undefined, extras)
      try {
        const rows = await fetchOwnComments(session, write, pubkey)
        if (cancelled) return
        setComments((current) => mergeOwnWebComments(current, rows, pubkey))
        setError(null)
      } catch {
        if (cancelled) return
        setError("Could not load comments from the relays we use.")
      }
      if (cancelled) return
      setLoading(false)
      listen(write)

      const live = await refreshSocial(session, closeRelays, localKv, pubkey)
      if (cancelled) return
      closeRelays = readRelays(live.nip65 ?? undefined, extras)
      const nextWrite = writeRelays(live.nip65 ?? undefined, extras)
      if (relayKey(nextWrite) === relayKey(write)) return
      write = nextWrite
      try {
        const rows = await fetchOwnComments(session, write, pubkey)
        if (cancelled) return
        setComments((current) => mergeOwnWebComments(current, rows, pubkey))
        setError(null)
      } catch {
        if (!cancelled) setError("Could not load comments from the relays we use.")
      }
      if (!cancelled) listen(write)
    })()

    return () => {
      cancelled = true
      sub?.close()
      pool.close(closeRelays)
    }
  }, [pubkey])

  return { comments, error, loading }
}
