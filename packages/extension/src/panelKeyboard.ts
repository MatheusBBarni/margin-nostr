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
