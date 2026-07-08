#!/usr/bin/env bash
# Composite a background video with a transparent overlay PNG (logo/badge/title/
# scrim from render-overlay-cli.js) into a single Instagram-ratio MP4.
#
#   render-video-card.sh <bg-video> <overlay-png> <out-mp4> [width] [height]
#
# - Background is scaled to cover the target box then center-cropped (no
#   letterboxing/stretch).
# - Background audio is kept as-is if present; silent sources produce a
#   video-only MP4 (no fake silent track injected).
# - h264/yuv420p + faststart so IG/Threads accept it without server-side
#   re-encoding surprises.
set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "Usage: render-video-card.sh <bg-video> <overlay-png> <out-mp4> [width=1080] [height=1350]" >&2
  exit 1
fi

BG="$1"; OVERLAY="$2"; OUT="$3"
WIDTH="${4:-1080}"
HEIGHT="${5:-1350}"

command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg not found (brew install ffmpeg)" >&2; exit 1; }
command -v ffprobe >/dev/null 2>&1 || { echo "ffprobe not found (ships with ffmpeg)" >&2; exit 1; }
[ -f "$BG" ] || { echo "background video not found: $BG" >&2; exit 1; }
[ -f "$OVERLAY" ] || { echo "overlay PNG not found: $OVERLAY" >&2; exit 1; }

HAS_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$BG" 2>/dev/null | head -1)

AUDIO_ARGS=()
if [ -n "$HAS_AUDIO" ]; then
  AUDIO_ARGS=(-map 0:a -c:a aac -b:a 128k)
fi

mkdir -p "$(dirname "$OUT")"

ffmpeg -y -i "$BG" -i "$OVERLAY" -filter_complex \
  "[0:v]scale=-2:${HEIGHT},crop=${WIDTH}:${HEIGHT},setsar=1[bg];[bg][1:v]overlay=0:0:format=auto[out]" \
  -map "[out]" "${AUDIO_ARGS[@]}" \
  -c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.0 \
  -r 30 -movflags +faststart -shortest "$OUT"

echo "wrote $OUT"
