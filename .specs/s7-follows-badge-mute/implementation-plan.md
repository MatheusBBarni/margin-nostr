# TDD Plan — S7 Follows, badge, mute, NIP-65

**Status:** approved  
**Requirements:** [plan.md](./plan.md)  
**Seams confirmed:** 2026-03-26

## Public interface

```ts
parseFollows(event): string[]
fetchFollows(pool, relays, pubkey): Promise<string[]>

fetchNip65(pool, relays, pubkey): Promise<Nip65Lists | null>

type FollowsCache = { pubkey: string; ids: string[]; fetchedAt: number }
type Nip65Cache = { pubkey: string; read: string[]; write: string[]; fetchedAt: number }

parseFollowsCache(value): FollowsCache | null
hydrateFollows(kv, pubkey): Promise<string[] | null>
persistFollows(kv, pubkey, ids): Promise<void>

parseNip65Cache(value): Nip65Cache | null
hydrateNip65(kv, pubkey): Promise<Nip65Lists | null>
persistNip65(kv, pubkey, lists): Promise<void>

parseMutes(value): string[]
addMute(mutes: string[], pubkey: string): string[]
removeMute(mutes: string[], pubkey: string): string[]
hydrateMutes(kv): Promise<string[]>
persistMutes(kv, mutes): Promise<void>

defaultFilterMode(follows: string[]): "follows" | "everyone"

countFollowsHits(events, { follows, self, muted }): number
badgeState(followsHits, everyoneHits): { text: string; background?: string }
```

`pool` is the existing `QueryPool` (`querySync`). Hex pubkeys are lowercased at the seam. Mute / follow ids are unique 64-hex only.

`bun:test` stays in `@margin/core`. `applyFilter` / `parseNip65` / `readRelays` / `writeRelays` already exist — do not retest them.

Deep modules: `fetchFollows` (latest `kind:3` + parse), mute list, `badgeState`.

## Behaviors to test (in order)

1. **Tracer:** `parseFollows` keeps 64-hex `p` tags, drops junk / wrong kind
2. `fetchFollows` returns `p` tags from the newest `kind:3` only (fake pool)
3. `hydrateFollows` returns cached ids for the same pubkey and ignores another pubkey / garbage
4. `persistFollows` then `hydrateFollows` round-trips
5. `fetchNip65` returns parsed lists from the newest `kind:10002`, or `null` if none
6. `hydrateNip65` / `persistNip65` same-pubkey only
7. `addMute` / `removeMute` / `parseMutes`: unique lowercased 64-hex; junk dropped; duplicate mute is a no-op
8. `hydrateMutes` / `persistMutes` round-trip
9. `defaultFilterMode`: non-empty → `"follows"`, else `"everyone"`
10. `countFollowsHits`: author ∈ follows ∪ self and not muted (flat events, not descendant threads)
11. `badgeState`: `3` + action blue; `99` not `99+`; `0` follows + `n>0` everyone → `"•"` + muted; both `0` → empty text

## Out of scope for this cycle

- Retesting `applyFilter` / `parseNip65` / `readRelays`
- Snap-until-first-click, toast Undo, resubscribe, SW debounce (adapters)
- Options, Firefox, NIP-51, recipient-inbox relays
- UI / Playwright tests

## Slice rule

One RED test → commit `test` → GREEN → commit `feat`. Do not pre-write all tests.

UI, panel, and background are adapters: wire after the core seams are green, prove by hand (same as S4–S6).
