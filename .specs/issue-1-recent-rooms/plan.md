# Requirements Document — Recently active rooms (`/rooms`)

**Status:** approved  
**Issue:** [GitHub #1](https://github.com/MatheusBBarni/margin-nostr/issues/1)  
**Surface:** `packages/web` + `@margin/core`  
**Sources:** issue #1, grill-me 2026-03-26, AGENTS.md, existing `packages/core` + `packages/web`  
**Authority:** AGENTS.md (after the `/rooms` exception is recorded), this file, and the code. Scratch docs are not authority.

## 1. Objective

On the public site, anyone can open **Rooms** (`/rooms`) and see URLs that appeared in a recent `kind:1111` window on curated relays, ranked by how many of those comments point at each URL. Each row links to the existing room route. This is a recently-active directory, not a complete ranking and not a home feed.

`/` stays the explainer. This feature is a separate page.

## 2. Locks from grill-me

- Allow `/rooms` as a **second** public-site exception. Record it in `AGENTS.md` (and the README surfaces line). Not a wedge for notifications, trending, or replacing `/`.
- `Home.tsx` body stays as it is. Only the shared header gains a link.
- Header link **always** visible (`Home · How it works · Rooms`, plus `My comments` when signed in).
- Public: no signer, no pubkey wait, logged-out works.
- Relays: **curated only**. No NIP-65, no extra-relay merge. Signed-in and signed-out see the same list.
- Window: one REQ `{ kinds: [1111], limit: 200 }` → `parseWebComment` → dedup by id → keep newest 200 (`ROOM_EVENT_CAP`). No `since`.
- Rank: group by `normalizeUrl` of `I`/`i`; count top-level **and** replies; sort count desc; tie-break newest `created_at` in that room; show every room in the window.
- Live: `querySync` then `subscribeMany` while mounted; re-rank as the window slides; close the pool on leave.
- Row: flat link to `/u/{urlencoded}` — URL + count + relative last-activity. No accordion, snippets, avatars, or compose.
- Copy as in §3.

## 3. Expected behavior

1. Route `/rooms` under the existing web layout/header.
2. Page title / nav / `h1`: `Rooms`.
3. Intro: `Recent comments on the relays we read. Not every room, and not an all-time rank.`
4. No auth gate. Query curated relays as soon as the page mounts.
5. `querySync` then `subscribeMany` on `{ kinds: [1111], limit: 200 }` while mounted. Close the pool on leave.
6. Always `verifyEvent` via `parseWebComment`. Drop bad sig, wrong kind, non-web `K`/`k`, or `I`/`i` that `normalizeUrl` rejects.
7. Dedup by event id. Keep newest 200 events. Group remaining events by `roomUrl`.
8. List rooms by count desc, then newest activity. Each row is one link: truncated mono URL (`title` = full URL), `1 comment` / `N comments`, relative time of the newest event.
9. Empty: `No recent web comments on the relays we read.`
10. Loading (no rows yet, no error): `Loading rooms…`
11. Query failure: `Could not load rooms from the relays we use.` Do not show a blank page.
12. Footer: `This is a recent window, not a complete ranking. Rooms we did not just see are missing.`
13. `@margin/ui` stays free of pool/signer. Parse + rank live in `@margin/core`. The web page owns `SimplePool` while mounted. List chrome lives in `packages/web`.
14. `bun:test` in `packages/core` for collect/rank (and fetch/subscribe if they are core helpers).

## 4. Edge cases

- Relay returns non-web NIP-22 → drop.
- `I`/`i` present but not a valid http(s) URL / `normalizeUrl` throws → skip.
- Duplicate ids across query + live sub → one event, one count.
- Over cap → keep newest 200 events, then re-rank (a room can disappear if all its events age out).
- Live event after dump → insert if it parses; list re-ranks.
- Only replies in a room → still a row; replies count.
- Two rooms same count → newer activity first.
- Signed-in user with NIP-65 / extra relays → **ignored** on this page.
- Query throws → error copy; do not fake rows.

## 5. Stack

bun workspaces · TypeScript · React 19 · HeroUI v3 · Tailwind v4 · Vite · React Router · `nostr-tools` `SimplePool` · `@margin/core` + `@margin/web`.

## 6. UI/UX

No Figma. Match existing site header, empty/error pattern, `/me` relative time, `DESIGN.md` tokens. Directory list, not a social timeline. No “trending” or “what’s happening.”

| Surface | Copy |
|---|---|
| Nav + `<title>` + `h1` | `Rooms` |
| Intro | `Recent comments on the relays we read. Not every room, and not an all-time rank.` |
| Loading | `Loading rooms…` |
| Empty | `No recent web comments on the relays we read.` |
| Query failed | `Could not load rooms from the relays we use.` |
| Footer | `This is a recent window, not a complete ranking. Rooms we did not just see are missing.` |

## 7. Out of scope this cycle

- Any `Home.tsx` body change
- Extension panel entry
- NIP-65 / extra-relay merge
- Follows or mute on this page
- Helper relay / Worker / custom kind / outbox
- “Load older” / `since` / time picker
- Comment previews, profiles, compose
- Notifications
- i18n, telemetry
