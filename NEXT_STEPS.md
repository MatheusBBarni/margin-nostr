# Next steps

`docs/` is only `docs/tasks/`. Status lives in each file. Do not pick a **done** task.

## Already shipped

| Task | Evidence |
| --- | --- |
| S7 Follows / badge / mute / NIP-65 | Panel + `/u/`, `probeBadge`, `applyFilter`, `s7-proof` |
| S8 Options / Firefox / probe | `Options.tsx`, `gecko.id`, `relays.probe.md` (4/5 `#I` ok; damus no-index) |
| F22 Keyboard | `toggle-panel` `Alt+Shift+M`, `panelKeyboard.ts` |
| F19 njump | Open on each thread comment → njump nevent |
| F20 Relay status | Live `/u/` footer: `nos up, primal up, oxtr up, wellorder up` |
| F23 Context menu | Right-click **Comment on this page** → `sidePanel.open({ tabId })` / Firefox `sidebarAction.open()` |
| F24 title (static) | `document.title = Comments on ${url}` on `/u/` |

Also shipped outside this list: `/me`, `/rooms`, `/privacy`.

## Do not start

- **M2 helper relay** — probe is not empty (`nos.lol`, primal, oxtr, wellorder).
- **M2 NIP-51 mute** — local mute is enough until launch needs cross-client sync.
- **Domain / OG Worker** — only after people share `/u/` links and unfurls look blank.

## Order

**1. Manual proof still owed**  
F19: Open a live comment, Tab to Open (focus ring), njump shows that `kind:1111`.  
F23: Right-click an https page (and a link/image), then `chrome://`. Firefox `open()` path.

**2. Launch-only, later**  
Store listing, real `VITE_PUBLIC_ORIGIN`, AMO `gecko.id`, NIP-51, domain.

## Recommendation

No open product tasks in `docs/tasks`. Next work is manual proof, then store/launch extras.
