---
name: cardnews-render
description: Use after copy and images are ready to render the spec into 1080x1350 PNG cards locally via the bundled Playwright renderer. Step 4 of the card-news pipeline.
---

# Card News — Render (Step 4)

Render `spec.json` into Instagram 4:5 (1080×1350) PNG cards using the plugin's
bundled renderer.

## Inputs
- **spec.json** path (with `image_url` filled by cardnews-image)
- **out dir** (optional): where PNGs land; default `./card-news-out`

## Prerequisite (once)

The renderer needs the built JS and a Chromium for Playwright. From the plugin
root (`${CLAUDE_PLUGIN_ROOT}`):

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && npm install && npm run build && npx playwright install chromium
```

If `dist/render-cli.js` already exists and Chromium is installed, skip this.

## Render

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/render-cli.js" <path/to/spec.json> --out <out-dir>
```

- Prints a JSON result to stdout: `{ id, theme, rendered_cards: [{ index, type, path, base64 }] }`.
- One PNG per card at 1080×1350.
- Theme is taken from `spec.theme` (name or path); default is `default`.

## Storage backends (optional)

Set `STORAGE_BACKEND` before running to control where PNGs go:
- `local` (default) — writes PNG files to the out dir.
- `s3` / `supabase` — uploads and returns **public URLs** (needed for IG/Threads publish).
  Requires the matching env vars (see repo README).

## Output

PNG paths (or public URLs). Hand to **cardnews-notion**.
