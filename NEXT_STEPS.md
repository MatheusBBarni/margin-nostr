# Next steps

`docs/` is only `docs/tasks/`. Status lives in each file. Do not pick a **done** task.

Product P1/P2 in that list is done. What is left is proof, then store/launch.

## Already shipped

| Task | Evidence |
| --- | --- |
| S7 Follows / badge / mute / NIP-65 | Panel + `/u/`, `probeBadge`, `applyFilter`, `s7-proof` |
| S8 Options / Firefox / probe | `Options.tsx`, `gecko.id`, `relays.probe.md` (4/5 `#I` ok; damus no-index) |
| F19 njump | Open on each thread comment → njump nevent |
| F20 Relay status | Live `/u/` footer: `nos up, primal up, oxtr up, wellorder up` |
| F22 Keyboard | `toggle-panel` `Alt+Shift+M`, `panelKeyboard.ts` |
| F23 Context menu | Merged. Right-click **Comment on this page** → `sidePanel.open({ tabId })` / Firefox `sidebarAction.open()` |
| F24 title (static) | `document.title = Comments on ${url}` on `/u/` |

Also shipped: `/me`, `/rooms`, `/privacy`.

## Do not start

- **M2 helper relay** — probe is not empty (`nos.lol`, primal, oxtr, wellorder).
- **M2 NIP-51 mute** — local mute is enough until launch needs cross-client sync.
- **Domain / OG Worker** — only after people share `/u/` links and unfurls look blank.

## Order

**1. Manual proof**

F19 (playwright-cli, live `/u/https://digibee.com/`):
- **Open** is in the comment row, `target=_blank`, njump nevent.
- Tab from Reply lands on **Open on njump**.
- Click opens njump: Kind type **1111** Comment, same body, `I`/`K=web`.
- Focus ring: Open is a HeroUI `Link` with button variants, so `data-focus-visible` paints the ring (`#4c6ee6`).

F23: not automatable here. Native `contextMenus` is OS chrome. CLI `--load-extension` did not keep Margin in `chrome://extensions`. Still owed by hand (https page, link/image, `chrome://`, Firefox `open()`).

agent-browser: bundled Chrome for Testing is broken on this machine (`dlopen` missing Framework). Used `--cdp 9222` against system Chrome instead.

**2. Launch-only, later**  
Store listing, real `VITE_PUBLIC_ORIGIN`, AMO `gecko.id`, NIP-51, domain.

## Recommendation

F19 proof is done. F23 still needs a hand click-through. There is no other open product task in `docs/tasks`.
