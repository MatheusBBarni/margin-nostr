# AGENTS.md

Instructions for coding agents working on **Margin**.

A URL is a room.
Comments are signed Nostr `kind:1111` events (NIP-22 / NIP-73).
Two surfaces share one library: a Chromium/Firefox **side panel** and a **static** public site.

This file is the durable brief.
The code and `bun:test` fixtures are the durable contract.
Do not invent a different product, protocol, or stack.
Do not reopen a locked decision in this file without asking the user.

The public product idea lives in [README.md](./README.md).
Visual reference lives in [DESIGN.md](./DESIGN.md).
`IDEA.md`, `PRD.md`, and `TECHSPEC.md` are local scratch.
They will not be in the public repo.
If they are present, they may explain *why* something landed here.
They are not authority.
If they disagree with this file, the README, or the code, this file and the code win.

---

## What we are building

- Extension (primary): WXT MV3 side panel on the current tab URL.
- Web: Vite SPA on Cloudflare Pages. `/` explainer. `/u/{urlencoded-url}` is the room.
- Shared `packages/core` for normalize, events, pool helpers, signers, filters.
- Shared `packages/ui` for Thread, Compose, Auth, filters. Presentational + callbacks only.

Navigation is the URL the user is already on.
There is no home feed.

---

## Stack (locked)

bun workspaces · `packages/*` · TypeScript · React 19 · HeroUI v3 · Tailwind CSS v4 · WXT · Vite · `nostr-tools` · Cloudflare Pages.

| Package | Role |
| --- | --- |
| `@margin/core` | Zero React. Zero browser APIs. `bun:test` lives here. |
| `@margin/ui` | HeroUI + Tailwind. No `browser`, no `window.nostr`, no pool. |
| `@margin/extension` | WXT. Background + side panel + options. `chrome.storage.local`. |
| `@margin/web` | Vite + React Router. `localStorage`. |

Toolchain is **bun**.
No npm, no pnpm, no Node-as-the-runner, no Vitest.
WXT still bundles the extension.
Vite still bundles the site.

UI: `@heroui/react` + `@heroui/styles` (v3 only) and `tailwindcss@^4` + `@tailwindcss/vite`.
No HeroUI v2, no `<HeroUIProvider>`, no PostCSS, no `tailwind.config.js`, no second component kit, no CSS-in-JS.
CSS import order is mandatory: `tailwindcss` then `@heroui/styles`.
`@margin/ui` owns `styles.css` and `applyTheme`.
Apps only import that CSS and register `@tailwindcss/vite`.
Theme is `'light' | 'dark' | 'system'` via `class` + `data-theme` on `<html>`.
No `next-themes`.
Tokens live in `packages/ui/src/styles.css` as CSS variables. Do not fork HeroUI component CSS.

---

## Hard rules

These are launch-level, not style nits.

1. **No nsec.** No paste field, no storage key, no `finalizeEvent` with a user key.
2. **No content scripts.** No `executeScript`, no page DOM, no `<all_urls>` injection.
3. **No NDK.** `nostr-tools` `SimplePool` only.
4. **No helper relay / Worker / custom kind** in v1.
5. **Always `verifyEvent`** inbound. Drop events whose `I`/`i` is not this room.
6. **`normalizeUrl` is the only writer of `I`/`i`.** Fixtures fail the build if they regress.
7. **Write NIP-22 exactly.** Top-level: `I`/`K=web`/`i`/`k=web`. Reply: `I`/`K` + `e` + `k=1111` + `p`. No `kind:1` pointer.
8. **Read = curated ∪ user NIP-65. Write = curated ∪ user NIP-65 write.** No outbox walk in v1.
9. **Side panel cannot see page-injected `window.nostr`.** Use bunker and/or Alby/nos2x `sendMessage`.
10. **Follows is the default** when a follow list exists. Everyone is the other tab. No WoT.
11. Build in package order: `core` (tested) → `ui` → extension panel → web `/u/*` → follows/badge/mute → options/Firefox. Do not start the next layer before the previous is green (or manually proven, for UI).

---

## Skills

Load the matching skill **before** writing or reviewing that kind of code.
Project skills live in `.agents/skills/` (also mirrored under `.claude/skills/`).

### Always, by area

| Skill | Path | When |
| --- | --- | --- |
| `heroui-react` | `.agents/skills/heroui-react/SKILL.md` | Any HeroUI component, theme, `onPress`, compound API, CSS tokens |
| `wxt-browser-extensions` | `.agents/skills/wxt-browser-extensions/SKILL.md` | `packages/extension`: background SW, side panel, storage, messaging, manifest |
| `vercel-react-best-practices` | `.agents/skills/vercel-react-best-practices/SKILL.md` | Writing or reviewing React in `ui`, `web`, or the panel |
| `ui-ux-pro-max` | `.agents/skills/ui-ux-pro-max/SKILL.md` | Layout, empty states, a11y, visual review. Match existing `styles.css` tokens. |
| `grill-me` | `.agents/skills/grill-me/SKILL.md` | Stress-test a plan. One question at a time. Update this file when a decision lands. |
| `humanizer` | `.agents/skills/humanizer/SKILL.md` | User-facing prose (PR text, store copy, empty-state copy). |
| `git-commit` | `.agents/skills/git-commit/SKILL.md` | Any commit. User must supply the conventional type. Do not commit without this skill. |

**Overrides (project wins over skill boilerplate):**

- HeroUI skill shows Next.js + PostCSS. **Ignore that.** Use Vite/WXT + `@tailwindcss/vite` as in Stack above.
- HeroUI is **v3 only**. No `HeroUIProvider`, no `framer-motion`, no `@heroui/theme`. Fetch v3 docs before implementing a component.
- WXT skill has a large content-script (`inject-*`) section. **Do not follow it.** v1 has zero content scripts.
- React skill mentions Next.js server patterns. We have no Next.js. Skip `server-*` rules.

### When the environment has them

| Skill | When |
| --- | --- |
| `context7-mcp` | Current docs for WXT, Vite, bun, `nostr-tools`, Tailwind v4, React Router, Cloudflare Pages. Prefer this over memory. |
| HeroUI MCP (`heroui-react`) | Live v3 component docs, source, theme variables. Use with the `heroui-react` skill. |
| `tdd` | `packages/core` always. Any other test-first work the user asks for. `bun:test` only. |
| `git-workflow` / `git-worktree` / `git-ckp` | PRs, worktrees, branch switches. |
| `grill-with-docs` | Same as `grill-me`, but against existing domain docs / ADRs. |

Do not load React Native, OpenTUI, or Workers/Durable Objects skills.
This is not those products.

---

## Library docs

Do not guess HeroUI v3 or Tailwind v4 APIs.

1. HeroUI components: `heroui-react` skill + HeroUI MCP `get_component_docs` / `get_docs`.
2. Everything else (WXT, Vite, bun, `nostr-tools`, Tailwind, React Router): Context7 `resolve-library-id` then `query-docs`.
3. Visual decisions: `ui-ux-pro-max` search, then existing tokens in `packages/ui/src/styles.css`.

---

## Commands

Once S0 exists:

```bash
bun install
bun test                               # packages/core, bun:test
bun run --filter @margin/extension dev
bun run --filter @margin/extension build
bun run --filter @margin/extension build:firefox
bun run --filter @margin/web dev
bun run --filter @margin/web build
bun probe                              # #I round-trip on curated relays
./scripts/generate-icons.sh            # rasterize assets/*.jpg → public icons
```

If `rtk` is on PATH, prefix those commands with `rtk`.

Brand marks: `assets/margin_minimal_logo.jpg` (toolbar / favicon) and `assets/margin_full_logo.jpg` (wordmark). Icons are opaque white + black. Do not punch white to alpha. Do not open `icon-16.png` or `favicon-16.png` in a vision model — 16×16 is under the 512-pixel floor and 400s. Verify with `identify` or a 512px preview.

---

## How to implement

1. Read this file. Then read the package you are about to change.
2. Load the skills in the table above.
3. **`core`**: TDD. Red then green. Fixtures in `normalize.fixtures.json` are law.
4. **`ui`**: HeroUI for chrome, Tailwind for layout. Theme via `class` + `data-theme`. Tokens only in `styles.css`.
5. **Surfaces**: Panel owns a `SimplePool` while visible. Background does short badge probes only, then drops the sub.
6. Keep `@margin/ui` free of browser and signer APIs. Ports live in the app packages.

Empty and error states are first-class.
Do not fake occupancy.

---

## Do not

- Content scripts, overlays, `rel=me`, page badges in the host DOM
- NDK, custom relay, Workers, OG tags
- `kind:1`, `kind:7`, zaps, NIP-51 (until M2), NIP-84
- Full outbox model
- Markdown composer
- A second UI kit, HeroUI v2, Tailwind v3, CSS-in-JS
- nsec anywhere
- i18n, telemetry, Safari, native apps

---

## Done when (M0)

S0–S6 on Chromium: normalize → fetch `#I` → sign → list in the panel → same list on `/u/…`, on three live URLs.
`bun test` green.
At least one curated relay round-trips `#I`.
A second tool (`nak req -k 1111 --tag I <url>`) sees the note we just published.
