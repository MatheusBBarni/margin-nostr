import { describe, expect, test } from "bun:test"
import { decidePanelCommand } from "./panelKeyboard"

describe("decidePanelCommand", () => {
  test("opens the panel when the command fires and the panel is closed", () => {
    expect(decidePanelCommand({ open: false, canClose: true })).toBe("open")
    expect(decidePanelCommand({ open: false, canClose: false })).toBe("open")
  })
})
