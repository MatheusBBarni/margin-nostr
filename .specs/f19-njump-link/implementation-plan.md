# TDD Plan — F19 njump link

**Status:** approved  
**Requirements:** [plan.md](./plan.md)  
**Seams confirmed:** 2026-03-26  
**Task:** `docs/tasks/F19-njump-link.md`

## Public interface

```ts
commentViewerUrl(comment: Pick<VerifiedComment, "id" | "pubkey">): string
// https://njump.me/${neventEncode({ id, author: pubkey, kind: 1111 })}
// no relays
```

Exported from `@margin/core`. `Comment` sets `href`, `target="_blank"`, `rel="noopener"`, visible **Open**, `aria-label="Open on njump"`.

Deep module: encode + host live behind one function. UI does not import `nip19`.

`bun:test` only in `@margin/core`. Comment wiring is an adapter (manual proof), same as `/me`.

## Behaviors to test (in order)

1. **Tracer:** `commentViewerUrl({ id, pubkey })` is `https://njump.me/` plus an `nevent1…` that decodes to this `id`, `author === pubkey`, `kind === 1111`
2. The decoded pointer has no relays — already true after slice 1 GREEN (`neventEncode` without `relays` decodes to `relays: []`). Second test locks that; no separate RED.

## Out of scope for this cycle

- nostrudel / `nostr:` URI
- Relays on the nevent
- `/me`
- Copy njump URL
- React / Playwright tests
- `normalizeUrl` / event parse / F18 footer

## Slice rule

One RED test → commit `test` → GREEN (helper, and UI on the last slice) → commit `feat`. Do not pre-write later tests.
