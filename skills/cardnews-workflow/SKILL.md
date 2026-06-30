---
name: cardnews-workflow
description: Use to run the full card-news automation end-to-end - orchestrates research → copy → image → render → Notion → Slack review → publish. Invoke individual cardnews-* skills directly to run or customize single steps.
---

# Card News — Full Workflow (Orchestrator)

Run the complete 7-step card-news pipeline. Each step is its own skill so users can
run, skip, reorder, or customize any part — this orchestrator just chains the
default happy path.

## The pipeline

| # | Skill | Does | Gate |
|---|-------|------|------|
| 1 | **cardnews-research** | gather + synthesize sources | — |
| 2 | **cardnews-copy** | write spec.json | schema + lint must pass |
| 3 | **cardnews-image** | crawl background images | crawl fail → ask user |
| 4 | **cardnews-render** | render 1080×1350 PNGs | renderer built + Chromium |
| 5 | **cardnews-notion** | save to Notion doc DB | Notion MCP connected |
| 6 | **cardnews-review** | Slack review request | **HARD WAIT** for approval |
| 7 | **cardnews-publish** | IG + Threads carousel | Notion status = 승인 |

## How to run

1. Ask the user for the **topic** (and optional angle/theme).
2. Run steps 1→6 in order, invoking each `cardnews-*` skill and passing its output
   to the next. The spec.json (from step 2, image_url filled in step 3) is the
   shared artifact through render.
3. **Stop at step 6.** cardnews-review posts to Slack and the pipeline pauses for
   human review. Do not auto-run publish.
4. When the user returns and says the draft is approved, run **cardnews-publish**,
   which re-verifies the Notion approval state before posting.

## Customizing

Users compose their own workflow by invoking individual skills:
- Skip research and hand in your own notes → start at cardnews-copy.
- Already have images → cardnews-copy then cardnews-render.
- Render only → cardnews-render with an existing spec.json.
- No social publish → stop after cardnews-notion or cardnews-review.

## Setup notes
- Renderer: `cd "${CLAUDE_PLUGIN_ROOT}" && npm install && npm run build && npx playwright install chromium` (once).
- Env: `SLACK_WEBHOOK_URL`, `IG_USER_ID`/`IG_ACCESS_TOKEN`, `THREADS_USER_ID`/`THREADS_ACCESS_TOKEN`.
- Public image URLs (S3/Supabase storage) required for IG/Threads publish.
