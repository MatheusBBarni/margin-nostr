export function badgeLabel(count: number): string {
  if (count <= 0) return ""
  if (count > 99) return "99+"
  return String(count)
}

export async function setTabBadge(tabId: number, count: number): Promise<void> {
  const text = badgeLabel(count)
  await browser.action.setBadgeText({ tabId, text })
  if (!text) return
  await browser.action.setBadgeBackgroundColor({ tabId, color: "#1863dc" })
  const setTextColor = browser.action.setBadgeTextColor
  if (typeof setTextColor === "function") {
    await setTextColor({ tabId, color: "#ffffff" })
  }
}
