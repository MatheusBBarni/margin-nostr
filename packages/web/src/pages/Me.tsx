import { Accordion } from "@heroui/react"
import {
  ROOM_EVENT_CAP,
  fetchOwnComments,
  groupOwnWebComments,
  hydrateExtraRelays,
  readRelays,
  readSocial,
  refreshSocial,
  subscribeOwnComments,
  writeRelays,
  type Nip65Lists,
  type WebComment,
} from "@margin/core"
import { applyTheme, renderText, type SessionPool } from "@margin/ui"
import { SimplePool } from "nostr-tools"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import { localKv } from "../localKv"
import { useWebAuth } from "../WebAuth"

function relativeTime(createdAt: number): string {
  const delta = Math.max(0, Math.floor(Date.now() / 1000) - createdAt)
  if (delta < 60) return "just now"
  if (delta < 3600) return `${Math.floor(delta / 60)}m`
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`
  return `${Math.floor(delta / 86400)}d`
}

function takeNewest(comments: WebComment[], pubkey: string): WebComment[] {
  const self = pubkey.toLowerCase()
  const byId = new Map<string, WebComment>()
  for (const comment of comments) {
    if (comment.pubkey.toLowerCase() !== self) continue
    byId.set(comment.id, comment)
  }
  return [...byId.values()].sort((a, b) => b.created_at - a.created_at).slice(0, ROOM_EVENT_CAP)
}

function roomHref(roomUrl: string): string {
  return `/u/${encodeURIComponent(roomUrl)}`
}

function commentCountLabel(count: number): string {
  return count === 1 ? "1 comment" : `${count} comments`
}

export function Me() {
  const { pubkey } = useWebAuth()
  const [pool, setPool] = useState<SimplePool | null>(null)
  const [user65, setUser65] = useState<Nip65Lists | null>(null)
  const [extraRelays, setExtraRelays] = useState<string[]>([])
  const [comments, setComments] = useState<WebComment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const user65Ref = useRef(user65)
  const extraRef = useRef(extraRelays)
  user65Ref.current = user65
  extraRef.current = extraRelays
  const groups = useMemo(() => groupOwnWebComments(comments), [comments])
  const firstRoom = groups[0]?.roomUrl

  useEffect(() => {
    applyTheme("dark")
    document.title = "My comments"
  }, [])

  useEffect(() => {
    setComments([])
    setError(null)
    setLoading(false)
    setUser65(null)
    setExtraRelays([])
    if (!pubkey) {
      setPool(null)
      return
    }
    const next = new SimplePool()
    setPool(next)
    return () => {
      next.close(readRelays(user65Ref.current ?? undefined, extraRef.current))
      setPool(null)
    }
  }, [pubkey])

  useEffect(() => {
    if (!pubkey || !pool) return
    let cancelled = false
    void (async () => {
      const [snapshot, extras] = await Promise.all([readSocial(localKv, pubkey), hydrateExtraRelays(localKv)])
      if (cancelled) return
      setUser65(snapshot.nip65)
      setExtraRelays(extras)
      const live = await refreshSocial(
        pool as SessionPool,
        readRelays(snapshot.nip65 ?? undefined, extras),
        localKv,
        pubkey,
      )
      if (cancelled) return
      setUser65(live.nip65)
    })()
    return () => {
      cancelled = true
    }
  }, [pool, pubkey])

  useEffect(() => {
    if (!pubkey || !pool) return
    let cancelled = false
    const relays = writeRelays(user65 ?? undefined, extraRelays)
    setLoading(true)
    void fetchOwnComments(pool as SessionPool, relays, pubkey)
      .then((rows) => {
        if (cancelled) return
        setComments((current) => takeNewest([...rows, ...current], pubkey))
        setError(null)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError("Could not load comments from the relays we use.")
        setLoading(false)
      })
    const sub = subscribeOwnComments(pool as SessionPool, relays, pubkey, {
      onevent(comment) {
        if (cancelled) return
        setComments((current) => takeNewest([comment, ...current], pubkey))
      },
    })
    return () => {
      cancelled = true
      sub.close()
    }
  }, [extraRelays, pool, pubkey, user65])

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-normal tracking-tight text-pretty">My comments</h1>
        {pubkey ? (
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            A recent window of notes this key posted on web URLs. Not a complete archive.
          </p>
        ) : (
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Connect a signer to see comments you posted.
          </p>
        )}
      </div>

      {pubkey && error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {pubkey && loading && comments.length === 0 && !error ? (
        <p className="text-sm text-[var(--muted-foreground)]">Loading comments…</p>
      ) : null}

      {pubkey && !loading && comments.length === 0 && !error ? (
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          No comments from this key on the relays we read.
        </p>
      ) : null}

      {pubkey && groups.length > 0 ? (
        <Accordion
          allowsMultipleExpanded
          className="w-full"
          defaultExpandedKeys={firstRoom ? [firstRoom] : []}
        >
          {groups.map((group) => (
            <Accordion.Item key={group.roomUrl} id={group.roomUrl}>
              <Accordion.Heading>
                <Accordion.Trigger className="flex min-h-11 w-full items-center gap-3 text-left">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs" title={group.roomUrl}>
                    {group.roomUrl}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                    {commentCountLabel(group.comments.length)}
                  </span>
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="flex flex-col gap-6">
                  <Link
                    className="font-mono break-all text-xs text-[var(--action)] no-underline hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                    to={roomHref(group.roomUrl)}
                  >
                    Open room
                  </Link>
                  <ul className="flex flex-col gap-6">
                    {group.comments.map((comment) => (
                      <li key={comment.id}>
                        <article className="flex flex-col gap-2">
                          <header className="flex flex-wrap items-baseline gap-2">
                            <time
                              className="text-xs text-[var(--muted-foreground)]"
                              dateTime={new Date(comment.created_at * 1000).toISOString()}
                            >
                              {relativeTime(comment.created_at)}
                            </time>
                            {comment.parentId ? (
                              <span className="text-xs text-[var(--muted-foreground)]">reply</span>
                            ) : null}
                          </header>
                          <div className="whitespace-pre-wrap text-sm leading-6">{renderText(comment.content)}</div>
                        </article>
                      </li>
                    ))}
                  </ul>
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      ) : null}

      {pubkey ? (
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
          This is what the relays we use know about. Notes posted onto other relays will be missing.
        </p>
      ) : null}
    </main>
  )
}
