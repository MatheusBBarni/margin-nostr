# F23 — Context menu “Comment on this page”

Approved requirements for the TDD pipeline. Task: `docs/tasks/F23-context-menu.md`. PRD: F23.

## Feature objective

A Regular can right-click a web page and open the same Margin panel as the toolbar, on that tab.

## Expected behavior

1. **Item.** Context menu entry **Comment on this page**. English only. No i18n.
2. **Where.** Show on http(s) pages for: page, frame, selection, link, editable, image, video, audio. Not on the toolbar icon or the tab strip.
3. **Hide.** No item on `chrome:`, `about:`, extension pages, `file://`, `ftp://`. Implement with `documentUrlPatterns` `http://*/*` and `https://*/*`.
4. **Click.** Opens the panel on the **clicked tab**. Never closes it. If it is already open, leave it. First-open focus stays F22.
5. **Room.** Still the **tab URL**. A click on a link, image, or iframe does not change the room to that href.
6. **Chromium.** `sidePanel.open` targeting that tab.
7. **Firefox.** `sidebarAction.open()` (not `toggle`). Same menu string.

## Identified edge cases

- `onClicked` with a skippable or non-http(s) URL: no-op.
- Missing `tabId`: no-op.
- Wrong `menuItemId`: no-op.
- Panel already open: open again is fine; do not close; do not extra-focus.

## Stack / technologies

Existing Margin stack. WXT background + `contextMenus` permission. Pure decision helper in `packages/extension` with `bun:test` (same pattern as `panelKeyboard` / `badgeDecision`). `@margin/ui` untouched. No content script.

## UI/UX references

- `IDEA.md` / PRD F23: “Comment on this page”
- No Figma

## Constraints / dependencies

- No content script. No page DOM. No `executeScript`.
- No nsec. No Safari. No i18n.
- Toolbar stays open-only. Keyboard shortcut remains the toggle.
- Shared UI stays free of `browser`.

## Out of scope

- Comment-on-this-link as a different room
- Tab-strip / bookmark / action menus
- Options copy
- Web `/u/`
- Changing F22 focus behavior

## Grill decisions

1. Anywhere on the page (page, frame, selection, link, editable, image, video, audio).
2. Hide on non-http(s).
3. Open-only, like the toolbar.
4. Chromium + Firefox this cycle.
