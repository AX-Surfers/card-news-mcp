---
name: cardnews-publish
description: Use only after Notion review status is approved - verifies approval, then publishes the cards as an Instagram + Threads carousel via the Meta Graph API. Step 7 (final) of the card-news pipeline.
---

# Card News — Publish (Step 7)

Publish the approved card news as an Instagram and Threads **carousel**. This step
must first confirm the Notion review status is approved; never publish otherwise.

## Inputs
- Notion page id/URL (from cardnews-notion)
- Public image URLs for each card (carousel requires public URLs)

## Prerequisites / env
- Notion MCP (to read review status)
- Instagram: `IG_USER_ID`, `IG_ACCESS_TOKEN`
- Threads: `THREADS_USER_ID`, `THREADS_ACCESS_TOKEN`
- Card images at **public URLs**. Local PNGs cannot be published — re-render with
  `STORAGE_BACKEND=s3` (or supabase) first if needed.

## Procedure

1. **Approval gate.** Fetch the Notion page; read 검수 상태. If it is NOT 승인
   (approved), STOP and report that publishing is blocked. Do not continue.

2. **Instagram carousel** (Meta Graph API, repeat per image then combine):
   ```bash
   # a) create one item container per image (is_carousel_item=true)
   curl -sS -X POST "https://graph.facebook.com/v21.0/$IG_USER_ID/media" \
     -d "image_url=<PUBLIC_IMG_URL>" -d "is_carousel_item=true" \
     -d "access_token=$IG_ACCESS_TOKEN"
   # -> returns child creation_id (repeat, collect all ids in order)

   # b) create the carousel container
   curl -sS -X POST "https://graph.facebook.com/v21.0/$IG_USER_ID/media" \
     -d "media_type=CAROUSEL" -d "children=<ID1>,<ID2>,..." \
     -d "caption=<CAPTION>" -d "access_token=$IG_ACCESS_TOKEN"
   # -> returns carousel creation_id

   # c) publish
   curl -sS -X POST "https://graph.facebook.com/v21.0/$IG_USER_ID/media_publish" \
     -d "creation_id=<CAROUSEL_ID>" -d "access_token=$IG_ACCESS_TOKEN"
   ```

3. **Threads carousel** (Threads Graph API, same pattern):
   ```bash
   # a) per-image item containers (media_type=IMAGE, is_carousel_item=true)
   curl -sS -X POST "https://graph.threads.net/v1.0/$THREADS_USER_ID/threads" \
     -d "media_type=IMAGE" -d "image_url=<PUBLIC_IMG_URL>" \
     -d "is_carousel_item=true" -d "access_token=$THREADS_ACCESS_TOKEN"
   # b) carousel container (media_type=CAROUSEL, children=...)
   # c) publish via /threads_publish with creation_id
   ```

4. Report the published IG and Threads permalinks. Optionally update the Notion page
   status to 발행완료 (published) with the links.

## Output

Published Instagram + Threads URLs.
