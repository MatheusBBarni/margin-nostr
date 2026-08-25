# TDD Plan — My comments (`/me`)

**Status:** approved  
**Requirements:** [plan.md](./plan.md)  
**Seams confirmed:** 2026-03-26  
**Issue:** [GitHub #2](https://github.com/MatheusBBarni/margin-nostr/issues/2)

## Public interface

```ts
type WebComment = VerifiedComment & { roomUrl: string }

parseWebComment(event: Event): WebComment | null
// verifyEvent, kind 1111, K or k = web,
// roomUrl = normalizeUrl(I or i), parentId from e + k=1111

collectOwnWebComments(events: Event[], pubkey: string): WebComment[]
// parseWebComment, drop other pubkeys, dedup by id,
// sort created_at desc, cap ROOM_EVENT_CAP (200)

fetchOwnComments(pool, relays, pubkey): Promise<WebComment[]>
// querySync { kinds: [1111], authors: [self], limit: 200 }
// then collectOwnWebComments

subscribeOwnComments(pool, relays, pubkey, handlers): { close() }
// subscribeMany same filter (no limit required on live sub)
// parse + pubkey check + dedup; handlers.onevent(WebComment)

groupOwnWebComments(comments): OwnCommentGroup[]
// one group per roomUrl; rooms by newest comment; comments newest first
```

Deep module: `parseWebComment` (small return, all the drop rules). `collectOwnWebComments` is the list policy. Pool helpers are thin adapters, same idea as `subscribeRoom`.

`writeRelays` already exists. Page uses it; no new relay API.

`bun:test` only in `@margin/core`. Web `/me` is an adapter around these helpers (manual proof, like `Room.tsx`). No UI/component tests.

## Behaviors to test (in order)

1. **Tracer:** a signed top-level web `kind:1111` becomes a `WebComment` with `roomUrl` and no `parentId`
2. `parseWebComment` returns null for bad sig, wrong kind, missing web `K`/`k`, and non-http / unnormalizable `I`/`i`
3. `roomUrl` is `normalizeUrl(...)` of `I` or `i`, not the raw tag (e.g. `www.` stripped)
4. A NIP-22 reply (`e` + `k=1111` + `K=web`) has `parentId` and the same `roomUrl`
5. `collectOwnWebComments` keeps only `pubkey`, dedups by id, newest first, drops oldest past 200
6. `subscribeOwnComments` uses `{ kinds: [1111], authors: [self] }`, ignores junk/other-pubkey/dupes (fake pool)
7. `fetchOwnComments` `querySync`s that filter with `limit: 200` and returns the collected list (fake pool)

## Out of scope for this cycle

- C14 `until` paging
- Mute filtering
- `subscribeRoom` changes
- Extension
- React / Playwright / HeroUI tests
- Live-relay CI

Web still implements route, header-when-signed-in, copy, pool lifecycle, NIP-65 via `writeRelays` — after the core slices, not as `bun:test`.

## Slice rule

One RED test → commit `test` → GREEN → commit `feat`. Do not pre-write tests for later behaviors.
