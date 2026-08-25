import { AuthBar } from "@margin/ui"
import { NavLink } from "react-router"
import { useWebAuth } from "./WebAuth"

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/how-it-works", label: "How it works", end: true },
] as const

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"

export function SiteHeader() {
  const { pubkey, profile, error, connectNip07, connectBunker, logout } = useWebAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--background)]">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-4 px-6 sm:px-8">
        <NavLink
          aria-label="Margin home"
          className={`flex shrink-0 items-center gap-2.5 text-[var(--foreground)] no-underline ${focusRing}`}
          to="/"
        >
          <img
            alt=""
            aria-hidden="true"
            className="size-7 rounded-sm"
            decoding="async"
            height={28}
            src="/logo-mark.png"
            width={28}
          />
          <span className="font-mono text-xs tracking-[0.18em]">MARGIN</span>
        </NavLink>
        <nav aria-label="Site" className="flex shrink-0 items-center gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              className={({ isActive }) =>
                [
                  "relative inline-flex min-h-11 items-center px-3 text-sm whitespace-nowrap no-underline transition-colors duration-200",
                  isActive
                    ? "text-[var(--foreground)] after:absolute after:inset-x-3 after:bottom-1.5 after:h-px after:bg-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                  focusRing,
                ].join(" ")
              }
              end={link.end}
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <AuthBar
          className="ml-auto shrink-0"
          pubkey={pubkey}
          profile={profile}
          onConnectNip07={() => void connectNip07()}
          onConnectBunker={() => void connectBunker()}
          onLogout={() => void logout()}
        />
      </div>
      {error ? (
        <p className="mx-auto max-w-5xl px-6 pb-2 text-sm text-[var(--danger)] sm:px-8" role="alert">
          {error}
        </p>
      ) : null}
    </header>
  )
}
