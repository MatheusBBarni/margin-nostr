import { Link, Tabs } from "@heroui/react"
import { applyTheme } from "@margin/ui"
import {
  ChatLines,
  Community,
  IconoirProvider,
  Key,
  OpenNewWindow,
  Puzzle,
  SidebarExpand,
  Www,
} from "iconoir-react"
import type { ComponentType, ReactNode, SVGProps } from "react"
import { useEffect, useState } from "react"

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

const TABS = [
  { id: "works", label: "How it works" },
  { id: "use", label: "How to use it" },
  { id: "install", label: "What to install" },
] as const

type TabId = (typeof TABS)[number]["id"]

function TopicList({ rows }: { rows: Row[] }) {
  return (
    <ul className="flex flex-col gap-4">
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
  )
}

export function HowItWorks() {
  const [tab, setTab] = useState<TabId>("works")

  useEffect(() => {
    applyTheme("dark")
    document.title = "How it works — Margin"
  }, [])

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 p-8">
      <div className="flex flex-col items-start gap-5">
        <img alt="Margin" className="h-28 w-auto rounded-md" height={176} src="/logo-full.png" width={140} />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-normal tracking-tight text-pretty">Using Margin</h1>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            A URL is a room. Pick a topic.
          </p>
        </div>
      </div>
      <IconoirProvider iconProps={{ color: "currentColor", height: 16, strokeWidth: 1.5, width: 16 }}>
        <Tabs
          className="flex flex-col gap-6"
          selectedKey={tab}
          variant="secondary"
          onSelectionChange={(key) => {
            if (key === "works" || key === "use" || key === "install") setTab(key)
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="About Margin" className="w-full">
              {TABS.map((item) => (
                <Tabs.Tab key={item.id} className="flex-1" id={item.id}>
                  {item.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel className="pt-2" id="works">
            {tab === "works" ? <TopicList rows={HOW_IT_WORKS} /> : null}
          </Tabs.Panel>
          <Tabs.Panel className="pt-2" id="use">
            {tab === "use" ? <TopicList rows={STEPS} /> : null}
          </Tabs.Panel>
          <Tabs.Panel className="pt-2" id="install">
            {tab === "install" ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                  You need a signer. The side panel cannot see a signer injected into the page, so
                  use Alby, nos2x, or a bunker.
                </p>
                <ul className="flex flex-col gap-3">
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
              </div>
            ) : null}
          </Tabs.Panel>
        </Tabs>
      </IconoirProvider>
    </main>
  )
}
