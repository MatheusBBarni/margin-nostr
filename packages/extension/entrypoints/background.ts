import { decidePanelCommand } from "../src/panelKeyboard"
import { probeActiveTab, startBadgeWatcher } from "../src/probeBadge"

const PANEL_PORT = "sidepanel"
const TOGGLE_COMMAND = "toggle-panel"

type SidebarAction = { toggle: () => Promise<void> }
type SidePanelApi = {
  open: (options: { windowId: number }) => Promise<void>
  close?: (options: { windowId: number }) => Promise<void>
}

function sidebarAction(): SidebarAction | undefined {
  return (browser as { sidebarAction?: SidebarAction }).sidebarAction
}

export default defineBackground(() => {
  void browser.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true })?.catch?.(() => {})
  startBadgeWatcher()

  const panelPorts = new Set<Browser.runtime.Port>()
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== PANEL_PORT) return
    panelPorts.add(port)
    port.onDisconnect.addListener(() => {
      panelPorts.delete(port)
    })
  })

  browser.action.onClicked.addListener((tab) => {
    if (tab.windowId == null) return
    const sidePanel = browser.sidePanel
    if (sidePanel) {
      void sidePanel.open({ windowId: tab.windowId })
      return
    }
    void sidebarAction()?.toggle()
  })

  browser.commands.onCommand.addListener((command) => {
    if (command !== TOGGLE_COMMAND) return
    void togglePanel(panelPorts)
  })

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "probeBadge") {
      probeActiveTab()
      return
    }
    if (message?.type !== "getActiveTab") return
    void browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      sendResponse({ url: tabs[0]?.url ?? null })
    })
    return true
  })
})

async function togglePanel(panelPorts: Set<Browser.runtime.Port>) {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  const windowId = tab?.windowId
  const sidePanel = browser.sidePanel as SidePanelApi | undefined
  if (!sidePanel) {
    await sidebarAction()?.toggle()
    return
  }
  if (windowId == null) return

  const action = decidePanelCommand({
    open: panelPorts.size > 0,
    canClose: typeof sidePanel.close === "function",
  })
  if (action === "open") {
    await sidePanel.open({ windowId })
    return
  }
  if (action === "close") {
    try {
      await sidePanel.close?.({ windowId })
    } catch {
      landPanelFocus(panelPorts)
    }
    return
  }
  landPanelFocus(panelPorts)
}

function landPanelFocus(panelPorts: Set<Browser.runtime.Port>) {
  for (const port of panelPorts) {
    port.postMessage({ type: "landFocus" })
  }
}
