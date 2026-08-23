# F22 — Keyboard: toggle panel, focus compose

**Status:** deferred (P2)  
**PRD:** F22

## Behavior

- A command (extension command / shortcut) toggles the side panel.
- When the panel opens, focus lands in compose if a signer is connected; otherwise on AuthBar.
- Thread is keyboard-reachable: reply / mute are not mouse-only.

## Constraints

No content script. No page-level key hijack. Use `commands` in the manifest if we add a shortcut.

## Done when

A Regular can open the panel and start typing without touching the mouse.
