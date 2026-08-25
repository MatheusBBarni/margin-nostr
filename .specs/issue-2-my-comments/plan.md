# Requirements Document — My comments (`/me`)

**Status:** approved  
**Issue:** [GitHub #2](https://github.com/MatheusBBarni/margin-nostr/issues/2)  
**Surface:** `packages/web` only  
**Sources:** issue #2, grill-me 2026-03-26, AGENTS.md, existing `packages/core` + `packages/web`  
**Authority:** AGENTS.md (after the `/me` exception is recorded), this file, and the code. Scratch docs are not authority.

## 1. Objective

On the public site, a signed-in user can open **My comments** (`/me`) and see a recent window of *their own* web `kind:1111` comments, across rooms, newest first. Each row links to the existing room route. This is a personal sent list, not a home feed.

## 2. Locks from grill-me

- Allow `/me` as **one** nav exception: personal sent comments. Not a wedge for `/rooms`, notifications, or ranked rooms.
- Record that exception in `AGENTS.md`.
- This cycle: **C1–C12 + C13 + C15**.
- Header link **only when signed in**. `/me` still handles logged-out if the URL is typed.
- No “Load older” (C14). No mute filter on this page (C16 is implicit).
- Flat newest-first list. No room-heading grouping this cycle.

## 3. Expected behavior

1. Route `/me` under the existing web layout/header.
2. Page title: `My comments`. Nav label: `My comments`. Never “messages”.
3. Reuse site auth (NIP-07 + bunker). No nsec. No query until there is a pubkey.
4. Logged-out: AuthBar + “Connect a signer to see comments you posted.” No relay query.
5. Logged-in: `querySync` then `subscribeMany` on `{ kinds: [1111], authors: [self] }` while the page is mounted. Close the pool on leave.
6. Relays: **curated ∪ user NIP-65 write** (`writeRelays`). Prefer write list; still union curated. Not an outbox walk.
7. Always `verifyEvent`. Drop wrong pubkey, wrong kind, non-web `K`/`k`, or `I`/`i` that `normalizeUrl` rejects.
8. New core helper (name can move): `parseWebComment(event) → (VerifiedComment & { roomUrl: string }) | null`. `normalizeUrl` is the only room id writer. Reply vs top-level uses the same `e` + `k=1111` rule as `parseComment`. Do not reuse `subscribeRoom` (`#I`/`#i`).
9. Dedup by event id. Sort `created_at` descending. Cap ingest at `ROOM_EVENT_CAP` (200).
10. Flat list (not a thread tree). Row: relative time, content, normalized room URL, small “reply” mark for replies, link to `/u/{urlencoded}`. No parent fetch. No compose on this page.
11. Empty: “No comments from this key on the relays we read.”
12. Query failure: say the query failed. Do not show a blank page.
13. Footer: this is a recent window, not a full archive; notes on relays we do not read will be missing.
14. `@margin/ui` stays free of pool/signer. Parse (+ sort/cap if needed) lives in `@margin/core`. The web page owns `SimplePool` while mounted, same idea as `Room.tsx`. List chrome lives in `packages/web` (extension is out of scope).
15. `bun:test` in `packages/core` for the new parser (and cap/dedup/sort if they are core helpers).

## 4. Edge cases

- Relay returns non-web NIP-22 (`kind:1111` on notes/files/etc.) → drop.
- `I`/`i` present but not a valid http(s) URL / `normalizeUrl` throws → skip.
- Event pubkey ≠ signed-in user → drop.
- Duplicate ids across query + live sub → one row.
- Over cap → keep newest 200.
- Live event after dump → insert if it passes parse + cap.
- NIP-65 missing → curated only.
- Comments published from another NIP-22 client onto unread relays → missing; copy says so.

## 5. Stack

bun workspaces · TypeScript · React 19 · HeroUI v3 · Tailwind v4 · Vite · React Router · `nostr-tools` `SimplePool` · `@margin/core` + `@margin/web`.

## 6. UI/UX

No Figma. Match existing site header, AuthBar, empty/error pattern, `Comment` relative time, `DESIGN.md` tokens. List, not a social timeline. No “what’s happening.”

Logged-out copy: “Connect a signer to see comments you posted.”  
Empty copy: “No comments from this key on the relays we read.”  
Relay failure: say the query failed.

## 7. Out of scope this cycle

- C14 “Load older” via `until`
- C16 explicit mute exemption (this page never mute-filters)
- DMs (NIP-04 / NIP-17)
- `#p` inbox / notifications
- Public `/p/{npub}`
- Ranked rooms (issue #1)
- Helper relay / Worker / custom kind
- Outbox walk
- Extension panel entry
- NIP-09 delete UI
- Markdown composer
- Grouping by room headings
- Home feed / “what’s happening”
