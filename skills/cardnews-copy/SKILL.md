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
  "brand": { }
}
```

- `image_url` is left null/absent here — the **cardnews-image** step fills it.
- `brand` overrides theme defaults; usually leave `{}`.

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
| any title/body | non-empty |

Count characters (Korean counts per character). If any rule fails, report which
card/field and rewrite. Only emit the spec once ALL rules pass.

## Output

Write `spec.json` to the working dir and hand the path to **cardnews-image**.
