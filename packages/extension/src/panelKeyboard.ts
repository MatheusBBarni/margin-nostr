export type PanelCommand = "open" | "close" | "focus"

export function decidePanelCommand(_input: {
  open: boolean
  canClose: boolean
}): PanelCommand {
  return "open"
}
