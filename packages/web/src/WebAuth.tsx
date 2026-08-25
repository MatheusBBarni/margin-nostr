import {
  KV_KEYS,
  clearSessionSigner,
  createBunkerSigner,
  createNip07Signer,
  evictProfileCache,
  fetchProfiles,
  hydrateSelfProfile,
  parseStoredSigner,
  persistSelfProfile,
  readRelays,
  type Signer,
  type StoredSigner,
} from "@margin/core"
import type { Profile } from "@margin/ui"
import { SimplePool } from "nostr-tools"
import { bytesToHex, hexToBytes } from "nostr-tools/utils"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react"
import { localKv } from "./localKv"

type WebAuthValue = {
  pubkey: string | null
  profile: Profile | null
  signerRef: RefObject<Signer | null>
  error: string | null
  connectNip07: () => Promise<void>
  connectBunker: () => Promise<void>
  logout: () => Promise<void>
}

const WebAuthContext = createContext<WebAuthValue | null>(null)

export function useWebAuth(): WebAuthValue {
  const value = useContext(WebAuthContext)
  if (!value) throw new Error("useWebAuth requires WebAuthProvider")
  return value
}

export function WebAuthProvider({ children }: { children: ReactNode }) {
  const [pubkey, setPubkey] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const signerRef = useRef<Signer | null>(null)
  const poolRef = useRef<SimplePool | null>(null)

  const loadProfile = useCallback(async (hex: string, pool: SimplePool) => {
    const cached = await hydrateSelfProfile(localKv, hex)
    if (cached) setProfile(cached)
    const next = await fetchProfiles(pool, readRelays(), [hex])
    const resolved = next.get(hex)
    if (resolved) {
      setProfile(resolved)
      await persistSelfProfile(localKv, hex)
    }
  }, [])

  const activate = useCallback(
    async (signer: Signer, stored: StoredSigner, pool: SimplePool) => {
      const hex = await signer.getPublicKey()
      signerRef.current = signer
      setPubkey(hex)
      setError(null)
      await localKv.set<StoredSigner>(KV_KEYS.signer, { ...stored, pubkey: hex })
      await loadProfile(hex, pool)
    },
    [loadProfile],
  )

  useEffect(() => {
    const pool = new SimplePool()
    poolRef.current = pool
    let cancelled = false
    void (async () => {
      const stored = parseStoredSigner(await localKv.get(KV_KEYS.signer))
      if (cancelled) return
      if (stored?.pubkey) {
        setPubkey(stored.pubkey)
        const cached = await hydrateSelfProfile(localKv, stored.pubkey)
        if (!cancelled && cached) setProfile(cached)
      }
      try {
        if (stored?.method === "nip07" && window.nostr) {
          await activate(createNip07Signer(window.nostr), stored, pool)
          return
        }
        if (stored?.method === "bunker" && stored.bunkerPointer && stored.clientSkHex) {
          const { signer } = await createBunkerSigner({
            bunkerUri: stored.bunkerPointer,
            clientSk: hexToBytes(stored.clientSkHex),
            pool,
          })
          if (cancelled) {
            await signer.close?.()
            return
          }
          await activate(signer, stored, pool)
          return
        }
        if (!stored && window.nostr) {
          await activate(createNip07Signer(window.nostr), { method: "nip07" }, pool)
        }
      } catch {
        if (cancelled) return
        if (stored?.pubkey) {
          if (stored.method === "nip07" && window.nostr) {
            signerRef.current = createNip07Signer(window.nostr)
          }
          return
        }
        signerRef.current = null
        setPubkey(null)
        setProfile(null)
      }
    })()
    return () => {
      cancelled = true
      void signerRef.current?.close?.()
      signerRef.current = null
      pool.close(readRelays())
      poolRef.current = null
    }
  }, [activate])

  const connectNip07 = useCallback(async () => {
    if (!window.nostr) {
      setError("No NIP-07 signer on this page.")
      return
    }
    const pool = poolRef.current ?? new SimplePool()
    if (!poolRef.current) poolRef.current = pool
    try {
      await signerRef.current?.close?.()
      await activate(createNip07Signer(window.nostr), { method: "nip07" }, pool)
    } catch {
      setError("Could not connect the extension signer.")
    }
  }, [activate])

  const connectBunker = useCallback(async () => {
    const uri = window.prompt("Paste a bunker:// URI")
    if (!uri) return
    const pool = poolRef.current ?? new SimplePool()
    if (!poolRef.current) poolRef.current = pool
    try {
      await signerRef.current?.close?.()
      const { signer, clientSk } = await createBunkerSigner({ bunkerUri: uri, pool })
      await activate(
        signer,
        {
          method: "bunker",
          bunkerPointer: uri,
          clientSkHex: bytesToHex(clientSk),
        },
        pool,
      )
    } catch {
      setError("Could not connect that bunker.")
    }
  }, [activate])

  const logout = useCallback(async () => {
    await signerRef.current?.close?.()
    signerRef.current = null
    if (pubkey) evictProfileCache(pubkey)
    setPubkey(null)
    setProfile(null)
    setError(null)
    await clearSessionSigner(localKv)
  }, [pubkey])

  const value = useMemo(
    () => ({ pubkey, profile, signerRef, error, connectNip07, connectBunker, logout }),
    [connectBunker, connectNip07, error, logout, profile, pubkey],
  )

  return <WebAuthContext.Provider value={value}>{children}</WebAuthContext.Provider>
}
