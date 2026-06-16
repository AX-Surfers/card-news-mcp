# card-news-mcp

> 🇰🇷 한국어 문서는 [README.ko.md](./README.ko.md) 를 보세요.

An **MCP (Model Context Protocol) server** that turns text + background images into
beautiful **Instagram-style square card news** (720×720 PNG) — thumbnail, body pages,
and a closing call-to-action card — all themeable and ready to post.

Give your AI agent (Claude Desktop, Cursor, or any MCP client) the ability to design
carousel card news automatically.

<!-- Example output: 4-card carousel (thumbnail → body → body → closing) -->

## What it does

You hand the tool a list of cards (title, body text, a background image URL), and it:

1. Fills a chosen **theme** (colors, fonts, logo) into HTML templates.
2. Renders each card to a crisp **720×720 PNG** with a headless browser (Playwright).
3. Returns the images as a **local file path**, a **remote URL**, or **base64** —
   depending on the storage backend you pick.

No design skills needed. The AI writes the copy, you get post-ready images.

## Card types

| Type | What's on it |
|------|--------------|
| `thumbnail` | Full-bleed background image, brand logo, category badge, big title |
| `body` | Background image, page number badge, heading, body text, brand mark |
| `closing` | Brand wordmark, tagline, call-to-action, save/like/follow icons |

## Quick start

### 1. Add it to your MCP client

**Claude Desktop** — edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "card-news": {
      "command": "npx",
      "args": ["-y", "card-news-mcp"],
      "env": {
        "THEME": "default",
        "STORAGE_BACKEND": "local",
        "OUTPUT_DIR": "./card-news-out"
      }
    }
  }
}
```

Restart the client. That's it — the `render_card_news` tool is now available.

> First run downloads a Chromium browser (~170 MB) used for rendering. This is a
> one-time download. See [Troubleshooting](#troubleshooting) to reuse a system browser.

### 2. Ask your agent

> "Make a 4-card Instagram carousel about the new GPT prompt guide, using these
> background images: …"

The agent calls `render_card_news` and you get PNG files in `./card-news-out`.

## The `render_card_news` tool

Input shape:

```jsonc
{
  "id": "my-post",          // optional, used for output folder name
  "theme": "default",       // optional, theme name or path (overrides THEME env)
  "cards": [
    { "type": "thumbnail", "index": 0, "title": "…", "category": "NEWS", "image_url": "https://…" },
    { "type": "body", "index": 1, "page_number": 1, "title": "…", "body": "…", "image_url": "https://…" },
    { "type": "closing", "index": 2, "image_url": "https://…" }
  ],
  "brand": {                // optional, overrides theme defaults per-call
    "brand_name": "ACME",
    "tagline": "Follow for more",
    "cta": "Follow us <b>now</b>",
    "primary_color": "#0573F0"
  }
}
```

Output:

```jsonc
{
  "id": "my-post",
  "theme": "default",
  "rendered_cards": [
    { "index": 0, "type": "thumbnail", "path": "/abs/path/0_thumbnail.png", "base64": "data:image/png;base64,…" }
  ]
}
```

## Themes

Two themes ship in the box:

- **`default`** — clean, achromatic (grayscale). A neutral starting point.
- **`surfers`** — example branded theme (blue + light-blue accents).

Pick one with the `THEME` env var, or per-call with the `theme` field.

Want your own colors, fonts, and logo? See **[DESIGN.md](./DESIGN.md)** — it walks you
through making a custom theme in a few minutes (no code, just a `theme.json` and three
HTML files).

```json
{ "env": { "THEME_DIR": "/path/to/my-theme" } }
```

## Storage backends

Choose with `STORAGE_BACKEND`:

| Value | Behavior | Extra setup |
|-------|----------|-------------|
| `local` (default) | Saves PNGs to `OUTPUT_DIR`, also returns base64 | none |
| `base64` | Returns base64 data URIs only (no files) | none |
| `supabase` | Uploads to Supabase Storage, returns public URL | `npm i @supabase/supabase-js`, set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `s3` | Uploads to S3 / Cloudflare R2 | `npm i @aws-sdk/client-s3`, set `S3_*` vars |

## Configuration (env vars)

| Variable | Default | Purpose |
|----------|---------|---------|
| `THEME` | `default` | Bundled theme name |
| `THEME_DIR` | — | Path to an external custom theme |
| `STORAGE_BACKEND` | `local` | `base64` / `local` / `supabase` / `s3` |
| `OUTPUT_DIR` | `./card-news-out` | Where `local` saves files |
| `MCP_TRANSPORT` | `stdio` | `stdio` (default) or `http` |
| `PORT` | `3000` | HTTP transport port |

## Running as an HTTP server (optional)

Most users want stdio (the default). For remote/self-hosted use:

```bash
MCP_TRANSPORT=http npx card-news-mcp
# → http://localhost:3000/mcp
```

## Troubleshooting

- **Chromium download is large / blocked.** Set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`
  during install and point Playwright at an existing Chrome/Chromium.
- **Korean / CJK text looks wrong.** Themes load the Pretendard web font; ensure the
  rendering machine has internet access on first render, or bundle a local font in your theme.

## Using with a Hermes agent

If you drive this through a Hermes agent (or any agent that manages its own MCP
config), copy-paste the prompts below.

### 1. Install / register the MCP

> Register a new MCP server named `card-news`.
> - Transport: **stdio** — command `npx`, args `["-y", "card-news-mcp"]`.
>   (If you self-host over the network instead, run `MCP_TRANSPORT=http npx card-news-mcp`
>   and register the URL `http://<host>:3000/mcp`.)
> - Env: `THEME=default`, `STORAGE_BACKEND=local`, `OUTPUT_DIR=./card-news-out`.
>   (Use `STORAGE_BACKEND=supabase` or `s3` with the matching keys if you want public URLs.)
> - After registering, list the tools and confirm `render_card_news` is available.

### 2. Create a card-news carousel

> Make a {{N}}-card Instagram carousel about **{{TOPIC}}** by calling `render_card_news`.
> - Card 0 = `thumbnail` (category badge + a punchy title).
> - Cards 1..N-2 = `body` (one key point each, with `page_number`).
> - Last card = `closing` (follow / save CTA).
> - Write all copy yourself; keep titles short and body text scannable.
> - Background images: {{IMAGE_URLS or "pick fitting stock images"}}.
> - Theme: `{{default | surfers | your-theme}}`.
> Return the saved file paths (or URLs) for each card.

## Development

```bash
npm install
npm run typecheck
npm run test:render default   # renders sample cards to ./card-news-out
npm run build
```

## License

[MIT](./LICENSE)
