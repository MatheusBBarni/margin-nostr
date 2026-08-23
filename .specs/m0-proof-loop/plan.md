# Requirements Document — M0 Proof Loop

**Status:** approved  
**Cycle:** S0–S6 on Chromium  
**Not this cycle:** S7–S8, P1 extras not required by the S4 contract, P2, M2  
**Deferred work:** [docs/tasks/](../../docs/tasks/)  
**Sources:** PRD.md, TECHSPEC.md, AGENTS.md, grill-me 2026-03-25  
**Authority:** AGENTS.md and this file win over scratch docs when they disagree.

## 1. Objective

Prove Margin’s loop on three real https pages:

**normalize URL → fetch `#I` → sign `kind:1111` → list in the side panel → same list on `/u/…`**

A second tool (`nak req -k 1111 --tag I <url>`) can see what we published. `bun test` in `@margin/core` is green. At least one curated relay round-trips `#I`.

## 2. Product (locked, not reopened)

- A URL is a room. Comments are NIP-22 / NIP-73 `kind:1111`.
- Two surfaces, one library: WXT side panel + Vite `/u/{urlencoded}` site.
- No home feed. Navigation = the URL the user is already on.
- Follows default when a follow list exists; Everyone is the other tab. No WoT.
- No nsec. No content script. No NDK. No helper relay. No `kind:1`. No reactions/zaps.

M0 does **not** wire Follows to `kind:3` (that is S7). Panel/site render **Everyone** (all verified room events). Filter tabs may exist as UI chrome with Everyone active; Follows can show the PRD empty copy and stay non-functional until S7.

## 3. Expected behavior (M0)

### Core (`@margin/core`) — S0–S3

- `normalizeUrl(raw)` is the only writer of `I`/`i`. Throws `NormalizeError` on non-http(s) or unparseable input.
- Algorithm and fixtures as TECHSPEC §5.1 (https, strip `www.`/`m.`/`mobile.`, default ports, collapse slashes, drop fragment, tracking query denylist, **always drop `ref`**, sort remaining query keys).
- `buildTopLevel` / `buildReply` write NIP-22 tags exactly. Content trimmed; reject empty and `length > 4000`.
- `parseComment`: `verifyEvent`, kind 1111, room match, `K=web` or `k=web`. Drop everything else.
- `nest`: attach replies; orphans render as top-level “parent missing”; siblings by `created_at` asc; cap 200 (drop oldest after nest).
- `applyFilter` is implemented and unit-tested in core (S1). Surfaces in M0 may call it with `everyone` and empty follows.
- Relays: `CURATED_RELAYS` as locked; `readRelays` / `writeRelays` always ∪ curated. No outbox walk.
- `subscribeRoom` / `publishRoom` / `probeRelay`. Always verify inbound. Dedup by id.
- Signers: `nip07` (site only), `bunker` (`bunker://` paste), `extension-message` (nos2x/Alby `sendMessage`). Resolution order as TECHSPEC. Never both-at-once.
- Persistence port `Kv`; adapters in app packages. Keys as TECHSPEC. No nsec key.

### UI (`@margin/ui`) — S4

Presentational + callbacks only. No `browser`, no `window.nostr`, no pool.

- `Thread`, `Comment`, `Compose`, `AuthBar`, `FilterTabs`, `RoomFooter`, `renderText`, `applyTheme`.
- Empty Follows: “None of your people have commented. Be the first, or see Everyone.”
- Empty Everyone: “No comments on this URL yet.”
- Footer: normalized URL + permalink control.
- `renderText`: escape HTML; linkify `http(s)`, `nostr:`, `npub1`, `note1`, `nevent1`. No Markdown. `rel=noopener`.
- Compose: one box; reply chip; disabled when no signer.
- AuthBar: site gets NIP-07 + bunker; panel omits `onConnectNip07`.

**Visual**

- Colors from `DESIGN.md` (not layout, not Cohere fonts).
- Type: `ui-sans-serif, system-ui, sans-serif`; labels `ui-monospace`.
- Theme: `light | dark | system` via `class` + `data-theme` on `<html>`.
- Light: canvas `#ffffff`, ink `#212121`, primary `#17171c`, on-primary `#ffffff`, stone `#eeece7`, hairline `#d9d9dd`, muted `#93939f` / `#616161`, action `#1863dc`, focus `#4c6ee6`, error `#b30000`.
- Dark: derive from DESIGN dark bands — background `#000000` / `#17171c`, foreground `#ffffff`, cards `#17171c`, muted `#93939f`, same action/error. Primary CTA inverts to light pill on dark (as DESIGN dark bands).
- HeroUI v3 compound components, `onPress`, no `<HeroUIProvider>`, no v2, no second kit.
- Quiet reader chrome. No feed, no “what’s happening”, no emoji-as-icon.

### Extension — S5

- WXT MV3, Chromium. Permissions: `storage`, `tabs`, `sidePanel`. Host: `wss://*/*`, `https://*/*`. **Zero** content scripts.
- Background: `action.onClicked` → `sidePanel.open`. `getActiveTab` / `tab-changed`. **No badge probe in M0** (S7).
- Panel: active tab URL → normalize → subscribe curated (∪ NIP-65 if we already have a cache; fetching/merging NIP-65 is S7) → Thread + Compose.
- Publish: `extension-message` then bunker. Optimistic insert after local `verifyEvent`.
- Skip `chrome:`, `about:`, extension pages, normalize failures — first-class empty/error, not a blank panel.

### Web — S6

- `/` one-screen explainer + install note + paste-a-URL.
- `/u/*` room; splat `decodeURIComponent` → `normalizeUrl`; throw → empty error state.
- `document.title = Comments on ${normalized}`.
- Auth: `window.nostr` then bunker. Logged-out = Everyone.
- Permalink the extension copies: `${VITE_PUBLIC_ORIGIN}/u/${encodeURIComponent(normalized)}` with default `http://localhost:5173`.
- SPA fallback `_redirects`. No Pages deploy required to call this cycle done.

### Probe

- `bun probe` against the five curated relays. Write `packages/core/src/relays.probe.md`. Drop failures from `CURATED_RELAYS` before calling M0 done. Throwaway key **only** in the probe script.

## 4. Edge cases (M0)

- Non-http(s) / garbage URL → `NormalizeError` / dedicated empty state.
- Relays lie: drop bad sig, wrong kind, wrong room.
- Parent missing → orphan shown, not dropped.
- No signer → read-only compose.
- `sendMessage` “Could not establish connection” → next extension id, then bunker prompt.
- Bunker disconnect deletes `signer` including `clientSkHex`.
- Duplicate events → one row (id).
- >200 events → oldest dropped after nest.
- Query-key sort may miss other clients’ unsorted `I` tags — accept in v1.
- GitHub `?ref=branch` splits rooms — accept.

## 5. Stack

bun workspaces · `packages/{core,ui,extension,web}` · TypeScript · React 19 · HeroUI v3 · Tailwind v4 + `@tailwindcss/vite` · WXT · Vite · `nostr-tools` (not NDK; AGENTS.md wins over TECHSPEC’s `@nostr/tools` wording) · Cloudflare Pages-ready, not deployed this cycle.

Tests: `bun:test` in `core` only. UI/extension/web manually proven.

## 6. Constraints

Hard rules from `AGENTS.md`. Skills when writing code: `heroui-react`, `ui-ux-pro-max`, `vercel-react-best-practices` (skip `server-*`), `wxt-browser-extensions` (skip all `inject-*`).

## 7. Deferred (`docs/tasks/`)

| File | Why |
| --- | --- |
| `S7-follows-badge-mute.md` | kind:3 Follows, badge+dot, local mute, NIP-65 merge |
| `S8-options-firefox-probe.md` | Options page, Firefox, Amber QR, extra relays, probe sign-off |
| `F19-njump-link.md` | P1 comment → njump/nevent |
| `F20-relay-status.md` | P1 relay science (footer may show a minimal hint in M0 if data is free) |
| `F22-keyboard.md` | P2 toggle panel / focus compose |
| `F23-context-menu.md` | P2 “Comment on this page” |
| `M2-nip51-mute.md` | NIP-51 mute sync |
| `M2-helper-relay.md` | Only if probe finds zero `#I` relays |
| `open-domain-and-og.md` | Real domain, OG Worker |

## 8. Grill decisions

1. Scope = M0 S0–S6; missing work → `docs/tasks/`.
2. Colors = DESIGN.md; layout ≠ Cohere marketing.
3. Type = system UI.
4. Permalink origin = `VITE_PUBLIC_ORIGIN` default `http://localhost:5173`.
5. Follows *logic* stays in S7 (not pulled into M0).
