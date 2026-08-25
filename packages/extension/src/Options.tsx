import {
  CURATED_RELAYS,
  KV_KEYS,
  KNOWN_EXTENSION_SIGNER_IDS,
  addMute,
  clearSessionSigner,
  createBunkerSigner,
  createExtensionMessageSigner,
  evictProfileCache,
  extensionSignerLabel,
  hydrateExtraRelays,
  hydrateMutes,
  hydrateSelfProfile,
  parseExtraRelays,
  parsePubkeyInput,
  parseStoredSigner,
  persistExtraRelays,
  persistMutes,
  removeMute,
  type FilterPreference,
  type StoredSigner,
  type ThemePreference,
} from "@margin/core"
import { applyTheme as paintTheme } from "@margin/ui"
import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextField,
} from "@heroui/react"
import { BunkerSigner, createNostrConnectURI, toBunkerURL } from "nostr-tools/nip46"
import { SimplePool } from "nostr-tools"
import { generateSecretKey, getPublicKey } from "nostr-tools/pure"
import { bytesToHex } from "nostr-tools/utils"
import { useCallback, useEffect, useRef, useState } from "react"
import { chromeKv } from "./chromeKv"
import { qrSvg } from "./qr"

type FoundSigner = { extensionId: string; label: "nos2x" | "Alby" | "extension" }
type Account =
  | { status: "none" }
  | { status: "bunker"; pubkey?: string; name?: string }
  | { status: "extension"; pubkey: string; label: FoundSigner["label"]; name?: string }

function sendToExtension(id: string, message: { type: string; params: Record<string, unknown> }) {
  return browser.runtime.sendMessage(id, message)
}

function PrefRadio({ value, children }: { value: string; children: string }) {
  return (
    <Radio value={value}>
      <Radio.Content>
        <Radio.Control>
          <Radio.Indicator />
        </Radio.Control>
        {children}
      </Radio.Content>
    </Radio>
  )
}

function shortHex(hex: string): string {
  return `${hex.slice(0, 8)}…${hex.slice(-4)}`
}

export function Options() {
  const [account, setAccount] = useState<Account>({ status: "none" })
  const [found, setFound] = useState<FoundSigner[]>([])
  const [error, setError] = useState<string | null>(null)
  const [bunkerUri, setBunkerUri] = useState("")
  const [busy, setBusy] = useState(false)
  const [theme, setTheme] = useState<ThemePreference>("system")
  const [defaultFilter, setDefaultFilter] = useState<FilterPreference>("follows")
  const [mutes, setMutes] = useState<string[]>([])
  const [muteInput, setMuteInput] = useState("")
  const [muteError, setMuteError] = useState<string | null>(null)
  const [extras, setExtras] = useState<string[]>([])
  const [relayInput, setRelayInput] = useState("")
  const [relayError, setRelayError] = useState<string | null>(null)
  const [amber, setAmber] = useState<{ uri: string; svg: string } | null>(null)
  const amberAbort = useRef<AbortController | null>(null)

  const loadAccount = useCallback(async () => {
    const stored = parseStoredSigner(await chromeKv.get(KV_KEYS.signer))
    if (!stored) {
      setAccount({ status: "none" })
      return
    }
    try {
      if (stored.method === "extension-message" && stored.extensionId) {
        const signer = createExtensionMessageSigner(sendToExtension, stored.extensionId)
        const pubkey = await signer.getPublicKey()
        const profile = await hydrateSelfProfile(chromeKv, pubkey)
        setAccount({
          status: "extension",
          pubkey,
          label: extensionSignerLabel(stored.extensionId),
          name: profile?.display_name || profile?.name,
        })
        return
      }
      if (stored.method === "bunker") {
        setAccount({ status: "bunker" })
        return
      }
    } catch {
      setAccount({ status: "none" })
      return
    }
    setAccount({ status: "none" })
  }, [])

  const probeFound = useCallback(async () => {
    const next: FoundSigner[] = []
    for (const extensionId of KNOWN_EXTENSION_SIGNER_IDS) {
      try {
        const signer = createExtensionMessageSigner(sendToExtension, extensionId)
        await signer.getPublicKey()
        next.push({ extensionId, label: extensionSignerLabel(extensionId) })
      } catch {
        continue
      }
    }
    setFound(next)
  }, [])

  useEffect(() => {
    void (async () => {
      const storedTheme = (await chromeKv.get<ThemePreference>(KV_KEYS.theme)) ?? "system"
      setTheme(storedTheme)
      paintTheme(storedTheme)
      const storedFilter = await chromeKv.get<FilterPreference>(KV_KEYS.defaultFilter)
      setDefaultFilter(storedFilter === "everyone" ? "everyone" : "follows")
      setMutes(await hydrateMutes(chromeKv))
      setExtras(await hydrateExtraRelays(chromeKv))
      await loadAccount()
      await probeFound()
    })()
    return () => {
      amberAbort.current?.abort()
    }
  }, [loadAccount, probeFound])

  async function persistSigner(value: StoredSigner) {
    await chromeKv.set<StoredSigner>(KV_KEYS.signer, value)
    await loadAccount()
    await probeFound()
  }

  async function connectBunker() {
    const uri = bunkerUri.trim()
    if (!uri) {
      setError("Paste a bunker:// link first.")
      return
    }
    setBusy(true)
    setError(null)
    const pool = new SimplePool()
    try {
      const { signer, clientSk } = await createBunkerSigner({ bunkerUri: uri, pool })
      const hex = await signer.getPublicKey()
      await signer.close?.()
      await persistSigner({
        method: "bunker",
        bunkerPointer: uri,
        clientSkHex: bytesToHex(clientSk),
      })
      setBunkerUri("")
      setAmber(null)
      void hex
    } catch {
      setError("Could not connect that bunker.")
    } finally {
      pool.close([...CURATED_RELAYS])
      setBusy(false)
    }
  }

  async function connectExtension(extensionId: string) {
    setBusy(true)
    setError(null)
    try {
      const signer = createExtensionMessageSigner(sendToExtension, extensionId)
      await signer.getPublicKey()
      await persistSigner({ method: "extension-message", extensionId })
      setAmber(null)
    } catch {
      setError("That extension signer did not answer.")
    } finally {
      setBusy(false)
    }
  }

  async function startAmber() {
    amberAbort.current?.abort()
    const abort = new AbortController()
    amberAbort.current = abort
    setError(null)
    const clientSk = generateSecretKey()
    const secret = bytesToHex(crypto.getRandomValues(new Uint8Array(16)))
    const uri = createNostrConnectURI({
      clientPubkey: getPublicKey(clientSk),
      relays: [...CURATED_RELAYS],
      secret,
      name: "Margin",
      perms: ["sign_event:1111", "get_public_key"],
    })
    setAmber({ uri, svg: qrSvg(uri) })
    const pool = new SimplePool()
    try {
      const bunker = await BunkerSigner.fromURI(clientSk, uri, { pool }, abort.signal)
      if (abort.signal.aborted) {
        await bunker.close()
        return
      }
      await persistSigner({
        method: "bunker",
        bunkerPointer: toBunkerURL(bunker.bp),
        clientSkHex: bytesToHex(clientSk),
      })
      await bunker.close()
      setAmber(null)
    } catch {
      if (!abort.signal.aborted) setError("Amber did not connect. Scan again.")
    } finally {
      pool.close([...CURATED_RELAYS])
    }
  }

  async function logout() {
    amberAbort.current?.abort()
    setAmber(null)
    if (account.status !== "none" && account.pubkey) evictProfileCache(account.pubkey)
    await clearSessionSigner(chromeKv)
    setAccount({ status: "none" })
    setError(null)
  }

  async function saveTheme(next: ThemePreference) {
    setTheme(next)
    paintTheme(next)
    await chromeKv.set<ThemePreference>(KV_KEYS.theme, next)
  }

  async function saveFilter(next: string) {
    const value: FilterPreference = next === "everyone" ? "everyone" : "follows"
    setDefaultFilter(value)
    await chromeKv.set<FilterPreference>(KV_KEYS.defaultFilter, value)
  }

  async function addMuted() {
    const hex = parsePubkeyInput(muteInput)
    if (!hex) {
      setMuteError("Use a 64-character hex pubkey or an npub.")
      return
    }
    const next = addMute(mutes, hex)
    setMutes(next)
    setMuteInput("")
    setMuteError(null)
    await persistMutes(chromeKv, next)
  }

  async function unmute(hex: string) {
    const next = removeMute(mutes, hex)
    setMutes(next)
    await persistMutes(chromeKv, next)
  }

  async function addRelay() {
    const parsed = parseExtraRelays([relayInput])
    if (parsed.length === 0) {
      setRelayError("Use a wss:// relay URL.")
      return
    }
    const next = parseExtraRelays([...extras, ...parsed])
    setExtras(next)
    setRelayInput("")
    setRelayError(null)
    await persistExtraRelays(chromeKv, next)
  }

  async function removeRelay(url: string) {
    const next = extras.filter((item) => item !== url)
    setExtras(next)
    await persistExtraRelays(chromeKv, next)
  }

  const accountLabel =
    account.status === "none"
      ? "Not connected"
      : account.status === "extension"
        ? `${account.label} connected`
        : "Bunker connected"

  return (
    <main className="bg-background text-foreground mx-auto flex max-w-xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg">Margin options</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Signer, mute list, theme, and extra relays.</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm">Account</h2>
        <p className="text-sm">{accountLabel}</p>
        {account.status !== "none" && account.pubkey ? (
          <p className="text-xs text-[var(--muted-foreground)]">
            {account.name ?? shortHex(account.pubkey)}
          </p>
        ) : null}

        <TextField
          className="w-full"
          name="bunker"
          value={bunkerUri}
          onChange={setBunkerUri}
        >
          <Label>Bunker link</Label>
          <Input placeholder="bunker://…" />
          <Description>Paste a bunker:// URI from nsec.app or another remote signer.</Description>
        </TextField>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" isPending={busy} onPress={() => void connectBunker()}>
            Connect bunker
          </Button>
          <Button size="sm" variant="secondary" onPress={() => void startAmber()}>
            Show Amber QR
          </Button>
          {account.status !== "none" ? (
            <Button size="sm" variant="tertiary" onPress={() => void logout()}>
              Log out
            </Button>
          ) : null}
        </div>

        {amber ? (
          <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3">
            <p className="text-sm">Scan with Amber</p>
            <div
              aria-hidden
              className="size-48 bg-white p-2"
              dangerouslySetInnerHTML={{ __html: amber.svg }}
            />
            <TextField isReadOnly className="w-full" value={amber.uri}>
              <Label>nostrconnect URI</Label>
              <Input />
            </TextField>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => void navigator.clipboard.writeText(amber.uri)}
            >
              Copy URI
            </Button>
          </div>
        ) : null}

        {found.length === 0 && account.status !== "extension" ? (
          <p className="text-sm text-[var(--muted-foreground)]">No extension signer found.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {found.map((item) => {
              const active = account.status === "extension" && account.label === item.label
              return (
                <li key={item.extensionId} className="flex items-center justify-between gap-2">
                  <span className="text-sm">
                    {active ? `${item.label} connected` : `${item.label} available`}
                  </span>
                  {active ? null : (
                    <Button size="sm" variant="secondary" isPending={busy} onPress={() => void connectExtension(item.extensionId)}>
                      Connect {item.label}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <RadioGroup name="theme" value={theme} onChange={(value) => void saveTheme(value as ThemePreference)}>
          <Label>Theme</Label>
          <PrefRadio value="system">System</PrefRadio>
          <PrefRadio value="light">Light</PrefRadio>
          <PrefRadio value="dark">Dark</PrefRadio>
        </RadioGroup>
      </section>

      <section className="flex flex-col gap-3">
        <RadioGroup name="defaultFilter" value={defaultFilter} onChange={(value) => void saveFilter(value)}>
          <Label>Default filter</Label>
          <Description>Used when you have a follow list and have not picked a tab yet.</Description>
          <PrefRadio value="follows">Follows</PrefRadio>
          <PrefRadio value="everyone">Everyone</PrefRadio>
        </RadioGroup>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm">Muted pubkeys</h2>
        {mutes.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No muted pubkeys.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mutes.map((hex) => (
              <li key={hex} className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs">{shortHex(hex)}</span>
                <Button size="sm" variant="tertiary" onPress={() => void unmute(hex)}>
                  Unmute
                </Button>
              </li>
            ))}
          </ul>
        )}
        <TextField
          className="w-full"
          isInvalid={Boolean(muteError)}
          name="mute"
          value={muteInput}
          onChange={(value) => {
            setMuteInput(value)
            setMuteError(null)
          }}
        >
          <Label>Add mute</Label>
          <Input placeholder="hex or npub1…" />
          {muteError ? <FieldError>{muteError}</FieldError> : null}
        </TextField>
        <Button size="sm" variant="secondary" onPress={() => void addMuted()}>
          Mute
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm">Advanced</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Extra relays are added to the curated set for read and write.
        </p>
        {extras.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No extra relays.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {extras.map((url) => (
              <li key={url} className="flex items-center justify-between gap-2">
                <span className="break-all font-mono text-xs">{url}</span>
                <Button size="sm" variant="tertiary" onPress={() => void removeRelay(url)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        <TextField
          className="w-full"
          isInvalid={Boolean(relayError)}
          name="relay"
          value={relayInput}
          onChange={(value) => {
            setRelayInput(value)
            setRelayError(null)
          }}
        >
          <Label>Add relay</Label>
          <Input placeholder="wss://…" />
          {relayError ? <FieldError>{relayError}</FieldError> : null}
        </TextField>
        <Button size="sm" variant="secondary" onPress={() => void addRelay()}>
          Add relay
        </Button>
      </section>
    </main>
  )
}
