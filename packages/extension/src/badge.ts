import type { BadgeState } from "@margin/core"

export async function paintTabBadge(tabId: number, state: BadgeState): Promise<void> {
  await browser.action.setBadgeText({ tabId, text: state.text })
  if (!state.text) return
  if (state.background) {
    await browser.action.setBadgeBackgroundColor({ tabId, color: state.background })
  }
  const setTextColor = browser.action.setBadgeTextColor
  if (typeof setTextColor === "function") {
    await setTextColor({ tabId, color: "#ffffff" })
  }
}
