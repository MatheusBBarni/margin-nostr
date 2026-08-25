# TDD Plan — S8 Options, Firefox, permalink origin, probe

**Status:** approved  
**Requirements:** [plan.md](./plan.md)  
**Seams confirmed:** 2026-03-26

## Public interface

Core only (`bun:test`). Existing names stay; new args are optional so S7 callers keep working.

```ts
defaultFilterMode(follows: string[], stored?: FilterPreference | null): FilterMode
// empty follows → "everyone"
// otherwise stored === "everyone" → "everyone", else "follows"

parseExtraRelays(value: unknown): string[]
hydrateExtraRelays(kv): Promise<string[]>
persistExtraRelays(kv, urls): Promise<void>
// wss:// only, trailing slash stripped, unique, junk dropped

readRelays(user65?: Nip65Lists, extraRelays?: readonly string[]): string[]
writeRelays(user65?: Nip65Lists, extraRelays?: readonly string[]): string[]
// extras unioned into both; curated still always present

parsePubkeyInput(raw: string): string | null
// 64-hex or npub1 → lowercase hex; junk → null

parseStoredSigner(value: unknown): StoredSigner | null
// bunker requires bunkerPointer + clientSkHex; else null

clearSessionSigner(kv): Promise<void>
// deletes signer and selfProfile
```

Deep modules: extra-relay parse (URL rules), pubkey input (nip19), stored-signer accept/reject.

`bun:test` stays in `@margin/core`.

## Behaviors to test (in order)

1. **Tracer:** `defaultFilterMode` — empty list → Everyone even if stored is Follows; non-empty + unset/`follows` → Follows; non-empty + `everyone` → Everyone
2. `parseExtraRelays` keeps unique `wss://`, strips trailing `/`, drops `https://` and junk
3. `persistExtraRelays` / `hydrateExtraRelays` round-trip; garbage in Kv → `[]`
4. `readRelays` / `writeRelays` include extras and every curated relay
5. `parsePubkeyInput` accepts hex and `npub1`, rejects junk
6. `parseStoredSigner` accepts bunker with pointer+`clientSkHex`, rejects bunker missing `clientSkHex`
7. `clearSessionSigner` makes signer and `selfProfile` unreadable

## Out of scope for this cycle’s tests

- Options React page, QR image, `storage.onChanged`, Firefox `sidebar_action` (adapters; wire after core is green, prove by hand)
- Live `bun probe` / editing `CURATED_RELAYS` (ops after code is green)
- Wrapping `createNostrConnectURI` (nostr-tools)
- Asserting Firefox extension ids (constants)
- Playwright / UI tests
- Retesting mute add/remove, `applyFilter`, S7 badge math

## Slice rule

One RED test → commit `test` → GREEN → commit `feat`. Do not pre-write all tests.

UI, Options, Firefox, and probe report are adapters: wire after the core seams are green, prove by hand (same as S4–S7).
