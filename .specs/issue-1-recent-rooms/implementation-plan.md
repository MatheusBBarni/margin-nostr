# TDD Plan — Recently active rooms (`/rooms`)

**Status:** approved  
**Requirements:** [plan.md](./plan.md)  
**Seams confirmed:** 2026-03-26  
**Issue:** [GitHub #1](https://github.com/MatheusBBarni/margin-nostr/issues/1)

## Public interface

```ts
type RankedRoom = {
  roomUrl: string
  commentCount: number
  lastActivityAt: number
}

rankRooms(comments: WebComment[]): RankedRoom[]
// group by roomUrl; count all; lastActivityAt = max created_at
// sort count desc, then lastActivityAt desc

mergeRecentWebComments(current, incoming): WebComment[]
// dedup by id, newest first, cap ROOM_EVENT_CAP (any pubkey)

collectRecentWebComments(events: Event[]): WebComment[]
// parseWebComment, then mergeRecentWebComments

fetchRecentWebComments(pool, relays): Promise<WebComment[]>
// querySync { kinds: [1111], limit: 200 }

subscribeRecentWebComments(pool, relays, handlers): { close() }
// subscribeMany same filter; parse + dedup; handlers.onevent(WebComment)
```

Deep module: `rankRooms` (small return, all grouping/sort). `collectRecentWebComments` is the window policy. Pool helpers are thin adapters, same idea as `fetchOwnComments`.

Relays stay `CURATED_RELAYS` in the web page; no new relay API.

`bun:test` only in `@margin/core`. Web `/rooms` is an adapter around these helpers (manual proof, like `Me.tsx`). No UI/component tests.

## Behaviors to test (in order)

1. **Tracer:** two comments on the same `roomUrl` become one `RankedRoom` with `commentCount: 2` and `lastActivityAt` of the newer
2. `rankRooms` sorts higher count first; equal count → newer `lastActivityAt` first
3. `collectRecentWebComments` drops junk (bad sig / non-web / bad `I`/`i`), keeps any pubkey, dedups by id, newest 200
4. Two raw `I`/`i` values that `normalizeUrl` to the same URL collapse to one room
5. A NIP-22 reply counts toward the same room as a top-level
6. `subscribeRecentWebComments` uses `{ kinds: [1111], limit: 200 }`, ignores junk/dupes (fake pool)
7. `fetchRecentWebComments` `querySync`s that filter with `limit: 200` and returns the collected list (fake pool)

## Out of scope for this cycle

- React / Playwright / HeroUI tests
- Extension
- NIP-65 / extra relays / mute / follows
- `subscribeRoom` / `parseWebComment` changes
- Live-relay CI
- `Home.tsx` body

Web still implements route, always-on header link, copy, curated-only pool lifecycle — after the core slices, not as `bun:test`.

## Slice rule

One RED test → commit `test` → GREEN → commit `feat`. Do not pre-write tests for later behaviors.
