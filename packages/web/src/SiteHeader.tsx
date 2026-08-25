import { NavLink } from "react-router"

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/how-it-works", label: "How it works", end: true },
] as const

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--background)]">
      <div className="mx-auto grid h-16 max-w-xl grid-cols-[1fr_auto_1fr] items-center px-6 sm:px-8">
        <NavLink
          aria-label="Margin home"
          className={`justify-self-start flex min-h-11 items-center gap-2.5 text-[var(--foreground)] no-underline ${focusRing}`}
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
        <nav aria-label="Site" className="flex items-center gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              className={({ isActive }) =>
                [
                  "relative inline-flex min-h-11 cursor-pointer items-center px-3 text-sm no-underline transition-colors duration-200",
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
        <span aria-hidden="true" />
      </div>
    </header>
  )
}
