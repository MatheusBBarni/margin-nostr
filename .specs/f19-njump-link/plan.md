# Requirements Document — F19 njump link

Approved requirements for the TDD pipeline. Task: `docs/tasks/F19-njump-link.md`. PRD: F19. TECHSPEC: §9 External event link.

## Feature objective

A passerby can open one Margin comment in a generic Nostr viewer and see the same `kind:1111`.

## Expected behavior

1. Every comment in the shared thread (`Comment` on the side panel and `/u/`) has a tertiary **Open** control in the Reply/Mute row.
2. The control is a real link (not copy, not `window.open`) to
   `https://njump.me/${nip19.neventEncode({ id, author, kind: 1111 })}`
   where `id` is the event id and `author` is the comment pubkey.
3. Click opens a new tab (`target="_blank"`, `rel="noopener"`). Works in the side panel without `browser` APIs.
4. Visible label: **Open**. Accessible name: **Open on njump**. Small external-link icon, same size as Reply/Mute.
5. Same control on own comments and nested replies. Mute can stay hidden on self; Open does not.

## Identified edge cases

- Side panel must not navigate away; hence new tab + real `href`.
- Encoding uses verified comment fields only (`id`, `pubkey`, `kind` already `1111`). No relays on the nevent.
- `/me` is not this cycle.

## Stack / technologies

Existing Margin stack. Pure encode in `@margin/core` (`nostr-tools` nip19). Presentational link in `@margin/ui` `Comment`. No new UI kit. `bun:test` in core.

## UI/UX references

No Figma. Match existing tertiary Reply/Mute in `Comment.tsx`. F18 remains **Copy thread** on the room footer.

## Constraints / dependencies

- No nsec. No content scripts. No `browser` / `window.nostr` in `@margin/ui`.
- Write NIP-22 exactly; this feature only *links* existing `kind:1111`.
- `normalizeUrl` is unrelated; do not touch `I`/`i`.
- Always `verifyEvent` inbound is already done before a comment reaches the UI.

## Out of scope

- nostrudel / `nostr:` URI menu
- In-app event permalink that is not the room URL
- Custom kinds
- Relays on the nevent
- `/me` njump controls
- Copying the njump URL

## Grill decisions

1. Control = Open link next to Reply/Mute, real `<a href>`.
2. Visible label **Open**.
3. Thread only (panel + `/u/`), not `/me`.
