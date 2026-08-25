#!/usr/bin/env bash
# Rasterize Margin marks from the source JPEGs.
#
# Rules:
#   - Opaque white background. Never punch white to alpha.
#   - Do not open icon-16.png / favicon-16.png in a vision model.
#     16x16 = 256 pixels; OpenAI rejects anything under 512.
#   - Inspect with `identify` / pixel stats, or a 512px preview.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
minimal="$root/assets/margin_minimal_logo.jpg"
full="$root/assets/margin_full_logo.jpg"
ext_public="$root/packages/extension/public"
web_public="$root/packages/web/public"

if ! command -v magick >/dev/null; then
  echo "ImageMagick (magick) is required" >&2
  exit 1
fi

if [[ ! -f "$minimal" || ! -f "$full" ]]; then
  echo "Missing source JPEGs in assets/" >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Trim the portrait canvas, pad, then force a white square master.
square_master() {
  local src="$1" dest="$2" pad="${3:-14}"
  magick "$src" \
    -colorspace sRGB \
    -fuzz 6% -trim +repage \
    -bordercolor white -border "${pad}%" \
    -background white -gravity center \
    -extent '%[fx:max(w,h)]x%[fx:max(w,h)]' \
    -alpha off \
    "$dest"
}

square_master "$minimal" "$tmp/minimal.png" 14
square_master "$full" "$tmp/full.png" 10

export_png24() {
  local src="$1" size="$2" dest="$3"
  magick "$src" \
    -filter Lanczos \
    -resize "${size}x${size}" \
    -unsharp 0x0.6+0.8+0.02 \
    -background white -alpha remove -alpha off \
    "PNG24:${dest}"
}

mkdir -p "$ext_public" "$web_public"

for size in 16 32 48 96 128; do
  export_png24 "$tmp/minimal.png" "$size" "$ext_public/icon-${size}.png"
done

cp "$ext_public/icon-16.png" "$web_public/favicon-16.png"
cp "$ext_public/icon-32.png" "$web_public/favicon.png"
export_png24 "$tmp/minimal.png" 128 "$web_public/logo-mark.png"
export_png24 "$tmp/minimal.png" 180 "$web_public/apple-touch-icon.png"

magick "$full" \
  -colorspace sRGB \
  -fuzz 6% -trim +repage \
  -bordercolor white -border 8% \
  -background white -alpha remove -alpha off \
  "PNG24:${web_public}/logo-full.png"

echo "wrote:"
identify "$ext_public"/icon-*.png "$web_public"/favicon*.png "$web_public"/logo-mark.png "$web_public"/apple-touch-icon.png "$web_public"/logo-full.png
