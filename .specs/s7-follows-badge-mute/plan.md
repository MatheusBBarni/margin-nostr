# Requirements Document — S7 Follows, badge, mute, NIP-65

**Status:** approved  
**Cycle:** S7 (after M0 S0–S6)  
**Not this cycle:** S8 (options, Firefox sidebar, `defaultFilter`, extraRelays), P1 extras, M2  
**Deferred work:** [docs/tasks/S8-options-firefox-probe.md](../../docs/tasks/S8-options-firefox-probe.md), [docs/tasks/M2-nip51-mute.md](../../docs/tasks/M2-nip51-mute.md)  
**Sources:** `docs/tasks/S7-follows-badge-mute.md`, PRD F8–F10 / F12 / F17, TECHSPEC §5.3–5.6 / §6 / §7.2–7.3 / §8, AGENTS.md, grill-me  
**Authority:** AGENTS.md and this file win over scratch docs when they disagree.

## 1. Objective

Wire the already-tested `applyFilter` / `parseNip65` / `readRelays` / `writeRelays` so a logged-in Regular with a follow list gets a truthful toolbar badge, a Follows-default thread, local mute with undo, and NIP-65 ∪ curated read/write — on the Chromium panel and on `/u/…`.

## 2. Product (locked, not reopened)

- Follows is the default when a follow list exists. Everyone is the other tab. No WoT.
- Mute is local `Kv` only. NIP-51 is M2.
- Badge is extension toolbar only. No host-page DOM. No content scripts.
- Read = curated ∪ user NIP-65 read ∪ write. Write = curated ∪ user NIP-65 write. No outbox walk. No signer `getRelays`.
- No nsec. No NDK. `SimplePool` only.
- `applyFilter` semantics do not change: mute drops the subtree; Follows keeps a stranger root if a descendant is a follow/self.

## 3. Expected behavior

### Follows list

- When a signer is present, fetch latest `kind:3` for self (`authors: [pubkey]`).
- Keep `p` tag[1] only if it is 64 hex chars. Latest event wins (replaceable, not a union of history).
- `verifyEvent` on inbound `kind:3` / `kind:10002`.
- Fetch `kind:3` and `kind:10002` in parallel from curated ∪ cached NIP-65 (if same pubkey).
- Persist `followsCache` `{ pubkey, ids, fetchedAt }` and `nip65Cache` `{ pubkey, read, write, fetchedAt }`.

### Cache

- Same-pubkey cache paints immediately (no Everyone→Follows flash when cache exists).
- Refetch on login and on each surface mount.
- Success replaces the cache. Failure keeps the cache.
- No matching cache → empty follows and curated-only relays.
- Logout does **not** delete caches (they are pubkey-keyed). Badge ignores them when there is no signer.

### Default tab

- Seed from cache: Follows iff cached list is non-empty, else Everyone.
- When the live `kind:3` lands, snap **only if the user has not touched the tabs**: non-empty → Follows, empty → Everyone.
- A manual click wins for the rest of the session.
- Logout → Everyone. Ignore `defaultFilter` until S8.

### Filter

- Follows: existing `applyFilter` (author ∈ follows ∪ {self} **or** any descendant is). Mute drops the whole subtree.
- Everyone: all verified room events minus mutes.
- Wire `hasFollows` so empty copy is correct.
- Both panel and `/u/…`.

### Mute

- `Kv` key `mutes`: `string[]` hex. Device-local, shared across identities, kept on logout.
- Works logged-out. `onMute` always passed. No mute on self.
- Immediate, no confirm. Persist before paint.
- Short toast with **Undo** that removes that hex. No mute manager (S8).
- No NIP-51.

### NIP-65 merge

- Read = curated ∪ user read ∪ user write.
- Write = curated ∪ user write.
- When a same-pubkey 65 is available (cache or live), resubscribe the current room with `readRelays(user65)` without clearing comments already on screen. Publish uses `writeRelays(user65)` immediately.
- Do not use signer `getRelays`. No recipient-inbox relays on reply in this slice.

### Badge (extension background only)

- Short probe, then drop the sub. Debounce tab URL 300ms. 2.5s maxWait.
- Skip `chrome:`, `about:`, extension pages, normalize failures → clear.
- No signer / no follows cache → never a number.
- Count is **flat events**: author ∈ follows ∪ {self} and not muted. Not the `applyFilter` descendant rule. `self` = `followsCache.pubkey`.
- Follows hits > 0 → text `String(min(n, 99))`, background `#1863dc`, white text.
- Follows = 0 and Everyone > 0 → text `"•"`, background `#93939f`.
- Both 0 → clear.
- Panel does not invent a count; it asks the background to probe again after publish.

## 4. Edge cases

- Empty `kind:3` → Everyone default; Follows empty copy = “No follow list yet”.
- Cached follows, live fetch empty, user has not clicked → snap to Everyone.
- Cached follows, user already on Everyone, live fetch empty → stay Everyone.
- Mute a follow → hidden in both tabs; badge stops counting them; they stay in the follow list.
- Undo after remount → still works (Kv).
- Mute the same pubkey twice → list stays unique.
- Invalid / non-hex mute entries ignored when applying.
- NIP-65 fetch fail → curated only if no cache; keep cache if present.
- SW killed mid-probe → best-effort; panel always resubscribes.
- Logged-out badge: quiet dot if the room is non-empty, else clear.

## 5. Stack

Unchanged: bun workspaces, `@margin/core` (`bun:test`), `@margin/ui` presentational, WXT panel + background, Vite web, `nostr-tools` `SimplePool` only.

UI: existing `Thread` / `Comment` / `FilterTabs` / `Toast.Provider`. Wire `onMute` and `hasFollows`. Toast copy: short, “Muted” + Undo. No new kit, no options page, no unmute list.

## 6. Out of scope

Firefox sidebar, options UI, `defaultFilter` persistence, NIP-51, WoT, host-page badge, recipient-inbox relays, extraRelays, polling follows while the surface stays open.

## 7. Done when

A Regular with a follow list opens three articles: badge number or quiet-dot is right, panel defaults to Follows, mute hides a pubkey and Undo brings them back, Everyone still shows strangers, publish/read use merged NIP-65. `bun test` green.
