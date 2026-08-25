export type PanelCommand = "open" | "close" | "focus"

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
