import { Button, Input } from "@heroui/react"
import { NormalizeError, normalizeUrl } from "@margin/core"
import { FormEvent, useState } from "react"
import { useNavigate } from "react-router"

export function Home() {
  const navigate = useNavigate()
  const [url, setUrl] = useState("")
  const [error, setError] = useState<string | null>(null)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      const normalized = normalizeUrl(url)
      navigate(`/u/${encodeURIComponent(normalized)}`)
    } catch (cause) {
      setError(cause instanceof NormalizeError ? "Enter an http(s) URL." : "Could not open that URL.")
    }
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-wide text-[var(--muted-foreground)]">MARGIN</p>
        <h1 className="text-3xl font-normal tracking-tight">Comments on any URL.</h1>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          A URL is a room. Comments are signed Nostr notes. Install the extension to comment from the page,
          or paste a link here.
        </p>
      </div>
      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <Input
          aria-label="Page URL"
          placeholder="https://example.com/essay"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        {error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        <Button type="submit">Open thread</Button>
      </form>
      <p className="text-sm text-[var(--muted-foreground)]">
        Extension: load the unpacked Chromium build from the Margin repo. No nsec. No overlay on the page.
      </p>
    </main>
  )
}
