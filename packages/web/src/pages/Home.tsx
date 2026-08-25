import { Button, Input } from "@heroui/react"
import { NormalizeError, normalizeUrl } from "@margin/core"
import { applyTheme } from "@margin/ui"
import { FormEvent, useEffect, useState } from "react"
import { useNavigate } from "react-router"

export function Home() {
  const navigate = useNavigate()
  const [url, setUrl] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    applyTheme("dark")
    document.title = "Margin"
  }, [])

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
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 p-8">
      <div className="flex flex-col items-start gap-5">
        <img
          alt="Margin"
          className="h-36 w-auto rounded-md sm:h-44"
          height={278}
          src="/logo-full.png"
          width={221}
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-normal tracking-tight text-pretty">Comments on any URL.</h1>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Paste a link to open its room. Or install the extension and stay on the page.
          </p>
        </div>
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
    </main>
  )
}
