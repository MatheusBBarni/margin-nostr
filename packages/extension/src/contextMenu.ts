export const COMMENT_ON_PAGE_ID = "comment-on-this-page"

export function commentOnPageMenu() {
  return {
    id: COMMENT_ON_PAGE_ID,
    title: "Comment on this page",
    contexts: ["page", "frame", "selection", "link", "editable", "image", "video", "audio"],
    documentUrlPatterns: ["http://*/*", "https://*/*"],
  }
}

export type ContextMenuClickDecision =
  | { action: "open"; tabId: number }
  | { action: "ignore" }

export function decideContextMenuClick(input: {
  menuItemId: string | number
  tab?: { id?: number; url?: string }
}): ContextMenuClickDecision {
  if (String(input.menuItemId) !== COMMENT_ON_PAGE_ID) return { action: "ignore" }
  const tabId = input.tab?.id
  const url = input.tab?.url
  if (typeof tabId !== "number" || !url?.startsWith("https://")) return { action: "ignore" }
  return { action: "open", tabId }
}
