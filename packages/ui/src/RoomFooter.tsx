import { Button } from "@heroui/react"

type RelayHealth = { url: string; status: "connected" | "failed" | "unknown" }

type Props = {
  normalizedUrl: string
  permalink: string
  onCopyPermalink: () => void
  relayHealth?: RelayHealth[]
}

export function RoomFooter({ normalizedUrl, permalink, onCopyPermalink, relayHealth }: Props) {
  return (
    <footer className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
      <p className="font-mono break-all text-xs text-[var(--muted-foreground)]">{normalizedUrl}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" aria-label={`Copy ${permalink}`} onPress={onCopyPermalink}>
          Copy thread
        </Button>
        {relayHealth?.length ? (
          <p className="text-xs text-[var(--muted-foreground)]">
            {relayHealth.filter((relay) => relay.status === "connected").length}/{relayHealth.length} relays
          </p>
        ) : null}
      </div>
    </footer>
  )
}
