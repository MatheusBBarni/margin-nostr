export function isSkippableUrl(url: string): boolean {
  return (
    url.startsWith("chrome:") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension:") ||
    url.startsWith("moz-extension:") ||
    url.startsWith("edge:") ||
    url.startsWith("devtools:")
  )
}
