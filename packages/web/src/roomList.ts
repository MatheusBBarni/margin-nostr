export function roomHref(roomUrl: string): string {
  return `/u/${encodeURIComponent(roomUrl)}`
}

export function commentCountLabel(count: number): string {
  return count === 1 ? "1 comment" : `${count} comments`
}
