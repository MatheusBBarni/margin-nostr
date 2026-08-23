# S8 — Options, Firefox, permalink origin, probe report

**Status:** deferred (after S7)  
**PRD:** F11 Firefox, options UX, M1  
**TECHSPEC:** §7.4, slice S8, §11 probe

## Behavior

1. Options page (extension):
   - Connect / disconnect bunker (`bunker://` paste)
   - `nostrconnect://` QR for Amber
   - Probe extension signers; show “nos2x connected” / Alby
   - Mute list editor
   - Theme, default filter
   - Extra relays (advanced) unioned with curated
   - Logout deletes `signer` including `clientSkHex`
2. Firefox: WXT `sidebar_action` instead of `side_panel`. Background: `sidebarAction.toggle()`. `gecko.id` placeholder until AMO.
3. `VITE_PUBLIC_ORIGIN` pointed at the real Pages (or preview) host so Copy thread is shareable.
4. `packages/core/src/relays.probe.md` filled; failures removed from `CURATED_RELAYS`. Empty curated after probe = stop and reopen helper relay (`M2-helper-relay.md`).

## Out of scope

Store upload, Safari, i18n, telemetry.

## Done when

Chromium + Firefox both run the M1 loop. Options can connect bunker and extension-message. Probe report is in-repo.
