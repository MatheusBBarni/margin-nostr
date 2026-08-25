import { fetchFollows, hydrateFollows, persistFollows } from "./follows"
import type { Kv } from "./kv"
import { hydrateMutes } from "./mutes"
import type { QueryPool } from "./profiles"
import { fetchNip65, hydrateNip65, persistNip65, type Nip65Lists } from "./relays"

export type SocialSnapshot = {
  follows: string[]
  nip65: Nip65Lists | null
  mutes: string[]
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
