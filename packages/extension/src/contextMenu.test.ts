import { describe, expect, test } from "bun:test"
import { COMMENT_ON_PAGE_ID, decideContextMenuClick } from "./contextMenu"

describe("decideContextMenuClick", () => {
  test("opens the panel for our item on an https tab", () => {
    expect(
      decideContextMenuClick({
        menuItemId: COMMENT_ON_PAGE_ID,
        tab: { id: 42, url: "https://example.com/x" },
      }),
    ).toEqual({ action: "open", tabId: 42 })
  })
})
