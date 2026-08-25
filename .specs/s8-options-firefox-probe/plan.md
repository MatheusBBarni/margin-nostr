# Requirements Document — S8 Options, Firefox, permalink origin, probe

**Status:** approved  
**Cycle:** S8 (M1, after S7)  
**Not this cycle:** store upload, Safari, i18n, telemetry, NIP-51, web settings UI, web QR, invented Pages domain, helper relay unless probe empties curated  
**Deferred work:** [docs/tasks/M2-helper-relay.md](../../docs/tasks/M2-helper-relay.md)  
**Sources:** `docs/tasks/S8-options-firefox-probe.md`, PRD F11 / §11 Options, TECHSPEC §5.7 / §6 / §7.1–7.4 / §11 / §15, AGENTS.md, grill-me  
**Authority:** AGENTS.md and this file win over scratch docs when they disagree.

## 1. Objective

Ship the M1 wrap: an extension Options page that can connect bunker / Amber / nos2x-Alby and edit mute, theme, default filter, and extra relays; a Firefox sidebar build; Copy thread still env-driven; a checked-in `#I` probe report with dead curated relays removed.

## 2. Product (locked, not reopened)

- No nsec. No content scripts. No NDK. `SimplePool` only.
- One active signer. Never both-at-once.
- Follows is still the *unset* default when a follow list exists. Everyone is the other tab. No WoT.
- Mute stays local `Kv` only.
- Read/write still curated ∪ NIP-65, plus extension extra relays this cycle.
- Logout deletes `signer` including `clientSkHex`.
- Empty curated after probe = stop. Do not invent a helper relay here.

## 3. Expected behavior

### Default filter

- Stored `defaultFilter`: `'follows' | 'everyone'`. Unset = `'follows'`.
- Seed only when the follow list is non-empty: use stored pref. Empty list → always Everyone.
- Manual tab click still wins for the rest of the session.
- Logout → Everyone until the next login hydrates.
- Options can set the pref logged-out.
- Implement in shared `useRoomSession` so web honors the key *if present*. No web editor this cycle.

### Extra relays

- `extraRelays: string[]` on **extension** `chrome.storage` only.
- `wss://` only (`normalizeRelayUrl`), deduped, junk dropped.
- Union into **both** `readRelays` and `writeRelays` (and therefore badge + panel).
- Web stays curated ∪ NIP-65.
- Options: list + add + remove, under Advanced.

### Connect (panel + Options)

- Panel/web AuthBar stay as quick connect (prompt / NIP-07).
- Options is the manager: `bunker://` field (not `window.prompt`), Amber QR, extension-signer status, logout.
- On load, restore the **stored** signer if it still works.
- Probe nos2x / Alby is status + an explicit Connect. No silent steal from bunker.
- Connecting bunker or extension replaces the stored signer. Leaving bunker deletes `clientSkHex`.
- Logout (Options or panel) deletes `signer` + `selfProfile`, closes the signer.

**Firefox signer ids** (confirmed on AMO, do not hard-fail if missing):

| Signer | Chromium | Firefox |
| --- | --- | --- |
| nos2x | `kpgefcfmnafjgpblomihpgmejjdanjjp` | `{fdacee2c-bab4-490d-bc4b-ecdd03d5d68a}` |
| Alby | `iokeahhehimjnekafflcihljlcjccdbe` | `extension@getalby.com` |

`detectExtensionSigner` tries all known ids; first pubkey wins.

### Amber QR (Options only)

- `createNostrConnectURI` + `BunkerSigner.fromURI`.
- Show QR + URI + Copy. Relays on the URI = current curated set.
- On success, persist reconnectable `bunkerPointer` + `clientSkHex` like a paste.
- In-flight QR is not resumed if Options closes. Web has no QR this cycle.

### Mute editor

- List current mutes (short hex; name/picture only if already cached).
- Unmute per row. Add field accepts 64-hex or `npub1`.
- Same `mutes` key as the panel. No confirm. No NIP-51.

### Theme

- `'light' | 'dark' | 'system'` via existing `applyTheme`.
- Options writes the key and applies immediately.
- Open panel follows `chrome.storage.onChanged` for theme, signer, mutes, `defaultFilter`, `extraRelays`.

### Firefox

- Keep `gecko.id` `margin@local`.
- `wxt build -b firefox` must emit `sidebar_action` (not Chrome `side_panel`).
- Background: Chrome `sidePanel.open`; Firefox `sidebarAction.toggle()` (already branched).

### Permalink origin

- Keep code default `http://localhost:5173` on the extension.
- Document `VITE_PUBLIC_ORIGIN` for the real Pages/preview host. Do not invent a domain.

### Probe

- Run `bun probe`. Write `packages/core/src/relays.probe.md`.
- Then edit `CURATED_RELAYS` to drop failures. Script does **not** rewrite the TS array.
- If the list would be empty → **stop**. Reopen `docs/tasks/M2-helper-relay.md`. Do not ship an empty curated set.

## 4. Edge cases

- Invalid bunker / nostrconnect → error on Options, stored signer unchanged.
- Probe finds nothing → show “No extension signer found”, stay on stored bunker or logged out.
- `Could not establish connection` → try next id.
- Extra relay `https://…` or trailing junk → dropped, not stored.
- Duplicate extra relay / mute → no-op.
- Bad npub / non-hex add → field error, list unchanged.
- Stored bunker missing `clientSkHex` → treat as logged out, do not invent a key silently for an old pointer.
- Options open + panel open: storage events update the panel; if the user already clicked a filter tab, do not snap `defaultFilter`.
- OS theme change while pref is `system`: apply on next Options/panel apply (no requirement for a live `matchMedia` watcher).
- Probe flake vs `no-index`: only **ok** stays in `CURATED_RELAYS`.

## 5. Stack

Unchanged: bun workspaces, `@margin/core` (`bun:test`), `@margin/ui` presentational, WXT options + panel + background, Vite web, `nostr-tools` `SimplePool` only.

UI: HeroUI v3 + existing `styles.css` tokens. No second kit. Options is a full extension page, not the side panel.

## 6. Out of scope

Store listing, Safari, i18n, telemetry, NIP-51, web settings page, web Amber QR, last-tab-as-default, auto-connect first probe hit, helper relay unless curated is empty, changing panel AuthBar into “Open options” only.

## 7. Done when

- Chromium Options can connect bunker, show Amber QR, connect/show nos2x or Alby, edit mutes / theme / default filter / extra relays, and logout wipes `clientSkHex`.
- Firefox build uses sidebar; M1 loop is runnable there (manual).
- Copy thread still honors `VITE_PUBLIC_ORIGIN`.
- `relays.probe.md` is in-repo; `CURATED_RELAYS` has no probe failures (or we stopped).
- `bun test` green.
