import { Tabs, Toast } from "@heroui/react"
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
  onCopyPermalink: () => void | Promise<void>
  relayHealth?: RelayHealth[]
  replyTo?: VerifiedComment | null
  composeDisabled: boolean
  onSubmit: (text: string) => Promise<void>
  onCancelReply?: () => void
  pubkey: string | null
  hasFollows?: boolean
  showAuth?: boolean
  onConnectNip07?: () => void
  onConnectBunker?: () => void
  onLogout?: () => void
  errorMessage?: string | null
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1 py-6">
      <p className="text-sm">{title}</p>
      <p className="text-sm leading-6 text-[var(--muted-foreground)]">{body}</p>
    </div>
  )
}

function followsEmpty(pubkey: string | null, hasFollows: boolean) {
  if (!pubkey) {
    return {
      title: "Follows shows people you follow",
      body: "Connect a signer to load that list. Everyone is the full room.",
    }
  }
  if (!hasFollows) {
    return {
      title: "No follow list yet",
      body: "When you follow people on Nostr, their comments land here. Everyone is still the open thread.",
    }
  }
  return {
    title: "None of your people have commented",
    body: "Be the first, or open Everyone.",
  }
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
  hasFollows = false,
  showAuth = true,
  onConnectNip07,
  onConnectBunker,
  onLogout,
  errorMessage,
}: Props) {
  const list =
    nodes.length === 0 ? null : (
      <div className="flex flex-col gap-8">
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
    )
  const followsCopy = followsEmpty(pubkey, hasFollows)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-[var(--background)] p-4 text-[var(--foreground)]">
      <Toast.Provider placement="bottom" width="min(360px, calc(100% - 24px))" />
      {showAuth && onConnectBunker && onLogout ? (
        <AuthBar
          pubkey={pubkey}
          profile={pubkey ? profiles.get(pubkey) : undefined}
          onConnectNip07={onConnectNip07}
          onConnectBunker={onConnectBunker}
          onLogout={onLogout}
        />
      ) : null}
      {errorMessage ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {errorMessage}
        </p>
      ) : null}
      <FilterTabs filter={filter} onFilter={onFilter}>
        <Tabs.Panel className="min-h-0 flex-1 overflow-y-auto pt-4" id="follows">
          {filter === "follows" ? list ?? <EmptyState title={followsCopy.title} body={followsCopy.body} /> : null}
        </Tabs.Panel>
        <Tabs.Panel className="min-h-0 flex-1 overflow-y-auto pt-4" id="everyone">
          {filter === "everyone" ? (
            list ?? (
              <EmptyState
                title="No comments on this URL yet"
                body="This room is empty. You can start it if you want."
              />
            )
          ) : null}
        </Tabs.Panel>
      </FilterTabs>
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
