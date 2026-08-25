import { Accordion } from "@heroui/react"
import { groupOwnWebComments } from "@margin/core"
import { applyTheme, renderText } from "@margin/ui"
import { useEffect, useMemo } from "react"
import { Link } from "react-router"
import { commentCountLabel, relativeTime, roomHref } from "../roomList"
import { useOwnComments } from "../useOwnComments"
import { useWebAuth } from "../WebAuth"

export function Me() {
  const { pubkey } = useWebAuth()
  const { comments, error, loading } = useOwnComments(pubkey)
  const groups = useMemo(() => groupOwnWebComments(comments), [comments])
  const firstRoom = groups[0]?.roomUrl

  useEffect(() => {
    applyTheme("dark")
    document.title = "My comments"
  }, [])

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
