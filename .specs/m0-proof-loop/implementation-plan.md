# TDD Plan — M0 Proof Loop

**Status:** approved  
**Requirements:** [plan.md](./plan.md)  
**Seams confirmed:** 2026-03-25

## Public interface

```ts
normalizeUrl(raw: string): string
class NormalizeError

buildTopLevel(normalizedUrl, content): UnsignedComment
buildReply(normalizedUrl, content, parent): UnsignedComment
parseComment(event, roomUrl): VerifiedComment | null

nest(comments): { roots: ThreadNode[]; orphans: ThreadNode[] }
applyFilter(nodes, { mode, follows, muted, self? }): ThreadNode[]

parseNip65(event): { read: string[]; write: string[] }
readRelays(user65?): string[]
writeRelays(user65?): string[]
CURATED_RELAYS

subscribeRoom(pool, relays, normalizedUrl, handlers): Sub
publishRoom(pool, relays, signed): Promise<{ ok: string[]; failed: string[] }>

interface Signer { id; getPublicKey(); signEvent(); close?() }
interface Kv { get; set; delete }
```

`@margin/ui`, extension, and web are adapters around this interface. They are manually proven in S4–S6, not `bun:test` seams.

Deep modules: `normalizeUrl`, `parseComment`, `nest` + `applyFilter`.

## Behaviors to test (in order)

### S0 — tracer first

1. Tracking-heavy URL becomes the locked room id  
   `http://www.Example.com/a//b/?utm_source=x&id=1#c` → `https://example.com/a/b?id=1`
2. Reject non-http(s) and unparseable input (`NormalizeError`)
3. Strip `:80`/`:443`; drop `www.` / `m.` / `mobile.`; collapse slashes; keep origin `/`
4. Drop denylisted query keys (`utm_*`, click ids, `si`, **always `ref`**); **keep** `id`/`v`/`page`; sort remaining keys
5. Do not merge AMP / language-prefix / mirror hosts (fixture: AMP in ≠ AMP-less out)

### S1

6. Top-level unsigned comment is `kind:1111` with `I`/`K=web`/`i`/`k=web` and trimmed content
7. Reply tags are `I`/`K` + `e` + `k=1111` + `p` (no `E`/`P` on a URL root); empty/overlong content rejected
8. `parseComment` accepts a valid signed room event; returns null for bad sig, wrong kind, wrong room, missing `web`
9. `nest` attaches replies; missing parent still renders (not dropped); siblings by `created_at` asc; oldest dropped after 200
10. Mute drops the whole subtree; Follows keeps a stranger’s top-level if a descendant is a follow/self
11. `parseNip65` honors missing / `read` / `write` markers; read and write lists always include every curated relay

### S2

12. `subscribeRoom` verifies, room-checks, and dedups by id (fake pool emits junk + dupes)
13. `publishRoom` reports per-relay ok/failed; one success is enough (fake pool)

### S3–S6

Implement against the interfaces above. No new `bun:test` files unless a core helper appears. Manual proof: panel publish → `/u/…` same ids → `nak` sees the note. Probe is a script, not a unit test.

## Out of scope for this cycle

- Follows wiring, badge, mute UI, NIP-65 fetch (S7) — `applyFilter` still tested
- Options, Firefox, Amber QR (S8)
- Live relay tests in CI
- njump, keyboard, context menu, NIP-51, helper relay, domain/OG
- UI/component unit tests, Playwright

## Slice rule

One RED test → commit `test` → GREEN → commit `feat`. Do not pre-write the whole fixture file or all S1 tests.

First GREEN may add the bun workspace + `@margin/core` scaffold so `bun test` can run. That scaffold is not extra product behavior.
