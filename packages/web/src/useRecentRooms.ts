import {
  CURATED_RELAYS,
  fetchRecentWebComments,
  mergeRecentWebComments,
  subscribeRecentWebComments,
  type OwnCommentQueryPool,
  type PoolLike,
  type RoomSub,
  type WebComment,
} from "@margin/core"
import { SimplePool } from "nostr-tools"
import { useEffect, useState } from "react"

const relays = [...CURATED_RELAYS]

export function useRecentRooms(): {
  comments: WebComment[]
  error: string | null
  loading: boolean
} {
  const [comments, setComments] = useState<WebComment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const pool = new SimplePool()
    const session = pool as unknown as PoolLike & OwnCommentQueryPool
    let cancelled = false
    let sub: RoomSub | undefined

    void (async () => {
      setLoading(true)
      try {
        const rows = await fetchRecentWebComments(session, relays)
        if (cancelled) return
        setComments((current) => mergeRecentWebComments(current, rows))
        setError(null)
      } catch {
        if (cancelled) return
        setError("Could not load rooms from the relays we use.")
      }
      if (cancelled) return
      setLoading(false)
      sub = subscribeRecentWebComments(session, relays, {
        onevent(comment) {
          if (cancelled) return
          setComments((current) => mergeRecentWebComments(current, [comment]))
        },
      })
    })()

    return () => {
      cancelled = true
      sub?.close()
      pool.close(relays)
    }
  }, [])

  return { comments, error, loading }
}
