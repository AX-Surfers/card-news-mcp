---
name: cardnews-notion
description: Use after rendering to save the card-news draft into a Notion document database (marketing type, title "카드뉴스 | YYYY-MM-DD") via the Notion MCP. Step 5 of the card-news pipeline.
---

# Card News — Notion Save (Step 5)

Save the rendered card news into Notion as a document-DB page that the team reviews
and approves before publish.

## Inputs
- Rendered PNG paths/URLs (from cardnews-render)
- Topic / copy summary
- **Notion document DB** id (target database)

## Prerequisite
Uses the external **Notion MCP** (must be connected). If unavailable, ask the user
to connect it.

## Procedure

1. Build the page properties:
   - **Title**: `카드뉴스 | YYYY-MM-DD` (today's date).
   - **Type / 분류**: `마케팅` (marketing).
   - **검수 상태 (review status)**: set to the DB's "대기/검토중" (pending) option —
     publish later checks this becomes approved.
2. Create the page in the target document DB (Notion MCP create page).
3. Add page content:
   - The card copy (per-card title/body) as text blocks.
   - The rendered images — embed image blocks. Local PNGs can't be embedded by URL;
     if images live on a public URL (S3/Supabase) embed those, otherwise attach
     paths/notes and let the reviewer view locally.
4. Capture the returned **Notion page URL/id** for the review and publish steps.

## Output

Notion page URL + id. Hand to **cardnews-review**.
