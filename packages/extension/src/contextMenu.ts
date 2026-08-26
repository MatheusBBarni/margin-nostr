export const COMMENT_ON_PAGE_ID = "comment-on-this-page"

export type ContextMenuClickDecision =
  | { action: "open"; tabId: number }
  | { action: "ignore" }

export function decideContextMenuClick(input: {
  menuItemId: string | number
  tab?: { id?: number; url?: string }
}): ContextMenuClickDecision {
  return { action: "open", tabId: input.tab!.id! }
}
