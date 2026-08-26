# Next steps

`docs/` is only `docs/tasks/`. Status lives in each file. Do not pick a **done** task.

## Already shipped

| Task | Evidence |
| --- | --- |
| S7 Follows / badge / mute / NIP-65 | Panel + `/u/`, `probeBadge`, `applyFilter`, `s7-proof` |
| S8 Options / Firefox / probe | `Options.tsx`, `gecko.id`, `relays.probe.md` (4/5 `#I` ok; damus no-index) |
| F22 Keyboard | `toggle-panel` `Alt+Shift+M`, `panelKeyboard.ts` |
| F19 njump | Open on each thread comment → njump nevent |
| F20 Relay status | Footer names: `damus up, oxtr failed`. Session passes `relayHealth`. |
| F24 title (static) | `document.title = Comments on ${url}` on `/u/` |

Also shipped outside this list: `/me`, `/rooms`, `/privacy`.

## Do not start

- **M2 helper relay** — probe is not empty (`nos.lol`, primal, oxtr, wellorder).
- **M2 NIP-51 mute** — local mute is enough until launch needs cross-client sync.
- **Domain / OG Worker** — only after people share `/u/` links and unfurls look blank.

## Order

**1. F23 — context menu (P2)**  
Right-click → “Comment on this page” → same panel as the toolbar, on that tab. `contextMenus` only. Still no content script. Skip `chrome:`, `about:`, extension pages.

**2. Manual proof still owed**  
F19: Open a live comment, Tab to Open (focus ring), njump shows that `kind:1111`.  
F20: In a live room, footer names each relay up/failed without leaving the page.  
F23 after it lands.

**3. Launch-only, later**  
Store listing, real `VITE_PUBLIC_ORIGIN`, AMO `gecko.id`, NIP-51, domain.

## Recommendation

The only open product task in `docs/tasks` is **F23**.
