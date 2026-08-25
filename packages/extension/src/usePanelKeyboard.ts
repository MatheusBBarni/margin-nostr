import type { AuthBarHandle, ComposeHandle } from "@margin/ui"
import { useEffect, useRef } from "react"
import {
  decideFocusTarget,
  isUserFocusMove,
  shouldHandleComposeShortcut,
  type FocusTarget,
} from "./panelKeyboard"
import { LAND_FOCUS_MESSAGE, PANEL_PORT } from "./panelProtocol"

type Session = {
  pubkey: string | null | undefined
  tabUrl: string | null | undefined
  roomFocusable: boolean
}

function targetIsEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true
  }
  return target.isContentEditable
}

function shortcutFrom(event: KeyboardEvent) {
  return {
    key: event.key,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    targetIsEditable: targetIsEditable(event.target),
  }
}

function focusTarget(session: Session): FocusTarget {
  return decideFocusTarget({
    signerReady: session.pubkey !== undefined && session.tabUrl !== undefined,
    hasSigner: typeof session.pubkey === "string",
    roomFocusable: session.roomFocusable,
  })
}

export function usePanelKeyboard(session: Session) {
  const composeRef = useRef<ComposeHandle>(null)
  const authBarRef = useRef<AuthBarHandle>(null)
  const userMovedRef = useRef(false)
  const openAttemptedRef = useRef(false)
  const sessionRef = useRef(session)
  sessionRef.current = session

  function land(target: FocusTarget) {
    if (target === "compose") composeRef.current?.focus()
    if (target === "auth") authBarRef.current?.focus()
  }

  function tryOpenFocus() {
    if (openAttemptedRef.current) return
    const target = focusTarget(sessionRef.current)
    if (target === "wait") return
    openAttemptedRef.current = true
    if (!userMovedRef.current) land(target)
  }

  function tryCommandFocus() {
    const target = focusTarget(sessionRef.current)
    if (target === "none" || target === "wait") return false
    land(target)
    return true
  }

  useEffect(() => {
    const onPointerDown = () => {
      userMovedRef.current = true
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcutFrom(event)
      if (shouldHandleComposeShortcut(shortcut)) {
        if (tryCommandFocus()) event.preventDefault()
        return
      }
      if (isUserFocusMove({ type: "keydown", ...shortcut })) {
        userMovedRef.current = true
      }
    }
    const port = browser.runtime.connect({ name: PANEL_PORT })
    const onMessage = (message: { type?: string }) => {
      if (message?.type === LAND_FOCUS_MESSAGE) tryCommandFocus()
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    port.onMessage.addListener(onMessage)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
      port.onMessage.removeListener(onMessage)
      port.disconnect()
    }
  }, [])

  useEffect(() => {
    tryOpenFocus()
  }, [session.pubkey, session.tabUrl, session.roomFocusable])

  return { composeRef, authBarRef }
}
