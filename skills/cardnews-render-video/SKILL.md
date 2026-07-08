---
name: cardnews-render-video
description: Optional add-on to cardnews-render - turn the thumbnail card into an MP4 by compositing a background video with the same logo/badge/title overlay used on the static PNG. Use when the user wants a video-background thumbnail instead of (or alongside) the static image, for a richer carousel opener.
---

# Card News — Video Thumbnail (optional, after Step 4)

Replace the *background* of a card with video while keeping the same overlay
(brand logo, category badge, title, gradient scrim) that the static theme
templates already draw. Output is a single MP4 sized for the carousel.

This is **not** "turn the PNG into a video" (no Ken Burns / zoom-the-image
tricks) — it's a genuine video background with the card's text elements
composited on top, transparent everywhere else.

## When to use
- User asks for a video thumbnail / video background card / "움직이는 썸네일".
- You have (or the user supplies) a background video clip. **This skill does
  not source video** — get the clip from the user, or from the same
  priority-1/2 sourcing cardnews-image already does for images, adapted to
  video search.

## Prerequisites
- `cardnews-render`'s build step done (`dist/render-overlay-cli.js` exists —
  built by the same `npm run build`).
- `ffmpeg` + `ffprobe` on PATH (`brew install ffmpeg` if missing).
- Theme has a `<card-type>-overlay.html` template. Today only
  **`thumbnail-overlay.html`** ships (bundled with the `surfers` theme) — same
  markup as `thumbnail.html` minus the `.bg-image` layer, transparent body, so
  it screenshots as a PNG with alpha instead of a flattened image.

## Procedure

```bash
ROOT="${CLAUDE_PLUGIN_ROOT}"
SPEC=/path/to/spec.json      # same spec.json cardnews-copy/cardnews-image produced
BG=/path/to/background.mp4   # source clip (any resolution/ratio; gets cover-cropped)
OUT_DIR=/path/to/piece-folder
CARD_INDEX=0                 # which card (must be type "thumbnail")

# 1. Render the transparent overlay PNG (logo/badge/title/scrim, no background)
node "$ROOT/dist/render-overlay-cli.js" "$SPEC" --card-index "$CARD_INDEX" --out /tmp/overlay.png

# 2. Composite it onto the background video → MP4 (cover-crop to 1080x1350, keeps
#    the source's audio track if it has one, h264/aac + faststart for IG/Threads)
"$ROOT/scripts/render-video-card.sh" "$BG" /tmp/overlay.png "$OUT_DIR/${CARD_INDEX}_thumbnail.mp4"
```

- `render-overlay-cli.js` reads the card's `title`/`category` straight from
  `spec.json` — re-run it whenever the copy changes (see cardnews-copy's
  "Editing copy after the piece is already rendered" checklist).
- `render-video-card.sh` accepts optional `[width] [height]` args (default
  `1080 1350`, Instagram 4:5) if a different ratio is ever needed.
- Keep the static `N_thumbnail.png` from cardnews-render too — it stays the
  fallback/wiki-embed image; the MP4 is an additional file, not a replacement.

## Sanity-check before handing off

Pull one frame and eyeball it — text placement/contrast can look different over
motion than over the original still image:
```bash
ffmpeg -y -ss 2 -i "$OUT_DIR/${CARD_INDEX}_thumbnail.mp4" -frames:v 1 /tmp/frame_check.png
```
Read `/tmp/frame_check.png` before calling the piece done.

## Output

`<out-dir>/<index>_thumbnail.mp4` alongside the existing PNGs. Hand to
**cardnews-wiki** (embed both `![[N_thumbnail.mp4]]` and the PNG in the note) and
**cardnews-autopublish** (see its "Media types: image + video" section for how
the carousel upload/publish step treats this file).
