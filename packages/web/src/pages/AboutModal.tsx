import { Button, Link, Modal } from "@heroui/react"
import {
  ChatLines,
  Community,
  InfoCircle,
  IconoirProvider,
  Key,
  OpenNewWindow,
  Puzzle,
  SidebarExpand,
  Www,
} from "iconoir-react"
import type { ComponentType, ReactNode, SVGProps } from "react"

type Icon = ComponentType<SVGProps<SVGSVGElement>>

type Row = {
  icon: Icon
  title: string
  body: ReactNode
}

const HOW_IT_WORKS: Row[] = [
  {
    icon: Www,
    title: "A URL is a room",
    body: "The page you are already on is the thread. Same room in the side panel and here.",
  },
  {
    icon: ChatLines,
    title: "Comments are signed notes",
    body: "Each one is a Nostr kind 1111 event. Other NIP-22 clients can read them. We never hold your key.",
  },
  {
    icon: Community,
    title: "Follows first",
    body: "If you have a follow list, that is the default view. Everyone is the other tab.",
  },
  {
    icon: SidebarExpand,
    title: "The page stays put",
    body: "The extension is a side panel. Nothing is injected into the page.",
  },
]

const STEPS: Row[] = [
  {
    icon: Key,
    title: "Get a signer",
    body: "Alby, nos2x, or a bunker. Margin will not take an nsec.",
  },
  {
    icon: Puzzle,
    title: "Load the extension",
    body: (
      <>
        Not in a store yet. In Chromium, open chrome://extensions, turn on Developer mode, Load
        unpacked, and pick the repo&apos;s <span className="font-mono text-xs">.output/chrome-mv3-dev</span>{" "}
        folder.{" "}
        <Link href="https://github.com/MatheusBBarni/margin-nostr" rel="noreferrer" target="_blank">
          Repo
          <Link.Icon />
        </Link>
      </>
    ),
  },
  {
    icon: SidebarExpand,
    title: "Open a page",
    body: "Click the toolbar icon. The panel follows the tab you are on.",
  },
  {
    icon: OpenNewWindow,
    title: "Or paste a URL here",
    body: "Anyone can read the public room. To reply, connect a signer or a bunker.",
  },
]

const APPS: { href: string; name: string; note: string }[] = [
  {
    href: "https://getalby.com/",
    name: "Alby",
    note: "Browser signer. Use Connect extension.",
  },
  {
    href: "https://github.com/fiatjaf/nos2x",
    name: "nos2x",
    note: "Smaller Chrome signer. Same button.",
  },
  {
    href: "https://github.com/diegogurpegui/nos2x-fox",
    name: "nos2x-fox",
    note: "The Firefox one.",
  },
  {
    href: "https://nsec.app",
    name: "nsec.app",
    note: "Bunker in a tab. Use Connect bunker.",
  },
  {
    href: "https://github.com/greenart7c3/Amber",
    name: "Amber",
    note: "Android bunker. Same bunker flow.",
  },
]

function Section({ heading, rows }: { heading: string; rows: Row[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">{heading}</h3>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => {
          const Icon = row.icon
          return (
          <li key={row.title} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--stone)] text-[var(--foreground)]"
            >
              <Icon height={16} width={16} />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm">{row.title}</p>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">{row.body}</p>
            </div>
          </li>
          )
        })}
      </ul>
    </section>
  )
}

export function AboutModal() {
  return (
    <Modal>
      <Button variant="tertiary">
        <InfoCircle aria-hidden="true" height={16} width={16} />
        How it works
      </Button>
      <Modal.Backdrop variant="blur">
        <Modal.Container scroll="inside" size="lg">
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Using Margin</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <IconoirProvider iconProps={{ color: "currentColor", height: 16, strokeWidth: 1.5, width: 16 }}>
                <div className="flex flex-col gap-8">
                  <Section heading="How it works" rows={HOW_IT_WORKS} />
                  <Section heading="How to use it" rows={STEPS} />
                  <section className="flex flex-col gap-3">
                    <h3 className="text-sm font-medium">What to install</h3>
                    <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                      You need a signer. The side panel cannot see a signer injected into the page,
                      so use Alby, nos2x, or a bunker.
                    </p>
                    <ul className="flex flex-col gap-2">
                      {APPS.map((app) => (
                        <li key={app.href} className="flex flex-col gap-0.5">
                          <Link href={app.href} rel="noreferrer" target="_blank">
                            {app.name}
                            <Link.Icon />
                          </Link>
                          <p className="text-sm text-[var(--muted-foreground)]">{app.note}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </IconoirProvider>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary">
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
