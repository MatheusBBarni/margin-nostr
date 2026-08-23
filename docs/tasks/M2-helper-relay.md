# M2 — Helper relay (launch blocker only)

**Status:** deferred — **do not start unless the S2/S8 probe finds zero curated relays that index `#I`**  
**PRD:** §10, §13  
**TECHSPEC:** §15

## Rule

v1 has no Margin-operated relay. Revisit only when `CURATED_RELAYS` would otherwise be empty after probe.

If that happens: stop shipping, do not invent a custom kind, and decide with the operator whether a helper relay is acceptable.

## Not this task

Workers, OG tags, outbox gossip, paid relays (wine, nostr.land) as a silent default.
