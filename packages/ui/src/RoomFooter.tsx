import { formatRelayHealth, type RelayHealth } from "@margin/core"
import { Button, toast } from "@heroui/react"

type Props = {
  normalizedUrl: string
  permalink: string
  onCopyPermalink: () => void | Promise<void>
  relayHealth?: RelayHealth[]
}

export function RoomFooter({ normalizedUrl, permalink, onCopyPermalink, relayHealth }: Props) {
  async function copyThread() {
    try {
      await onCopyPermalink()
      toast.success("Link copied")
    } catch {
      toast.danger("Could not copy the link")
    }
  }

  return (
    <footer className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
      <p className="font-mono break-all text-xs text-[var(--muted-foreground)]">{normalizedUrl}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" aria-label={`Copy ${permalink}`} onPress={() => void copyThread()}>
          Copy thread
        </Button>
        {relayHealth?.length ? (
          <p role="status" aria-atomic="true" className="text-xs text-[var(--muted-foreground)]">
            {formatRelayHealth(relayHealth)}
          </p>
        ) : null}
      </div>
    </footer>
  )
}
