import { describe, expect, test } from "bun:test"
import { badgeDecision, tabHref } from "./badgeDecision"

describe("badgeDecision", () => {
  test("holds when the tab URL is missing so a later probe can paint", () => {
    expect(badgeDecision(undefined)).toEqual({ action: "hold" })
    expect(badgeDecision("")).toEqual({ action: "hold" })
  })

  test("clears skippable and unnormalizable URLs", () => {
    expect(badgeDecision("chrome://extensions")).toEqual({ action: "clear" })
    expect(badgeDecision("about:blank")).toEqual({ action: "clear" })
    expect(badgeDecision("ftp://example.com")).toEqual({ action: "clear" })
  })

  test("probes the normalized room URL", () => {
    expect(badgeDecision("http://www.example.com/foo/")).toEqual({
      action: "probe",
      room: "https://example.com/foo",
    })
  })
})

describe("tabHref", () => {
  test("prefers url and falls back to pendingUrl", () => {
    expect(tabHref({ url: "https://a.example/x" })).toBe("https://a.example/x")
    expect(tabHref({ pendingUrl: "https://b.example/y" })).toBe("https://b.example/y")
    expect(tabHref({})).toBeUndefined()
  })
})
