import { countFollowsHits } from "./badge"
import { fetchFollows, hydrateFollows, parseFollowsCache, persistFollows } from "./follows"
import type { Kv, StoredSigner } from "./kv"
import { addMute, hydrateMutes, persistMutes, removeMute } from "./mutes"
import type { QueryPool } from "./profiles"
import { fetchNip65, hydrateNip65, persistNip65, type Nip65Lists } from "./relays"

export type SocialSnapshot = {
  follows: string[]
  nip65: Nip65Lists | null
  mutes: string[]
}

export type BadgeSocial =
  | { mode: "anonymous"; muted: Set<string> }
  | { mode: "follows"; follows: Set<string>; self: string; muted: Set<string> }

export function relayListKey(lists: Nip65Lists | null): string {
  if (!lists) return ""
  return `${lists.read.join("\0")}\n${lists.write.join("\0")}`
}

export function createCommentIngest() {
  const seen = new Set<string>()
  return {
    reset() {
      seen.clear()
    },
    accept(id: string) {
      if (seen.has(id)) return false
      seen.add(id)
      return true
    },
  }
}

export async function readSocial(kv: Kv, pubkey: string | null): Promise<SocialSnapshot> {
  const mutes = await hydrateMutes(kv)
  if (!pubkey) return { follows: [], nip65: null, mutes }
  const [follows, nip65] = await Promise.all([hydrateFollows(kv, pubkey), hydrateNip65(kv, pubkey)])
  return { follows: follows ?? [], nip65, mutes }
}

export async function refreshSocial(
  pool: QueryPool,
  relays: string[],
  kv: Kv,
  pubkey: string,
): Promise<{ follows: string[]; nip65: Nip65Lists | null }> {
  const followsTask = fetchFollows(pool, relays, pubkey)
    .then(async (ids) => {
      await persistFollows(kv, pubkey, ids)
      return ids
    })
    .catch(async () => (await hydrateFollows(kv, pubkey)) ?? [])

  const nip65Task = fetchNip65(pool, relays, pubkey)
    .then(async (lists) => {
      if (lists) {
        await persistNip65(kv, pubkey, lists)
        return lists
      }
      return hydrateNip65(kv, pubkey)
    })
    .catch(async () => hydrateNip65(kv, pubkey))

  const [follows, nip65] = await Promise.all([followsTask, nip65Task])
  return { follows, nip65 }
}

export async function mutePubkey(kv: Kv, mutes: string[], pubkey: string): Promise<string[]> {
  const next = addMute(mutes, pubkey)
  await persistMutes(kv, next)
  return next
}

export async function unmutePubkey(kv: Kv, mutes: string[], pubkey: string): Promise<string[]> {
  const next = removeMute(mutes, pubkey)
  await persistMutes(kv, next)
  return next
}

export function badgeSocial(signer: StoredSigner | undefined, cache: unknown, mutes: string[]): BadgeSocial {
  const muted = new Set(mutes)
  if (!signer) return { mode: "anonymous", muted }
  const parsed = parseFollowsCache(cache)
  if (!parsed) return { mode: "anonymous", muted }
  return { mode: "follows", follows: new Set(parsed.ids), self: parsed.pubkey, muted }
}

export function badgeHits(
  comments: { pubkey: string }[],
  social: BadgeSocial,
): { followsHits: number; everyoneHits: number } {
  const everyoneHits = comments.length
  if (social.mode === "anonymous") return { followsHits: 0, everyoneHits }
  return {
    followsHits: countFollowsHits(comments, {
      follows: social.follows,
      self: social.self,
      muted: social.muted,
    }),
    everyoneHits,
  }
}
