import type { ReactNode } from "react"

const TOKEN =
  /(https?:\/\/[^\s<]+|nostr:[a-z0-9]+|npub1[ac-hj-np-z02-9]+|note1[ac-hj-np-z02-9]+|nevent1[ac-hj-np-z02-9]+)/gi

function hrefFor(token: string): string {
  if (token.startsWith("http://") || token.startsWith("https://")) return token
  if (token.startsWith("nostr:")) return token
  return `nostr:${token}`
}

export function renderText(content: string): ReactNode {
  const parts = content.split(TOKEN)
  return parts.map((part, index) => {
    if (!part) return null
    if (part.match(TOKEN)) {
      return (
        <a
          key={`${part}-${index}`}
          href={hrefFor(part)}
          rel="noopener noreferrer"
          target="_blank"
          className="text-[var(--action)] underline-offset-2 hover:underline"
        >
          {part}
        </a>
      )
    }
    return <span key={`${part}-${index}`}>{part}</span>
  })
}
