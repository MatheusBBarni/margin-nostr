import { describe, expect, test } from "bun:test"
import { COMMENT_ON_PAGE_ID, commentOnPageMenu, decideContextMenuClick } from "./contextMenu"

describe("decideContextMenuClick", () => {
  test("opens the panel for our item on an https tab", () => {
    expect(
      decideContextMenuClick({
        menuItemId: COMMENT_ON_PAGE_ID,
        tab: { id: 42, url: "https://example.com/x" },
      }),
    ).toEqual({ action: "open", tabId: 42 })
  })

  test("ignores skippable and non-http(s) tabs", () => {
    for (const url of [
      "chrome://extensions",
      "about:blank",
      "chrome-extension://abc/page.html",
      "moz-extension://abc/page.html",
      "file:///tmp/x.html",
      "ftp://example.com/x",
    ]) {
      expect(
        decideContextMenuClick({
          menuItemId: COMMENT_ON_PAGE_ID,
          tab: { id: 42, url },
        }),
      ).toEqual({ action: "ignore" })
    }
  })

  test("ignores a click with no tab id", () => {
    expect(
      decideContextMenuClick({
        menuItemId: COMMENT_ON_PAGE_ID,
        tab: { url: "https://example.com/x" },
      }),
    ).toEqual({ action: "ignore" })
    expect(
      decideContextMenuClick({
        menuItemId: COMMENT_ON_PAGE_ID,
      }),
    ).toEqual({ action: "ignore" })
  })

  test("ignores a different menu item", () => {
    expect(
      decideContextMenuClick({
        menuItemId: "other",
        tab: { id: 42, url: "https://example.com/x" },
      }),
    ).toEqual({ action: "ignore" })
  })
})

describe("commentOnPageMenu", () => {
  test("is Comment on this page for http(s) page clicks", () => {
    expect(commentOnPageMenu()).toEqual({
      id: COMMENT_ON_PAGE_ID,
      title: "Comment on this page",
      contexts: ["page", "frame", "selection", "link", "editable", "image", "video", "audio"],
      documentUrlPatterns: ["http://*/*", "https://*/*"],
    })
  })
})
