# Next steps

`docs/` is only `docs/tasks/`. Status lives in each file. Do not pick a **done** task.

Product P1/P2 in that list is done. What is left is one hand proof, then store/launch.

## Already shipped

| Task | Evidence |
| --- | --- |
| S7 Follows / badge / mute / NIP-65 | Panel + `/u/`, `probeBadge`, `applyFilter`, `s7-proof` |
| S8 Options / Firefox / probe | `Options.tsx`, `gecko.id`, `relays.probe.md` (4/5 `#I` ok; damus no-index) |
| F19 njump | Live `/u/https://digibee.com/`: Open → njump kind **1111**. Tab focus ring after HeroUI `Link` fix |
| F20 Relay status | Live footer: `nos up, primal up, oxtr up, wellorder up` |
| F22 Keyboard | `toggle-panel` `Alt+Shift+M`, `panelKeyboard.ts` |
| F23 Context menu | Code on `main`. Right-click **Comment on this page** → `sidePanel.open({ tabId })` / Firefox `sidebarAction.open()` |
| F24 title (static) | `document.title = Comments on ${url}` on `/u/` |

Also shipped: `/me`, `/rooms`, `/privacy`.

## Do not start

- **M2 helper relay** — probe is not empty (`nos.lol`, primal, oxtr, wellorder).
- **M2 NIP-51 mute** — local mute is enough until launch needs cross-client sync.
- **Domain / OG Worker** — only after people share `/u/` links and unfurls look blank.

## Order

**1. F23 by hand (next)**  
Reload the unpacked extension from this `main`.

- Right-click an https page → **Comment on this page** → same panel as the toolbar, that tab.
- Same on a link and an image.
- `chrome://` has no item.
- Firefox: `sidebarAction.open()`, not toggle.

Native `contextMenus` is OS chrome, so this one is not a playwright/agent-browser job.

**2. Launch-only, later**  
Store listing, real `VITE_PUBLIC_ORIGIN`, AMO `gecko.id`, NIP-51, domain.

## Recommendation

Do the F23 click-through. There is no other open product task in `docs/tasks`.
