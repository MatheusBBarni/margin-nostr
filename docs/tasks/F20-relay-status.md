# F20 — Relay status (connected / failed)

**Status:** deferred (P1)  
**PRD:** F20  
**TECHSPEC:** `Thread` / `RoomFooter` `relayHealth`

## Behavior

Footer shows each read/write relay as connected or failed. Not a science panel: no RTT graphs, no NIP-11 dump, no per-event relay provenance in v1.

M0 may already pass `relayHealth` through if the pool exposes it for free. This task is the readable treatment and empty/error copy.

## Out of scope

Relay picker as a primary control (extra relays stay on Options / S8). Outbox walk.

## Done when

A Regular can tell “Damus is up, oxtr failed” without leaving the room.
