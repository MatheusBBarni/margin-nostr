# F22 — Keyboard: toggle panel, focus compose

Approved requirements for the TDD pipeline. Task: `docs/tasks/F22-keyboard.md`. PRD: F22.

## Feature objective

A Regular can open the Margin side panel from the keyboard and start typing without the mouse.

## Expected behavior

1. **Command.** Manifest command `toggle-panel` with suggested key `Alt+Shift+M` (user-rebindable in the browser). Not `_execute_action` — the toolbar stays open-only.
2. **True toggle.** Closed → open and land focus. Open → close.
   - Chromium 141+: `sidePanel.close()` / `sidePanel.open()`
   - Older Chromium: open-only fallback; if already open, ask the panel to land focus
   - Firefox: `sidebarAction.toggle()`
3. **Toolbar.** Unchanged. Chromium `openPanelOnActionClick` still only opens.
4. **Open-focus (once).** After the first signer check finishes: compose if connected, else the first AuthBar control. Do not steal focus if the user already tabbed or typed. No focus on skippable/invalid URL views (nothing to type).
5. **In-panel `c`.** Only while the panel is focused. Same target as open-focus. Ignore `c` when the event target is an input, textarea, or contenteditable.
6. **Thread.** Reply and Mute stay real buttons (Tab, then Enter/Space). No `r`/`m` letter shortcuts.
7. **Web `/u/`.** No auto-focus, no `c`. Shared UI only exposes focusable compose/AuthBar and keeps Reply/Mute keyboard-reachable.

## Identified edge cases

- Signer still hydrating: wait, then focus once.
- Panel open, shortcut pressed, `close()` missing: do not no-op; send a focus request.
- `c` on skippable/invalid: ignore.
- Suggested key not granted (conflict): command still exists; user binds it in the browser. No options-page help in this cycle.

## Stack / technologies

Existing Margin stack. WXT background + side panel. `@margin/ui` presentational only. Pure decision helpers in `packages/extension` with `bun:test` (same pattern as `badgeDecision`).

## UI/UX references

- `IDEA.md`: `Alt+Shift+M` toggle, `c` focus compose when the panel is open.
- `DESIGN.md` focus token for visible rings (`#4c6ee6`).
- No Figma.

## Constraints / dependencies

- No content script. No page DOM. No page-level key hijack.
- No nsec. No new UI kit.
- `commands` is a manifest key, not a permission.
- `chrome.sidePanel.close()` is Chrome 141+.
- Shared `Thread` / `Compose` / `AuthBar` / `Comment` must stay free of `browser` and `window.nostr`.

## Out of scope

Context menu (F23). Options shortcut docs. Web auto-focus. Per-comment `r`/`m`. Toolbar toggle. Safari.

## Grill decisions

1. Shortcut is a true toggle, with open-only + focus fallback when `close()` is missing.
2. Toolbar stays Chromium open-only (`openPanelOnActionClick`).
3. In-panel `c` is in scope; ignore while typing.
4. Thread keyboard = existing Reply/Mute buttons only.
5. Command / open-focus / `c` are extension-only.
6. Open-focus waits for the first signer check, then runs once.
