# S7 — Follows filter, badge, mute, NIP-65 merge

**Status:** done  
**PRD:** F8 (NIP-65 read), F9, F10 (wire), F12, F17  
**TECHSPEC:** §5.3 `applyFilter`, §5.4–5.6, §7.2 badge, slice S7

## Why not M0

M0 proves Everyone + publish/list on both surfaces. Follows without a working badge and mute is a half-filter. Keep the proof loop small.

`applyFilter` and `parseNip65` / `readRelays` / `writeRelays` should already exist and be unit-tested in `@margin/core` from S1. This slice *wires* them.

## Behavior

1. Logged-in: fetch latest `kind:3` for self; default filter = Follows if the list is non-empty, else Everyone.
2. Follows view: keep a top-level node if author ∈ follows ∪ {self} **or** any descendant is. Mute drops the whole subtree.
3. Everyone view: all verified room events minus mutes.
4. Local mute list in `Kv` key `mutes` (`string[]` hex). Persist across sessions. No NIP-51 (see `M2-nip51-mute.md`).
5. Badge (background, short probe, then drop sub):
   - integer = Follows hits including self, cap 99
   - empty text + quiet dot if Everyone > 0 and Follows = 0
   - clear if both 0
   - skip `chrome:`, `about:`, extension pages, normalize failures
   - debounce tab URL 300ms; 2.5s maxWait; no long-lived pool on the SW
6. Read = curated ∪ user NIP-65 read ∪ write. Write = curated ∪ user NIP-65 write. Cache `followsCache` / `nip65Cache`.

## Out of scope here

Firefox sidebar, options UI, NIP-51, WoT, badge on the host page DOM.

## Done when

Regular with a follow list opens three articles: badge tells the truth, panel defaults to Follows, mute hides a pubkey, Everyone still shows strangers.
