import { finalizeEvent, generateSecretKey } from "nostr-tools/pure"
import { SimplePool } from "nostr-tools"
import { writeFile } from "node:fs/promises"
import { buildTopLevel } from "../src/events"
import { CURATED_RELAYS } from "../src/relays"

const TIMEOUT_MS = 8_000

async function probeRelay(url: string): Promise<"ok" | "no-index" | "unreachable"> {
  const pool = new SimplePool()
  const sk = generateSecretKey()
  const room = `https://example.com/margin-probe/${crypto.randomUUID()}`
  const signed = finalizeEvent(buildTopLevel(room, "margin probe"), sk)

  try {
    await Promise.race([
      Promise.allSettled(pool.publish([url], signed)),
      new Promise((_, reject) => setTimeout(() => reject(new Error("publish timeout")), TIMEOUT_MS)),
    ])
  } catch {
    pool.close([url])
    return "unreachable"
  }

  const found = await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), TIMEOUT_MS)
    const sub = pool.subscribeMany(
      [url],
      [{ ids: [signed.id] }, { kinds: [1111], "#I": [room], limit: 5 }],
      {
        onevent(event) {
          if (event.id === signed.id) {
            clearTimeout(timer)
            sub.close()
            resolve(true)
          }
        },
      },
    )
  })

  pool.close([url])
  return found ? "ok" : "no-index"
}

const lines = ["# Curated relay `#I` probe", "", `Ran: ${new Date().toISOString()}`, ""]

for (const url of CURATED_RELAYS) {
  const result = await probeRelay(url)
  lines.push(`- \`${url}\`: **${result}**`)
  console.log(url, result)
}

lines.push("")
await writeFile(new URL("../src/relays.probe.md", import.meta.url), `${lines.join("\n")}\n`)
