# Margin

A portable comment section for every URL, owned by nobody.

[![Built with bun](https://img.shields.io/badge/bun-1.3-black?style=flat-square)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Nostr NIP-22](https://img.shields.io/badge/Nostr-NIP--22-8b5cf6?style=flat-square)](https://github.com/nostr-protocol/nips/blob/master/22.md)

Most of the web has no comments. The pages that do are owned by the site (Disqus, Coral, a login wall) or live somewhere else (Reddit, HN, X). You leave the page, or you take their moderation, identity, and archive.

Nostr already has the missing pieces:

- a URL is a global id ([NIP-73](https://github.com/nostr-protocol/nips/blob/master/73.md), `i` + `k=web`)
- a comment is a signed, threaded note on that id ([NIP-22](https://github.com/nostr-protocol/nips/blob/master/22.md), `kind:1111`)
- identity is a key, not an account
- relays are interchangeable, so the thread is not a company's database

Margin is the client that makes that real on any page.

```
  any URL
     │
     ├─ extension side panel   ← you have Margin installed
     └─ public thread page     ← anyone with a link
              │
              ▼
     same NIP-22 events, same relays
```

If this works, opening an article and seeing four comments from people you follow should feel as normal as seeing the article.

## Why this, not the neighbors

| Idea | Why not first |
| --- | --- |
| Another NIP-07 signer | Saturated. No new surface. |
| Another microblogging client | Saturated. Competes with Damus / Primal / Coracle. |
| Hypothesis-style highlighter ([NIP-84](https://github.com/nostr-protocol/nips/blob/master/84.md)) | Different verb. Lantern already ships it. |
| Embed widget only (ZapThreads / NoComment) | Needs the *site* to install it. We want the *reader* to. |

We write the same `kind:1111` events other NIP-22 clients can read. Compatibility is a feature. Distribution is the product: a reader-installed side panel, plus a shareable page.

## Who it is for

**The Regular** already has a Nostr key and a signer. They read blogs, docs, news, GitHub, Wikipedia. They want "what did my people say about this page?"

**The first commenter** lands on an empty room. Posting still has to feel worth it. We do not fake occupancy.

**The passerby** opened a shared link and has no extension. The thread has to make sense in a few seconds. They can reply if they connect a signer or a bunker.

Not v1: site owners who want a drop-in Disqus replacement. That embed can wait.

## What it feels like

You open an article.

The toolbar badge shows how many comments your follows left. A quiet dot means strangers commented and your people did not. Click: a side panel docks on the right. The page stays put.

Default view is **Follows**. **Everyone** is the other tab. Threads nest. Compose is one box. Your signer prompts. No "create an account."

"Copy thread" gives a public URL so someone without the extension can read the same room.

Empty Follows: none of your people have commented. Empty Everyone: no comments on this URL yet. Both are honest.

## Principles

1. **The URL is the room.** Not a group, not a hashtag, not a client-specific board.
2. **Follows-first, never global-first.** A global comment section on YouTube is unusable. The social graph is the spam filter.
3. **Do not hold the keys.** NIP-07 and NIP-46 bunker. No nsec paste. We are not a signer.
4. **Write events other clients can read.** Strict NIP-22 / NIP-73. No custom kind.
5. **The page is sacred.** No content script. No overlay. No page JS. Side panel only.
6. **Empty is a design problem, not a growth hack.** Do not scrape HN into the thread and pretend it is native.
7. **One job.** Comments on URLs. Highlights, bookmarks, feeds, and tipping wait.

## Protocol

Top-level comment:

```json
{
  "kind": 1111,
  "content": "Nice article!",
  "tags": [
    ["I", "https://example.com/essay"],
    ["K", "web"],
    ["i", "https://example.com/essay"],
    ["k", "web"]
  ]
}
```

A reply keeps the same `I` / `K` root and points `e` + `k=1111` + `p` at the parent.

Query:

```
{ "kinds": [1111], "#I": ["https://example.com/essay"] }
{ "kinds": [1111], "#i": ["https://example.com/essay"] }
```

Dedup by event id. Ignore anything whose `I` / `i` is not this room.

The normalized URL **is** the room id. Two normalizers = two rooms. `normalizeUrl()` is conservative, fixture-tested, and shown in the UI so you can see which room you entered.

We do not run a relay. Read and write go to a small curated public set, unioned with your [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md) list when you are logged in.

## Surfaces

**Extension (primary).** Chromium and Firefox. Side panel, not a popup. Badge, Follows / Everyone, compose, mute, permalink. Background probes the current tab URL for the badge. It never injects into the page.

**Public site.** `/` is an explainer. `/u/{urlencoded-url}` renders the same thread. `/rooms` lists recently active rooms from a curated-relay window. `/me` lists the signed-in user's own web comments. Logged-out default is Everyone. Connect `window.nostr` or a bunker to reply.

## Repository

bun workspaces. Two surfaces, one library.

| Package | Role |
| --- | --- |
| [`packages/core`](./packages/core) | URL normalize, NIP-22 events, pool, signers, filters. Zero React. `bun:test` lives here. |
| [`packages/ui`](./packages/ui) | Thread, compose, auth, filter chrome. Presentational + callbacks only. |
| [`packages/extension`](./packages/extension) | WXT MV3 side panel. Chromium first, Firefox next. |
| [`packages/web`](./packages/web) | Vite SPA. Meant for Cloudflare Pages. |

## Getting started

You need [bun](https://bun.sh) 1.3+ and a Chromium browser. A NIP-07 signer (Alby, nos2x) or a NIP-46 bunker is required to post.

```bash
bun install
bun test
```

> [!IMPORTANT]
> Margin never accepts or stores an nsec. Do not add a paste field, a storage key, or `finalizeEvent` with a user key.

> [!NOTE]
> The toolchain is bun. WXT still bundles the extension. Vite still bundles the site.

### Extension

```bash
bun run --filter @margin/extension dev
```

Then load the unpacked build in Chromium:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** and pick `.output/chrome-mv3-dev`

A production Chromium zip:

```bash
bun run --filter @margin/extension build
```

Firefox:

```bash
bun run --filter @margin/extension build:firefox
```

The side panel follows the active tab URL. It does not inject into the page, so it cannot see a page-injected `window.nostr`. Use a bunker, or an extension signer that answers `sendMessage` (Alby, nos2x). The extension options page connects bunker / Amber / nos2x-Alby and edits mute, theme, default filter, and extra relays.

### Public site

```bash
bun run --filter @margin/web dev
```

- `http://localhost:5173/` — paste a URL and open its room
- `http://localhost:5173/rooms` — recently active rooms
- `http://localhost:5173/u/{urlencoded-url}` — the thread itself

Optional: set `VITE_PUBLIC_ORIGIN` so "Copy thread" points at the deployed site instead of localhost.

### Relay probe

```bash
bun probe
```

Publishes a throwaway `kind:1111` to each curated relay and checks that `#I` comes back. Writes `packages/core/src/relays.probe.md`.

## What we are not

Disqus, but user-installed. Reddit, but still on the page. Hypothesis, but we discuss the document instead of highlighting it. [wen](https://github.com/fiatjaf/wen), which had the right instinct on a dead UX and obsolete events. [Lantern](https://nostrapps.com/), which highlights and annotates. [ZapThreads](https://github.com/franzaps/zapthreads) / [NoComment](https://github.com/fiatjaf/nocomment), which need the publisher.

One sentence: follows-first comments on every URL, as a reader extension, on standard NIP-22 events.

## Status

Early. The loop we have to prove: normalize a URL, fetch `#I`, publish a `kind:1111`, see it in the side panel and on `/u/…`, on three real articles.

Agents working in this repo: start at [AGENTS.md](./AGENTS.md).
