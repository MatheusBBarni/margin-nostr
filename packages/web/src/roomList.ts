export function relativeTime(createdAt: number): string {
  const delta = Math.max(0, Math.floor(Date.now() / 1000) - createdAt)
  if (delta < 60) return "just now"
  if (delta < 3600) return `${Math.floor(delta / 60)}m`
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`
  return `${Math.floor(delta / 86400)}d`
}

export function roomHref(roomUrl: string): string {
  return `/u/${encodeURIComponent(roomUrl)}`
}

export function commentCountLabel(count: number): string {
  return count === 1 ? "1 comment" : `${count} comments`
}
