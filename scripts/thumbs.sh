#!/bin/sh
# Usage: scripts/thumbs.sh <folder of photos named <item-id>.jpg|png|webp>
# Writes 400x300 WebP thumbnails to photos/<item-id>.webp
set -eu
src="${1:?photo folder required}"
out="$(dirname "$0")/../photos"
mkdir -p "$out"
for f in "$src"/*; do
  case "$f" in *.jpg|*.jpeg|*.png|*.webp|*.JPG|*.JPEG|*.PNG) ;; *) continue ;; esac
  id="$(basename "${f%.*}")"
  w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')
  cw=$w; ch=$((w * 3 / 4))
  if [ "$ch" -gt "$h" ]; then ch=$h; cw=$((h * 4 / 3)); fi
  cwebp -quiet -q 60 -crop $(((w - cw) / 2)) $(((h - ch) / 2)) "$cw" "$ch" -resize 400 300 "$f" -o "$out/$id.webp"
  echo "$id.webp"
done
