---
name: cardnews-copy
description: Use after research to write card-news copy as a render spec - enforces a schema + lint gate so copy only passes when it fits the templates. Step 2 of the card-news pipeline.
---

# Card News — Copy (Step 2)

Turn research notes into a **render spec JSON** (`spec.json`). Copy may ONLY pass to
the render step after it clears the schema check AND the lint gate below. This is a
hard gate — if it fails, rewrite and re-check. Do not proceed on a failing spec.

## Output: spec.json

Matches the renderer's input schema:

```json
{
  "id": "optional-slug",
  "theme": "default",
  "cards": [
    { "type": "thumbnail", "index": 0, "title": "...", "category": "...", "image_url": null },
    { "type": "body", "index": 1, "title": "...", "body": "...", "page_number": 1, "image_url": null },
    { "type": "closing", "index": 2, "tagline": "...", "cta": "..." }
  ],
  "brand": { },
  "pinned_comment": "..."
}
```

- `image_url` is left null/absent here — the **cardnews-image** step fills it.
- `brand` overrides theme defaults; usually leave `{}`.
- `pinned_comment` (optional): write it now, alongside the cards, not as a
  post-publish afterthought. It's the first-comment copy **cardnews-autopublish**
  posts right after the carousel goes live — an engagement hook (question, CTA,
  "we tried it, what did you make?") distinct from the caption. The renderer
  ignores this field; it's read directly from `spec.json` by the publish step.
  **Caveat:** the Instagram Graph API can post the comment but has no endpoint to
  *pin* it — pinning is a manual in-app action (long-press → 고정, max 3 per
  post). Write the copy assuming a human pins it shortly after.

## Schema check

Every card must satisfy:
- `type` ∈ {thumbnail, body, closing}; `index` is a non-negative int, unique, ordered.
- Required fields present (see lint), no empty `title`/`body`.

## Lint gate (default theme; tune per theme)

| Rule | Limit |
|------|-------|
| Exactly 1 `thumbnail` (first) | required |
| Exactly 1 `closing` (last) | required |
| `body` cards | 1 to N |
| thumbnail `category` | ≤ 10 chars |
| thumbnail `title` | ≤ 40 chars |
| body `title` | ≤ 30 chars |
| body `body` | ≤ 200 chars |
| closing `tagline` | ≤ 24 chars |
| closing `cta` | ≤ 80 chars |
| `pinned_comment` (if present) | ≤ 150 chars, non-empty |
| any title/body | non-empty |

Count characters (Korean counts per character). If any rule fails, report which
card/field and rewrite. Only emit the spec once ALL rules pass.

## Output

Write `spec.json` to the working dir and hand the path to **cardnews-image**.

## Editing copy after the piece is already rendered/published

A single wording change (e.g. the thumbnail title) fans out — missing a step
leaves stale copy live somewhere. Re-sync in this order:

1. `spec.json` — edit the field.
2. Static PNGs — `node dist/render-cli.js spec.json --out <dir> --flat`
   (re-renders **all** cards; cheap, don't try to patch just one).
3. If a video thumbnail exists (see **cardnews-render-video**) — re-render the
   transparent overlay, then re-run the ffmpeg composite. Both the PNG and MP4
   must show the same title.
4. Wiki note (`cardnews-wiki`'s note) — title in the frontmatter/body + the
   `![[...]]` embeds are already-baked images, so no embed syntax changes, but
   any inline transcription of the copy needs updating.
5. Wiki MOC index row (`01-콘텐츠마케팅/카드뉴스.md`) — title column.
6. If already published — captions/comments already posted on IG/Threads do
   **not** retroactively update; note the mismatch in the wiki record rather than
   silently leaving it, and only edit the live post if the platform allows it.

Skipping step 2 is the most common miss (edits `spec.json` but ships the old PNG).
