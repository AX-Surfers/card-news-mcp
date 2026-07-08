---
name: cardnews-image
description: Use after copy to source background images for each card - priority 1 is the topic's original article and the authoritative sites it links to, priority 2 is a Google/Unsplash Playwright crawl. On failure it asks the user for an image instead of generating one. Step 3 of the card-news pipeline.
---

# Card News — Image (Step 3)

Fill each card's `image_url` in `spec.json` with a background image sourced by
**web crawl**. There is no generation fallback: if crawling fails for a card, ask
the user to provide an image directly.

## Inputs
- **spec.json** path from cardnews-copy
- **source_url(s)** from cardnews-research (the topic's original article and the
  authoritative sites it links to) — the priority-1 image source below.

## Source priority

**Priority 1 — the topic's own sources.** Before any stock crawl, open the
selected topic's **original article** (the news.hada.io link) and the
**authoritative sites it embeds/links** (e.g. the primary blog, paper, or vendor
page). Pull the real diagrams/photos from those pages — they match the story
exactly and carry more credibility than stock. Prefer the site's direct CDN image
URLs; verify each loads publicly.

**Priority 2 — stock crawl (fallback).** Only for cards with no fitting source
image, crawl **Google Images / Unsplash** with Playwright for a license-safe,
landscape image that matches the card's message.

## Procedure

1. For each card needing an image (thumbnail, body, optionally closing):
2. **Try priority 1 first.** With the Playwright tools (`browser_navigate`,
   `browser_evaluate`), open the original article + its linked authoritative
   sites, extract the real image URLs (`img` src / CDN links), and pick the one
   that fits the card. Keep direct CDN URLs (public, no auth).
3. **Fall back to priority 2** (Google/Unsplash crawl) only if no source image
   fits that card.
4. Validate the chosen URL is publicly reachable (GET 200, image content-type):
   ```bash
   for u in "${urls[@]}"; do
     curl -s -o /dev/null -w "%{http_code} %{content_type}  $u\n" "$u"
   done
   ```
   Every line must start `200 image/...`. Anything else (redirect, 4xx, `text/html`)
   means that URL can't be used as-is — try another candidate or fall back to
   priority 2.
5. Write the URL into that card's `image_url`.

## On failure (no generation)

If no usable image is found for a card after a reasonable attempt:
- Do NOT generate or fabricate one.
- Stop and ask the user to provide an image URL or local path for that specific card.
- Resume once the user supplies it.

## Notes
- The thumbnail image is reused on the closing card by the renderer.
- For IG/Threads publish later, images must be at public URLs — keep that in mind
  when choosing sources.

## Output

Updated `spec.json` with `image_url` set on each card. Hand to **cardnews-render**.
