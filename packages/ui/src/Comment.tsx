import { Avatar, Button } from "@heroui/react"
import type { ThreadNode } from "@margin/core"
import { renderText } from "./renderText"

export type Profile = {
  name?: string
  display_name?: string
  picture?: string
}

type Props = {
  node: ThreadNode
  profiles: Map<string, Profile>
  self: string | null
  onReply: (parentId: string) => void
  onMute: (pubkey: string) => void
}

function displayName(pubkey: string, profile?: Profile): string {
  return profile?.display_name || profile?.name || `${pubkey.slice(0, 8)}…${pubkey.slice(-4)}`
}

function relativeTime(createdAt: number): string {
  const delta = Math.max(0, Math.floor(Date.now() / 1000) - createdAt)
  if (delta < 60) return "just now"
  if (delta < 3600) return `${Math.floor(delta / 60)}m`
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`
  return `${Math.floor(delta / 86400)}d`
}

export function Comment({ node, profiles, self, onReply, onMute }: Props) {
  const { comment } = node
  const profile = profiles.get(comment.pubkey)
  const name = displayName(comment.pubkey, profile)
  const initial = name.slice(0, 2).toUpperCase()

  return (
    <article className="flex flex-col gap-2">
      <header className="flex items-start gap-2">
        <Avatar size="sm">
          {profile?.picture ? <Avatar.Image alt="" src={profile.picture} /> : null}
          <Avatar.Fallback>{initial}</Avatar.Fallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="truncate text-sm font-medium">{name}</span>
            <time className="text-xs text-[var(--muted-foreground)]" dateTime={new Date(comment.created_at * 1000).toISOString()}>
              {relativeTime(comment.created_at)}
            </time>
            {node.parentMissing ? (
              <span className="text-xs text-[var(--muted-foreground)]">parent missing</span>
            ) : null}
          </div>
          <div className="mt-1 whitespace-pre-wrap text-sm leading-6">{renderText(comment.content)}</div>
          <div className="mt-1 flex gap-1">
            <Button size="sm" variant="tertiary" onPress={() => onReply(comment.id)}>
              Reply
            </Button>
            {self !== comment.pubkey ? (
              <Button size="sm" variant="tertiary" onPress={() => onMute(comment.pubkey)}>
                Mute
              </Button>
            ) : null}
          </div>
        </div>
      </header>
      {node.children.length > 0 ? (
        <div className="ml-4 flex flex-col gap-3 border-l border-[var(--border)] pl-3">
          {node.children.map((child) => (
            <Comment
              key={child.comment.id}
              node={child}
              profiles={profiles}
              self={self}
              onReply={onReply}
              onMute={onMute}
            />
          ))}
        </div>
      ) : null}
    </article>
  )
}
