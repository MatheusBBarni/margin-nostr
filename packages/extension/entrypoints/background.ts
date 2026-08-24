export default defineBackground(() => {
  browser.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(() => {})

  browser.action.onClicked.addListener((tab) => {
    if (tab.windowId == null) return
    const sidePanel = browser.sidePanel
    if (sidePanel) {
      void sidePanel.open({ windowId: tab.windowId })
      return
    }
    const sidebar = (browser as { sidebarAction?: { toggle: () => Promise<void> } }).sidebarAction
    void sidebar?.toggle()
  })

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "getActiveTab") return
    void browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      sendResponse({ url: tabs[0]?.url ?? null })
    })
    return true
  })
})
