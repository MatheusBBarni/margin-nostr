# F23 — TDD implementation plan

Canonical plan for `.specs/f23-context-menu/`. Requirements: `plan.md`.

## Public interface

New seam: `packages/extension/src/contextMenu.ts` (pure, no `browser`, no React). Same test style as `panelKeyboard`.

```ts
export const COMMENT_ON_PAGE_ID = "comment-on-this-page"

export function commentOnPageMenu(): {
  id: string
  title: string
  contexts: string[]
  documentUrlPatterns: string[]
}

export type ContextMenuClickDecision =
  | { action: "open"; tabId: number }
  | { action: "ignore" }

export function decideContextMenuClick(input: {
  menuItemId: string | number
  tab?: { id?: number; url?: string }
}): ContextMenuClickDecision
```

Wiring (not unit-tested this cycle):

- `wxt.config.ts` — `contextMenus` permission
- `entrypoints/background.ts` — `contextMenus.create(commentOnPageMenu())` + `onClicked`
- Chromium: `sidePanel.open({ tabId })`
- Firefox: `sidebarAction.open()` (not toggle)

## Behaviors to test (in order)

1. Our item + `https` tab with an id → `{ action: "open", tabId }`
2. Menu create options are **Comment on this page**, the agreed contexts, and http(s) `documentUrlPatterns`
3. Different menu id → ignore
4. `chrome:` / `about:` / extension / `file:` / `ftp:` → ignore
5. Missing tab id → ignore
6. `http://` tab → open

## Out of scope for this cycle

- React / Playwright
- F22 focus
- Web `/u/`
- Tab-strip menus
- Comment-on-link as a different room
