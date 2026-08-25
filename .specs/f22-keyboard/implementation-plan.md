# F22 — TDD implementation plan

Canonical plan for `.specs/f22-keyboard/`. Requirements: `plan.md`.

## Public interface

New seam: `packages/extension/src/panelKeyboard.ts` (pure, no `browser`, no React). Same test style as `badgeDecision`.

```ts
export type PanelCommand = "open" | "close" | "focus"

export function decidePanelCommand(input: {
  open: boolean
  canClose: boolean
}): PanelCommand

export type FocusTarget = "wait" | "compose" | "auth" | "none"

export function decideFocusTarget(input: {
  signerReady: boolean
  hasSigner: boolean
  roomFocusable: boolean
}): FocusTarget

export function shouldHandleComposeShortcut(input: {
  key: string
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  targetIsEditable: boolean
}): boolean

export function isUserFocusMove(input: {
  type: string
  key?: string
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  targetIsEditable?: boolean
}): boolean
```

Wiring (not unit-tested this cycle):

- `wxt.config.ts` — `commands.toggle-panel` suggested key `Alt+Shift+M`
- `entrypoints/background.ts` — `commands.onCommand` + panel-open tracking + Chromium/Firefox toggle
- `packages/extension/src/usePanelKeyboard.ts` — one listener, one `tryLandFocus`; loadable `pubkey`/`tabUrl` (`undefined` = not ready)
- `@margin/ui` Compose / AuthBar — optional `focus()` handles via refs. No `data-margin-*`

## Behaviors to test (in order)

1. Closed panel + command → open
2. Open panel + can close → close
3. Open panel + cannot close → focus (old Chromium)
4. Signer ready + connected + room → compose
5. Signer ready + signed out + room → auth
6. Signer not ready → wait
7. Non-room view → none
8. User already moved focus → do not apply open-focus
9. Bare `c` outside a field → handle
10. `c` while typing → ignore
11. `c` with Alt/Ctrl/Meta → ignore

## Out of scope for this cycle

- React mount tests / RTL
- `chrome.commands` integration tests
- Web `/u/` `c` or auto-focus
- Toolbar toggle
- Comment Reply/Mute tests (already buttons)
