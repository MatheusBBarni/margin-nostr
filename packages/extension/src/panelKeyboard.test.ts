import { describe, expect, test } from "bun:test"
import {
  decideFocusTarget,
  decidePanelCommand,
  isUserFocusMove,
  shouldHandleComposeShortcut,
} from "./panelKeyboard"

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

  test("waits when the signer is not ready", () => {
    expect(
      decideFocusTarget({ signerReady: false, hasSigner: false, roomFocusable: true }),
    ).toBe("wait")
    expect(
      decideFocusTarget({ signerReady: false, hasSigner: true, roomFocusable: true }),
    ).toBe("wait")
  })

  test("focuses none when the signer is ready and the view is not a room", () => {
    expect(
      decideFocusTarget({ signerReady: true, hasSigner: true, roomFocusable: false }),
    ).toBe("none")
    expect(
      decideFocusTarget({ signerReady: true, hasSigner: false, roomFocusable: false }),
    ).toBe("none")
  })
})

describe("isUserFocusMove", () => {
  test("counts pointerdown and Tab or a typed character as movement", () => {
    expect(isUserFocusMove({ type: "pointerdown" })).toBe(true)
    expect(isUserFocusMove({ type: "keydown", key: "Tab" })).toBe(true)
    expect(isUserFocusMove({ type: "keydown", key: "a" })).toBe(true)
  })

  test("does not count bare c or modifier-only keys as movement", () => {
    expect(
      isUserFocusMove({
        type: "keydown",
        key: "c",
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        targetIsEditable: false,
      }),
    ).toBe(false)
    expect(isUserFocusMove({ type: "keydown", key: "Shift" })).toBe(false)
    expect(isUserFocusMove({ type: "keydown", key: "Alt" })).toBe(false)
  })
})

describe("shouldHandleComposeShortcut", () => {
  test("handles bare c outside a field", () => {
    expect(
      shouldHandleComposeShortcut({
        key: "c",
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        targetIsEditable: false,
      }),
    ).toBe(true)
  })

  test("ignores c while typing in a field", () => {
    expect(
      shouldHandleComposeShortcut({
        key: "c",
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        targetIsEditable: true,
      }),
    ).toBe(false)
  })

  test("ignores c when Alt, Ctrl, or Meta is held", () => {
    expect(
      shouldHandleComposeShortcut({
        key: "c",
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        targetIsEditable: false,
      }),
    ).toBe(false)
    expect(
      shouldHandleComposeShortcut({
        key: "c",
        altKey: false,
        ctrlKey: true,
        metaKey: false,
        targetIsEditable: false,
      }),
    ).toBe(false)
    expect(
      shouldHandleComposeShortcut({
        key: "c",
        altKey: false,
        ctrlKey: false,
        metaKey: true,
        targetIsEditable: false,
      }),
    ).toBe(false)
  })
})
