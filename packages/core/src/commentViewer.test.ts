import { describe, expect, test } from "bun:test"
import { decode } from "nostr-tools/nip19"
import { commentViewerUrl } from "./commentViewer"

const id = "d7dd5eb3ab747e16f8d0212d53032ea2a7cadef53837e5a6c66d42849fcb9027"
const pubkey = "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"

describe("commentViewerUrl", () => {
  test("is njump plus a nevent for this comment", () => {
    const url = commentViewerUrl({ id, pubkey })
    expect(url.startsWith("https://njump.me/")).toBe(true)
    const encoded = url.slice("https://njump.me/".length)
    const decoded = decode(encoded)
    expect(decoded.type).toBe("nevent")
    if (decoded.type !== "nevent") return
    expect(decoded.data.id).toBe(id)
    expect(decoded.data.author).toBe(pubkey)
    expect(decoded.data.kind).toBe(1111)
  })

  test("encodes a nevent with no relays", () => {
    const url = commentViewerUrl({ id, pubkey })
    const decoded = decode(url.slice("https://njump.me/".length))
    expect(decoded.type).toBe("nevent")
    if (decoded.type !== "nevent") return
    expect(decoded.data.relays ?? []).toEqual([])
  })
})
