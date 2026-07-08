---
name: cardnews-render
description: Use after copy and images are ready to render the spec into 1080x1350 PNG cards locally via the bundled Playwright renderer. Step 4 of the card-news pipeline.
---

# Card News — Render (Step 4)

Render `spec.json` into Instagram 4:5 (1080×1350) PNG cards using the plugin's
bundled renderer.

## Inputs
- **spec.json** path (with `image_url` filled by cardnews-image)
- **out dir** (optional): where PNGs land. **Default for the SURFERS pipeline:**
  render straight into the llm-wiki piece folder so nothing lands in a stray dir:
  `~/Develop/llm-wiki/01-콘텐츠마케팅/카드뉴스/<id>/`
  (`<id>` = `spec.id`). cardnews-wiki then adds the note + commits/pushes.

> **Always pass `--flat`** (see below) when rendering straight into the piece
> folder. Without it the renderer nests output one level deeper
> (`<out>/<id>/*.png`), and you'd have to `mv "<out>/<id>"/*.png "<out>/" &&
> rmdir "<out>/<id>"` by hand afterward — `--flat` writes directly into `<out>/`.

## Prerequisite (once)

The renderer needs the built JS and a Chromium for Playwright. From the plugin
root (`${CLAUDE_PLUGIN_ROOT}`):

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && npm install && npm run build && npx playwright install chromium
```

If `dist/render-cli.js` already exists and Chromium is installed, skip this.

## Render

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/render-cli.js" <path/to/spec.json> --out <out-dir> --flat
```

- Prints a JSON result to stdout: `{ id, theme, rendered_cards: [{ index, type, path, base64 }] }`.
- One PNG per card at 1080×1350.
- Theme is taken from `spec.theme`; the SURFERS pipeline uses **`surfers`**.
- `--flat` writes `<out>/0_thumbnail.png … N_closing.png` directly (no `<id>/`
  nesting). Omit it only if you deliberately want the nested layout (e.g.
  rendering multiple pieces into one shared parent directory).

## Optional: video thumbnail

Want the thumbnail card as a looping/backgrounded MP4 instead of a static image
(background video + the same logo/badge/title overlay)? That's a separate step —
see **cardnews-render-video**. Run it after this step; it doesn't replace the
static `0_thumbnail.png` (keep both — the PNG stays the wiki/fallback image, the
MP4 is the richer version for the carousel).

## Storage backends (optional)

Set `STORAGE_BACKEND` before running to control where PNGs go:
- `local` (default) — writes PNG files to the out dir.
- `s3` / `supabase` — uploads and returns **public URLs** (needed for IG/Threads publish).
  Requires the matching env vars (see repo README).

## Output

PNG paths (rendered into the llm-wiki piece folder). Hand to **cardnews-wiki**.
