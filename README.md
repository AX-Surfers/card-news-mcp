# card-news

> 🇰🇷 한국어 문서는 [README.ko.md](./README.ko.md) 를 보세요.

A **Claude Code plugin** that turns a topic into a post-ready **Instagram-style card
news** carousel (1080×1350 PNG) — thumbnail, body pages, and a closing
call-to-action card — all themeable.

It ships **composable skills** covering the full automation pipeline:

| # | Skill | Does |
|---|-------|------|
| 1 | `cardnews-research` | gather + synthesize sources for a topic |
| 2 | `cardnews-copy` | write the render spec — **schema + lint gated** |
| 3 | `cardnews-image` | source images: priority 1 the topic's own article/links, priority 2 Google/Unsplash crawl |
| 4 | `cardnews-render` | render 1080×1350 PNGs locally (Playwright), SURFERS theme |
| 5 | `cardnews-wiki` | archive note + PNGs into the llm-wiki git repo and push |
| 6 | `cardnews-autopublish` | publish IG + Threads carousel via the local runtime, approval-manifest gated |
| — | `cardnews-workflow` | orchestrate all of the above end-to-end |

Optional / standalone: `cardnews-review` (Slack sign-off → approval manifest),
`cardnews-notion` (legacy Notion save, no longer in the default chain).

Run the whole pipeline with `cardnews-workflow`, or invoke any individual skill to
build your own workflow (render-only, copy + render, skip publish, etc.).

## Install

```bash
claude plugin marketplace add /Users/kimjunho/Develop/cardnews
claude plugin install card-news@cardnews
```

(After publishing to a git remote, point `marketplace add` at the repo URL instead.)

### Renderer setup (once)

The render step uses a bundled Playwright renderer. Build it and install Chromium:

```bash
cd <plugin-root> && npm install && npm run build && npx playwright install chromium
```

## Card types

| Type | What's on it |
|------|--------------|
| `thumbnail` | Full-bleed background image, brand logo, category badge, big title |
| `body` | Background image, page number badge, heading, body text, brand mark |
| `closing` | Brand wordmark, tagline, call-to-action, save/like/follow icons |

## The renderer (`render-cli`)

The render step calls a small CLI that turns a spec JSON into PNGs:

```bash
node dist/render-cli.js <spec.json> [--out <dir>]
```

Input spec shape:

```jsonc
{
  "id": "my-post",          // optional, used for output folder name
  "theme": "default",       // optional, theme name or path
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

Output (stdout JSON):

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

```bash
THEME_DIR=/path/to/my-theme
```

## Storage backends

Choose with `STORAGE_BACKEND`:

| Value | Behavior | Extra setup |
|-------|----------|-------------|
| `local` (default) | Saves PNGs to `OUTPUT_DIR`, also returns base64 | none |
| `base64` | Returns base64 data URIs only (no files) | none |
| `supabase` | Uploads to Supabase Storage, returns public URL | `npm i @supabase/supabase-js`, set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `s3` | Uploads to S3 / Cloudflare R2, returns public URL | `npm i @aws-sdk/client-s3`, set `S3_*` vars |

> **Publishing to IG/Threads needs public image URLs.** `cardnews-autopublish`
> handles this itself by uploading the rendered PNGs to public Google Drive URLs at
> publish time, so the `local` render backend is fine.

### Cloudflare R2 (S3-compatible)

R2 has a generous free tier (10 GB storage, **free egress**). It works through the
`s3` backend — just point `S3_ENDPOINT` at R2:

```bash
STORAGE_BACKEND=s3
S3_BUCKET=card-news
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<R2 token key>
S3_SECRET_ACCESS_KEY=<R2 token secret>
S3_REGION=auto
S3_PUBLIC_BASE_URL=https://<your-r2-public-domain>   # r2.dev URL or custom domain
```

Enable public access (r2.dev or a custom domain) on the bucket so the returned URLs
are publicly fetchable.

## Configuration (env vars)

| Variable | Default | Purpose |
|----------|---------|---------|
| `THEME` | `default` | Bundled theme name |
| `THEME_DIR` | — | Path to an external custom theme |
| `STORAGE_BACKEND` | `local` | `base64` / `local` / `supabase` / `s3` |
| `OUTPUT_DIR` | `./card-news-out` | Where `local` saves files |
| `SLACK_WEBHOOK_URL` | — | Slack Incoming Webhook for `cardnews-review` |
| `IG_USER_ID` / `IG_ACCESS_TOKEN` | — | Instagram publish (Meta Graph API) |
| `THREADS_USER_ID` / `THREADS_ACCESS_TOKEN` | — | Threads publish |

## Troubleshooting

- **Chromium download is large / blocked.** Set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`
  during install and point Playwright at an existing Chrome/Chromium.
- **Korean / CJK text looks wrong.** Themes load the Pretendard web font; ensure the
  rendering machine has internet access on first render, or bundle a local font in your theme.

## Development

```bash
npm install
npm run typecheck
npm run test:render default   # renders sample cards to ./card-news-out
npm run build
node dist/render-cli.js spec.json --out ./card-news-out
```

## License

[MIT](./LICENSE)
