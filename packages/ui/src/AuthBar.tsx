import { Button } from "@heroui/react"

type Props = {
  pubkey: string | null
  onConnectNip07?: () => void
  onConnectBunker: () => void
  onLogout: () => void
}

function shortNpub(hex: string): string {
  return `${hex.slice(0, 8)}…${hex.slice(-4)}`
}

export function AuthBar({ pubkey, onConnectNip07, onConnectBunker, onLogout }: Props) {
  if (pubkey) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs text-[var(--muted-foreground)]">{shortNpub(pubkey)}</p>
        <Button size="sm" variant="tertiary" onPress={onLogout}>
          Log out
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {onConnectNip07 ? (
        <Button size="sm" onPress={onConnectNip07}>
          Connect extension
        </Button>
      ) : null}
      <Button size="sm" variant={onConnectNip07 ? "secondary" : "primary"} onPress={onConnectBunker}>
        Connect bunker
      </Button>
    </div>
  )
}
