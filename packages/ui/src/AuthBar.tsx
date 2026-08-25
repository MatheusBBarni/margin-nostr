import { Avatar, Button } from "@heroui/react"
import { useImperativeHandle, useRef, type Ref } from "react"

type ProfileHint = {
  name?: string
  display_name?: string
  picture?: string
}

export type AuthBarHandle = { focus: () => void }

type Props = {
  pubkey: string | null
  profile?: ProfileHint | null
  onConnectNip07?: () => void
  onConnectBunker: () => void
  onLogout: () => void
  className?: string
  ref?: Ref<AuthBarHandle>
}

function shortNpub(hex: string): string {
  return `${hex.slice(0, 8)}…${hex.slice(-4)}`
}

export function AuthBar({ pubkey, profile, onConnectNip07, onConnectBunker, onLogout, className, ref }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => ({
    focus() {
      rootRef.current?.querySelector("button")?.focus()
    },
  }))

  if (pubkey) {
    const label = profile?.display_name || profile?.name || shortNpub(pubkey)
    const initial = label.slice(0, 2).toUpperCase()
    return (
      <div className={["flex min-w-0 items-center gap-2", className ?? "justify-between"].join(" ")} ref={rootRef}>

        <div className="flex min-w-0 items-center gap-2">
          <Avatar size="sm">
            {profile?.picture ? <Avatar.Image alt="" src={profile.picture} /> : null}
            <Avatar.Fallback>{initial}</Avatar.Fallback>
          </Avatar>
          <p className="truncate text-xs text-[var(--muted-foreground)]">{label}</p>
        </div>
        <Button size="sm" variant="tertiary" onPress={onLogout}>
          Log out
        </Button>
      </div>
    )
  }

  return (
    <div className={["flex flex-nowrap gap-2", className].filter(Boolean).join(" ")} ref={rootRef}>

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
