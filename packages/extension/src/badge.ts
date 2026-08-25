import type { BadgeState } from "@margin/core"

const SIZES = [16, 32] as const

function fillRoundRect(
  ctx: OffscreenCanvasRenderingContext2D,
  size: number,
  radius: number,
  color: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.quadraticCurveTo(size, 0, size, radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fill()
}

async function loadMark(size: number): Promise<ImageBitmap | null> {
  try {
    const url = browser.runtime.getURL(`/icon-${size}.png`)
    const blob = await (await fetch(url)).blob()
    return await createImageBitmap(blob)
  } catch {
    return null
  }
}

async function drawIcon(size: number, state: BadgeState): Promise<ImageData> {
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("no 2d context")

  if (!state.text) {
    const mark = await loadMark(size)
    if (mark) ctx.drawImage(mark, 0, 0, size, size)
    else {
      ctx.fillStyle = "#17171c"
      ctx.fillRect(0, 0, size, size)
    }
    return ctx.getImageData(0, 0, size, size)
  }

  fillRoundRect(ctx, size, Math.round(size * 0.22), state.background ?? "#1863dc")
  ctx.fillStyle = "#ffffff"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  const glyph = state.text === "•" ? "•" : state.text
  const fontSize = glyph === "•" ? size * 0.58 : glyph.length > 1 ? size * 0.5 : size * 0.64
  ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillText(glyph, size / 2, size / 2 + size * 0.04)
  return ctx.getImageData(0, 0, size, size)
}

async function paintNative(tabId: number, state: BadgeState): Promise<void> {
  await browser.action.setBadgeText({ tabId, text: state.text })
  if (!state.text) return
  if (state.background) {
    await browser.action.setBadgeBackgroundColor({ tabId, color: state.background })
  }
  const setTextColor = browser.action.setBadgeTextColor
  if (typeof setTextColor === "function") {
    await setTextColor({ tabId, color: "#ffffff" })
  }
}

export async function paintTabBadge(tabId: number, state: BadgeState): Promise<void> {
  const title =
    state.text === "•"
      ? "Margin: comments from people you do not follow"
      : state.text
        ? `Margin: ${state.text} comments from you or people you follow`
        : "Margin"
  await browser.action.setTitle({ tabId, title })

  if (typeof OffscreenCanvas !== "function") {
    await paintNative(tabId, state)
    return
  }

  await browser.action.setBadgeText({ tabId, text: "" })
  const imageData: Record<number, ImageData> = {}
  for (const size of SIZES) {
    imageData[size] = await drawIcon(size, state)
  }
  await browser.action.setIcon({ tabId, imageData })
}
