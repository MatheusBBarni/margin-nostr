import { rankRooms } from "@margin/core"
import { applyTheme } from "@margin/ui"
import { useEffect, useMemo } from "react"
import { Link } from "react-router"
import { commentCountLabel, relativeTime, roomHref } from "../roomList"
import { useRecentRooms } from "../useRecentRooms"

export function Rooms() {
  const { comments, error, loading } = useRecentRooms()
  const rooms = useMemo(() => rankRooms(comments), [comments])

  useEffect(() => {
    applyTheme("dark")
    document.title = "Rooms"
  }, [])

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-normal tracking-tight text-pretty">Rooms</h1>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Recent comments on the relays we read. Not every room, and not an all-time rank.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {loading && rooms.length === 0 && !error ? (
        <p className="text-sm text-[var(--muted-foreground)]">Loading rooms…</p>
      ) : null}

      {!loading && rooms.length === 0 && !error ? (
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          No recent web comments on the relays we read.
        </p>
      ) : null}

      {rooms.length > 0 ? (
        <ul className="flex flex-col">
          {rooms.map((room) => (
            <li key={room.roomUrl}>
              <Link
                className="flex min-h-11 items-center gap-3 py-2 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                to={roomHref(room.roomUrl)}
              >
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--foreground)]" title={room.roomUrl}>
                  {room.roomUrl}
                </span>
                <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                  {commentCountLabel(room.commentCount)}
                </span>
                <time
                  className="shrink-0 text-xs text-[var(--muted-foreground)]"
                  dateTime={new Date(room.lastActivityAt * 1000).toISOString()}
                >
                  {relativeTime(room.lastActivityAt)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs leading-5 text-[var(--muted-foreground)]">
        This is a recent window, not a complete ranking. Rooms we did not just see are missing.
      </p>
    </main>
  )
}
