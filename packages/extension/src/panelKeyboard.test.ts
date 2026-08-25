import { describe, expect, test } from "bun:test"
import { decidePanelCommand } from "./panelKeyboard"

describe("decidePanelCommand", () => {
  test("opens the panel when the command fires and the panel is closed", () => {
    expect(decidePanelCommand({ open: false, canClose: true })).toBe("open")
    expect(decidePanelCommand({ open: false, canClose: false })).toBe("open")
  })

  test("closes the panel when the command fires, the panel is open, and close is available", () => {
    expect(decidePanelCommand({ open: true, canClose: true })).toBe("close")
  })

  test("focuses the open panel when the command fires and close is unavailable", () => {
    expect(decidePanelCommand({ open: true, canClose: false })).toBe("focus")
  })
})
