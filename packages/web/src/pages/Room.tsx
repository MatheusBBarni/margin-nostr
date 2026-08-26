import { KV_KEYS, NormalizeError, normalizeUrl, readRelays, type ThemePreference } from "@margin/core"
import { Thread, applyTheme, useRoomSession, type SessionPool } from "@margin/ui"
import { SimplePool } from "nostr-tools"
import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router"
import { localKv } from "../localKv"
import { useWebAuth } from "../WebAuth"

const PUBLIC_ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN ?? window.location.origin

function permalinkFor(normalized: string): string {
  return `${PUBLIC_ORIGIN}/u/${encodeURIComponent(normalized)}`
}

export function Room() {
  const params = useParams()
  const { pubkey, signerRef } = useWebAuth()
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
  const [pool, setPool] = useState<SimplePool | null>(null)
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
    if (pubkey) void session.applyCachedSelf(pubkey)
  }, [pubkey, session.applyCachedSelf])

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
        relayHealth={session.relayHealth}
        replyTo={session.replyTo}
        composeDisabled={!pubkey}
        onSubmit={session.onSubmit}
        onCancelReply={session.onCancelReply}
        pubkey={pubkey}
        hasFollows={session.hasFollows}
        showAuth={false}
        errorMessage={session.error}
      />
    </div>
  )
}
