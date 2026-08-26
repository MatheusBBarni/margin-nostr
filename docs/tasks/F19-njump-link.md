# F19 — Link a comment to a generic viewer

**Status:** done  
**PRD:** F19  
**TECHSPEC:** §9 External event link

## Behavior

Each comment has a control that opens a generic viewer:

`https://njump.me/${nip19.neventEncode({ id, author, kind: 1111 })}`

Optional later: nostrudel and `nostr:` URI as a menu, not three competing buttons.

## Out of scope

In-app event permalink that is not the room URL. Custom kinds.

## Done when

A passerby can open a single comment outside Margin and see the same `kind:1111`.
