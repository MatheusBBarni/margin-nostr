import type { FilterMode, ThreadNode } from "@margin/core"
import { AuthBar } from "./AuthBar"
import { Comment, type Profile } from "./Comment"
import { Compose } from "./Compose"
import { FilterTabs } from "./FilterTabs"
import { RoomFooter } from "./RoomFooter"
import type { VerifiedComment } from "@margin/core"

type RelayHealth = { url: string; status: "connected" | "failed" | "unknown" }

type Props = {
  nodes: ThreadNode[]
  profiles: Map<string, Profile>
  self: string | null
  filter: FilterMode
  onFilter: (filter: FilterMode) => void
  onReply: (parentId: string) => void
  onMute?: (pubkey: string) => void
  permalink: string
  normalizedUrl: string
  onCopyPermalink: () => void
  relayHealth?: RelayHealth[]
  replyTo?: VerifiedComment | null
  composeDisabled: boolean
  onSubmit: (text: string) => Promise<void>
  onCancelReply?: () => void
  pubkey: string | null
  onConnectNip07?: () => void
  onConnectBunker: () => void
  onLogout: () => void
  errorMessage?: string | null
}

export function Thread({
  nodes,
  profiles,
  self,
  filter,
  onFilter,
  onReply,
  onMute,
  permalink,
  normalizedUrl,
  onCopyPermalink,
  relayHealth,
  replyTo = null,
  composeDisabled,
  onSubmit,
  onCancelReply,
  pubkey,
  onConnectNip07,
  onConnectBunker,
  onLogout,
  errorMessage,
}: Props) {
  const empty =
    filter === "follows"
      ? "None of your people have commented. Be the first, or see Everyone."
      : "No comments on this URL yet."

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-[var(--background)] p-4 text-[var(--foreground)]">
      <AuthBar
        pubkey={pubkey}
        onConnectNip07={onConnectNip07}
        onConnectBunker={onConnectBunker}
        onLogout={onLogout}
      />
      <FilterTabs filter={filter} onFilter={onFilter} />
      {errorMessage ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {errorMessage}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {nodes.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">{empty}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {nodes.map((node) => (
              <Comment
                key={node.comment.id}
                node={node}
                profiles={profiles}
                self={self}
                onReply={onReply}
                onMute={onMute}
              />
            ))}
          </div>
        )}
      </div>
      <Compose
        disabled={composeDisabled}
        replyTo={replyTo}
        onSubmit={onSubmit}
        onCancelReply={onCancelReply}
      />
      <RoomFooter
        normalizedUrl={normalizedUrl}
        permalink={permalink}
        onCopyPermalink={onCopyPermalink}
        relayHealth={relayHealth}
      />
    </div>
  )
}
