import { renderSVG } from "uqr"

export function qrSvg(value: string): string {
  return renderSVG(value, { border: 2, pixelSize: 4 })
}
