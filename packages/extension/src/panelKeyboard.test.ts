import { describe, expect, test } from "bun:test"
import { decideFocusTarget, decidePanelCommand } from "./panelKeyboard"

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

describe("decideFocusTarget", () => {
  test("focuses compose when the signer is ready, connected, and the room is focusable", () => {
    expect(
      decideFocusTarget({ signerReady: true, hasSigner: true, roomFocusable: true }),
    ).toBe("compose")
  })

  test("focuses auth when the signer is ready, signed out, and the room is focusable", () => {
    expect(
      decideFocusTarget({ signerReady: true, hasSigner: false, roomFocusable: true }),
    ).toBe("auth")
  })
})
