import { Link } from "@heroui/react"
import { CURATED_RELAYS } from "@margin/core"
import { applyTheme } from "@margin/ui"
import { useEffect } from "react"

const UPDATED = "2026-08-25"
const ISSUES = "https://github.com/MatheusBBarni/margin-nostr/issues"

export function Privacy() {
  useEffect(() => {
    applyTheme("dark")
    document.title = "Privacy — Margin"
  }, [])

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-normal tracking-tight text-pretty">Privacy</h1>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Updated <time dateTime={UPDATED}>25 August 2026</time>. This covers the Margin extension
          for Chrome and Firefox, and this website.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm">Who holds what</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Margin is a Nostr client. We do not run a comment database and we do not have Margin
          accounts. Notes live on relays other people operate. We never take an nsec.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm">What we do not do</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          No content scripts, no page DOM, no cookies or form fields from the site you are reading.
          No analytics, ads, crash reporting, or telemetry. We do not sell data. We do not use what
          we see for advertising or for anything other than showing and posting comments on that
          URL.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm">What stays on your device</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          The extension writes to the browser&apos;s local extension storage. This site uses
          localStorage. Neither is uploaded to us.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted-foreground)]">
          <li>
            Sign-in method: an extension signer id, or a bunker:// pointer plus the NIP-46 client
            key we generated. That client key is not your nsec. It only talks to your remote
            signer.
          </li>
          <li>Theme, default Follows or Everyone tab, muted pubkeys, extra relays.</li>
          <li>Cached copies of your public profile, follow list, and NIP-65 relay list.</li>
        </ul>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Log out to drop the signer record and cached profile. Mute list, theme, filter, and extra
          relays stay until you change them. Uninstall the extension or clear this site&apos;s data
          to wipe the rest.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm">What leaves your device</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          The client opens WebSockets to Nostr relays. The built-in set is:
        </p>
        <ul className="list-disc space-y-1 pl-5 font-mono text-xs leading-6 text-[var(--muted-foreground)]">
          {CURATED_RELAYS.map((url) => (
            <li key={url}>{url}</li>
          ))}
        </ul>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          If you are signed in we also use relays from your public NIP-65 list and any extras you
          added in options.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted-foreground)]">
          <li>
            The normalized URL of the current tab, as a subscription filter. The side panel needs
            it to load the room. The toolbar badge needs it to count comments. Browser pages such
            as chrome: and about: are skipped. We do not send a history dump, only the tab you are
            on.
          </li>
          <li>
            Comments you post. Those are public kind 1111 events: the text, your public key, the
            URL tags, and a timestamp. Your signer prompts before anything is signed.
          </li>
          <li>
            Fetches for public profile, follow, and relay-list events when you are signed in.
          </li>
          <li>NIP-46 messages to your bunker, if you connected one.</li>
          <li>HTTPS requests for profile pictures people put in their public profiles.</li>
        </ul>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          We never send the HTML of the page, screenshots, cookies, or typed form data.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm">Why the extension asks for permissions</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted-foreground)]">
          <li>tabs: read the current tab URL so we know which room to open and badge.</li>
          <li>storage: keep the settings listed above.</li>
          <li>sidePanel: dock the comment panel. It does not read the page.</li>
          <li>
            wss:// and https:// host access: talk to whatever relays you (or your NIP-65 list)
            choose, and load avatars. We do not use this to crawl the open web.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm">Comments are public</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          A note on a URL is a public Nostr event. Anyone who knows the URL, or who watches those
          relays, can read it. Other clients can too. Relays we do not control may keep a copy. We
          cannot pull an event back off the network. Do not post anything you need to take back.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm">This website</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          The site is a static app on Cloudflare Pages. Opening a room here runs the same relay
          queries as the extension. Cloudflare may keep ordinary request logs (IP address, user
          agent, URL) under their own policy. We do not add a tracker.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm">Store labels</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Chrome and Firefox ask us to name the data. In our words: web history is the current tab
          URL, used only to open and badge that room. User activity is comments you choose to
          publish. Authentication is the bunker or extension-signer connection, stored locally. We
          do not collect health, financial, location, or website content.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm">Children</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Margin is not aimed at children under 13.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm">Changes</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          If what we collect changes, we will update the date at the top of this page.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm">Contact</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Open an issue on{" "}
          <Link href={ISSUES} rel="noreferrer" target="_blank">
            GitHub
            <Link.Icon />
          </Link>
          .
        </p>
      </section>
    </main>
  )
}
