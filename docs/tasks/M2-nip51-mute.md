# M2 — NIP-51 mute list sync

**Status:** deferred (M2, not committed)  
**PRD:** F21  
**TECHSPEC:** explicit non-goal until M2

## Behavior

Publish and read the user’s NIP-51 mute list so other clients share mutes. Local mute (S7) remains the write-through cache.

No NIP-56 report UI in v1/M2 unless evidence says we need it.

## Done when

Muting in Margin hides the pubkey in another client that honors the same list, and vice versa, without an nsec in Margin.
