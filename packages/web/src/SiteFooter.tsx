import { NavLink } from "react-router"

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-border)]">
      <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center px-6 sm:px-8">
        <NavLink
          className={({ isActive }) =>
            [
              "inline-flex min-h-11 items-center text-sm no-underline",
              isActive
                ? "text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              focusRing,
            ].join(" ")
          }
          end
          to="/privacy"
        >
          Privacy
        </NavLink>
      </div>
    </footer>
  )
}
