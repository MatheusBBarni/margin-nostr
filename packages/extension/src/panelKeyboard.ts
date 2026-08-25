export type PanelCommand = "open" | "close" | "focus"

export type FocusTarget = "wait" | "compose" | "auth" | "none"

export function decidePanelCommand(input: {
  open: boolean
  canClose: boolean
}): PanelCommand {
  if (!input.open) {
    return "open"
  }
  if (input.canClose) {
    return "close"
  }
  return "focus"
}

export function decideFocusTarget(input: {
  signerReady: boolean
  hasSigner: boolean
  roomFocusable: boolean
}): FocusTarget {
  if (!input.signerReady) {
    return "wait"
  }
  if (!input.roomFocusable) {
    return "none"
  }
  if (!input.hasSigner) {
    return "auth"
  }
  return "compose"
}

export function shouldHandleComposeShortcut(input: {
  key: string
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  targetIsEditable: boolean
}): boolean {
  if (input.key.toLowerCase() !== "c") {
    return false
  }
  if (input.altKey || input.ctrlKey || input.metaKey) {
    return false
  }
  return !input.targetIsEditable
}

export function isUserFocusMove(input: {
  type: string
  key?: string
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  targetIsEditable?: boolean
}): boolean {
  if (input.type === "pointerdown") return true
  if (input.type !== "keydown") return false
  if (
    shouldHandleComposeShortcut({
      key: input.key ?? "",
      altKey: input.altKey === true,
      ctrlKey: input.ctrlKey === true,
      metaKey: input.metaKey === true,
      targetIsEditable: input.targetIsEditable === true,
    })
  ) {
    return false
  }
  return input.key === "Tab" || input.key?.length === 1
}
