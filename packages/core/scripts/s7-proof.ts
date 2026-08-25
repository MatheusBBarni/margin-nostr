import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure"
import { SimplePool } from "nostr-tools"
import { $ } from "bun"
import {
  applyFilter,
  badgeHits,
  badgeSocial,
  badgeState,
  buildReply,
  buildTopLevel,
  defaultFilterMode,
  nest,
  normalizeUrl,
  parseComment,
  parseFollows,
  parseNip65,
  publishRoom,
  readRelays,
  subscribeRoom,
  type VerifiedComment,
} from "../src/index.ts"
import { CURATED_RELAYS } from "../src/relays.ts"

const WAIT_MS = 8_000
const relays = [...CURATED_RELAYS]
const runId = crypto.randomUUID()
const rooms = [
  normalizeUrl(`https://en.wikipedia.org/wiki/S7_proof_${runId}_a`),
  normalizeUrl(`https://github.com/nostr-protocol/nips/s7-proof/${runId}`),
  normalizeUrl(`https://developer.mozilla.org/en-US/docs/Web/S7_proof_${runId}`),
]

const selfSk = generateSecretKey()
const followSk = generateSecretKey()
const strangerSk = generateSecretKey()
const self = getPublicKey(selfSk)
const follow = getPublicKey(followSk)
const stranger = getPublicKey(strangerSk)

function fail(message: string): never {
  console.error(`FAIL ${message}`)
  process.exit(1)
}

function pass(message: string) {
  console.log(`ok  ${message}`)
}

async function collectRoom(pool: SimplePool, room: string): Promise<VerifiedComment[]> {
  const found: VerifiedComment[] = []
  const sub = subscribeRoom(pool, relays, room, {
    onevent(comment) {
      found.push(comment)
    },
  })
  await new Promise((resolve) => setTimeout(resolve, WAIT_MS))
  sub.close()
  return found
}

const pool = new SimplePool()
const now = Math.floor(Date.now() / 1000)

const contact = finalizeEvent(
  { kind: 3, created_at: now, content: "", tags: [["p", follow]] },
  selfSk,
)
const nip65 = finalizeEvent(
  {
    kind: 10002,
    created_at: now,
    content: "",
    tags: [["r", "wss://nos.lol"], ["r", "wss://inbox.s7-proof.example", "read"]],
  },
  selfSk,
)

const [articleFollows, articleDot, articleThread] = rooms
if (!articleFollows || !articleDot || !articleThread) fail("room normalize")

const selfNote = finalizeEvent(buildTopLevel(articleFollows, "self on article 1"), selfSk)
const followNote = finalizeEvent(buildTopLevel(articleFollows, "follow on article 1"), followSk)
const strangerNote = finalizeEvent(buildTopLevel(articleFollows, "stranger on article 1"), strangerSk)
const onlyStranger = finalizeEvent(buildTopLevel(articleDot, "only strangers here"), strangerSk)
const selfOnThree = finalizeEvent(buildTopLevel(articleThread, "self on article 3"), selfSk)
const strangerRoot = finalizeEvent(buildTopLevel(articleThread, "stranger root"), strangerSk)

const published = [
  contact,
  nip65,
  selfNote,
  followNote,
  strangerNote,
  onlyStranger,
  selfOnThree,
  strangerRoot,
]
for (const event of published) {
  const result = await publishRoom(pool, relays, event)
  if (result.ok.length === 0) fail(`publish ${event.kind} ${event.id.slice(0, 8)}: ${result.failed.join(",")}`)
  console.log(`pub ${event.kind} ${event.id.slice(0, 8)} → ${result.ok[0]}`)
}

const followReply = finalizeEvent(
  buildReply(articleThread, "follow under stranger", { id: strangerRoot.id, pubkey: stranger }),
  followSk,
)
const replyPub = await publishRoom(pool, relays, followReply)
if (replyPub.ok.length === 0) fail("publish follow reply")
console.log(`pub 1111 ${followReply.id.slice(0, 8)} reply → ${replyPub.ok[0]}`)

const follows = parseFollows(contact)
if (defaultFilterMode(follows) !== "follows") fail("default filter is Follows when kind:3 is non-empty")
pass("default filter is Follows")

const lists = parseNip65(nip65)
if (!readRelays(lists).includes("wss://inbox.s7-proof.example")) fail("NIP-65 merge missing user read relay")
pass("read relays merge curated ∪ NIP-65")

const room1 = await collectRoom(pool, articleFollows)
const room2 = await collectRoom(pool, articleDot)
const room3 = await collectRoom(pool, articleThread)
pool.close(relays)

for (const [label, room, ids] of [
  ["article 1", room1, [selfNote.id, followNote.id, strangerNote.id]],
  ["article 2", room2, [onlyStranger.id]],
  ["article 3", room3, [selfOnThree.id, strangerRoot.id, followReply.id]],
] as const) {
  for (const id of ids) {
    if (!room.some((comment) => comment.id === id)) fail(`${label} missing ${id.slice(0, 8)}`)
  }
  pass(`${label} fetched ${room.length} verified comments`)
}

const signer = { method: "nip07" as const }
const social = badgeSocial(signer, { pubkey: self, ids: follows, fetchedAt: Date.now() }, [])
const mutedSocial = badgeSocial(signer, { pubkey: self, ids: follows, fetchedAt: Date.now() }, [stranger])

function view(comments: VerifiedComment[], mode: "follows" | "everyone", muted: string[]) {
  return applyFilter(nest(comments).roots, {
    mode,
    follows: new Set(follows),
    muted: new Set(muted),
    self,
  })
}

const followsTab = view(room1, "follows", [])
const everyoneTab = view(room1, "everyone", [])
if (!followsTab.some((node) => node.comment.id === selfNote.id)) fail("Follows hid self")
if (!followsTab.some((node) => node.comment.id === followNote.id)) fail("Follows hid a follow")
if (followsTab.some((node) => node.comment.id === strangerNote.id)) fail("Follows showed a stranger root")
if (!everyoneTab.some((node) => node.comment.id === strangerNote.id)) fail("Everyone hid the stranger")
pass("article 1: Follows = self+follow, Everyone still has the stranger")

const threadFollows = view(room3, "follows", [])
const strangerBranch = threadFollows.find((node) => node.comment.id === strangerRoot.id)
if (!strangerBranch) fail("Follows dropped stranger root that has a follow reply")
if (!strangerBranch.children.some((node) => node.comment.id === followReply.id)) {
  fail("follow reply missing under stranger")
}
pass("article 3: Follows keeps stranger root because a descendant is a follow")

const mutedEveryone = view(room1, "everyone", [stranger])
const mutedFollows = view(room3, "follows", [stranger])
if (mutedEveryone.some((node) => node.comment.pubkey === stranger)) fail("mute left stranger in Everyone")
if (mutedFollows.some((node) => node.comment.id === strangerRoot.id)) fail("mute left stranger subtree in Follows")
if (!mutedFollows.some((node) => node.comment.id === selfOnThree.id)) fail("mute hid self")
pass("mute drops the stranger subtree; Everyone/Follows still show self")

const hits1 = badgeHits(room1, social)
const hits2 = badgeHits(room2, social)
const hits1Muted = badgeHits(room1, mutedSocial)
if (badgeState(hits1.followsHits, hits1.everyoneHits).text !== "2") {
  fail(`article 1 badge wanted 2, got ${JSON.stringify(badgeState(hits1.followsHits, hits1.everyoneHits))} hits=${JSON.stringify(hits1)}`)
}
if (badgeState(hits2.followsHits, hits2.everyoneHits).text !== "•") {
  fail(`article 2 badge wanted quiet-dot, got ${JSON.stringify(badgeState(hits2.followsHits, hits2.everyoneHits))}`)
}
if (hits1Muted.followsHits !== 2) fail("muted stranger should not change follow/self count")
pass("badge: 2 on article 1, quiet-dot on article 2, mute does not count strangers")

let nakHit: string | null = null
for (const relay of relays) {
  const nak = await $`nak req -k 1111 -i ${selfNote.id} -l 1 ${relay}`.nothrow().text()
  if (nak.includes(selfNote.id)) {
    nakHit = relay
    break
  }
}
if (!nakHit) fail(`nak did not see ${selfNote.id} on curated relays`)
pass(`nak saw our kind:1111 on ${nakHit}`)

console.log("")
console.log("S7 live proof passed")
console.log(`self     ${self}`)
console.log(`follow   ${follow}`)
console.log(`stranger ${stranger}`)
console.log(`rooms`)
for (const room of rooms) console.log(`  ${room}`)
