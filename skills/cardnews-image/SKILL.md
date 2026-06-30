---
name: cardnews-image
description: Use after copy to source background images for each card by crawling the web with Playwright - on crawl failure it asks the user for an image instead of generating one. Step 3 of the card-news pipeline.
---

# Card News — Image (Step 3)

Fill each card's `image_url` in `spec.json` with a background image sourced by
**web crawl**. There is no generation fallback: if crawling fails for a card, ask
the user to provide an image directly.

## Inputs
- **spec.json** path from cardnews-copy

## Procedure

1. For each card needing an image (thumbnail, body, optionally closing), derive a
   short visual search query from its title/category/topic.
2. Crawl with the Playwright plugin tools (`browser_navigate`, `browser_snapshot`,
   `browser_evaluate`):
   - Open an image search for the query.
   - Extract candidate full-resolution image URLs from the results.
   - Pick a high-quality, license-safe, landscape image that matches the message.
   - Prefer direct image URLs (`.jpg`/`.png`/`.webp`) that load without auth.
3. Validate the chosen URL is publicly reachable (HEAD/GET 200, image content-type).
4. Write the URL into that card's `image_url`.

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
