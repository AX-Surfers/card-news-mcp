---
name: cardnews-workflow
description: Use to run the full card-news automation end-to-end - orchestrates topic pick (news.hada.io RSS) → research → copy → image → render (SURFERS theme) → llm-wiki archive+push → auto-publish to Instagram/Threads. Invoke individual cardnews-* skills to run or customize single steps.
---

# Card News — Full Workflow (Orchestrator)

Run the complete card-news pipeline for **SURFERS (AI·AX 오프라인 교육)**. Each
step is its own skill, so any part can be run, skipped, reordered, or customized —
this orchestrator chains the default happy path.

## The pipeline

| # | Step / Skill | Does | Gate |
|---|--------------|------|------|
| 1 | **Topic pick** | crawl `news.hada.io/rss/news`, pick the most viral item **that fits SURFERS (AI education)** | — |
| 2 | **cardnews-research** | original article + linked sources (Anthropic blog/paper, VentureBeat, …) → core message · key points · hook · gaps | — |
| 3 | **cardnews-copy** | write `spec.json` — 비개발자용 쉬운 서사 7장 (썸네일 + 본문5 + 클로징) + optional `pinned_comment` | schema + 문자수 lint must pass |
| 4 | **cardnews-image** | **priority 1**: images from the topic's original article + the sites it links; **priority 2**: Google/Unsplash Playwright crawl | fail → ask user |
| 5 | **cardnews-render** | 1080×1350 PNG ×7, **SURFERS theme** (#0573F0, Pretendard), `--flat` output | renderer built + Chromium |
| 5b | *(optional)* **cardnews-render-video** | swap the thumbnail's static image for a video background (same overlay) | ffmpeg installed |
| 6 | **cardnews-wiki** | archive note + PNGs (+ MP4 if 5b ran) into `~/Develop/llm-wiki` and **git push** | repo reachable |
| 7 | **cardnews-autopublish** | Instagram + Threads carousel via local publish runtime; posts `pinned_comment` if present; records result back into the wiki note | 검수 승인 게이트 |

## How to run

1. **Topic (step 1).** Fetch `https://news.hada.io/rss/news`, list recent items,
   pick the single most viral one **on-brand for an AI-education company** (AI /
   LLM / interpretability / dev-tooling beats generic news). State the pick +
   rationale before continuing. Capture the item's `source_url`.
2. **Steps 2→5.** Run each `cardnews-*` skill in order, passing output forward.
   `spec.json` (from step 3, `image_url` filled in step 4) is the shared artifact
   through render. Render with the **surfers** theme and **`--flat`**, **outputting
   straight into the llm-wiki piece folder**
   `~/Develop/llm-wiki/01-콘텐츠마케팅/카드뉴스/<id>/` so no output lands in a stray
   directory and no `<id>/` nesting needs manual flattening.
3. **Step 5b — video thumbnail (optional).** Only if the user wants a video
   background on the thumbnail. Needs a background clip (from the user, or
   sourced the same way cardnews-image sources images). Run **cardnews-render-video**
   after 5; it adds an MP4 alongside the existing static PNGs, it doesn't replace them.
4. **Step 6 — wiki.** Run `cardnews-wiki`: the PNGs (+ MP4 if 5b ran) are already
   in the wiki folder (step 5), so just add `spec.json` + the markdown note, then
   commit and push to `main`. Note starts `status: draft` — autopublish flips it.
5. **Step 7 — publish.** `cardnews-autopublish` runs the **local** publish scripts
   (`~/.local/share/cardnews/`): verify creds → upload cards to public URLs
   (image + video mixed, see that skill's "Media types" section) →
   approval-gated Instagram + Threads carousel → posts `pinned_comment` (if the
   copy step wrote one) as a comment on the IG post (pinning itself is manual,
   in-app — the API has no pin endpoint) → updates the wiki note's `status`,
   `## 발행`, `## 댓글`. Publishing is outward-facing and irreversible —
   **confirm with the user before the final publish call.** Every run's
   permanent record lives in the wiki, whether or not step 7 runs.

## Customizing

Compose your own flow by invoking single skills:
- Have a topic already → skip step 1, start at cardnews-research (or hand notes to
  cardnews-copy).
- Already have images → cardnews-copy → cardnews-render.
- Render only → cardnews-render with an existing spec.json.
- Archive without publishing → stop after cardnews-wiki.

## Setup notes
- Renderer (once): `cd "${CLAUDE_PLUGIN_ROOT}" && npm install && npm run build && npx playwright install chromium`.
- Video thumbnail (only if using step 5b): `ffmpeg`/`ffprobe` on PATH (`brew install ffmpeg`).
- Theme: `surfers` (bundled) — SURFERS brand tokens.
- Wiki: `~/Develop/llm-wiki` (git, remote `AX-Surfers/marketing-llm-wiki`, `main`).
- Publish runtime: `~/.local/share/cardnews/` (scripts + `.env`/`.secrets`, loaded
  server-side style; tokens never printed). Cards need public URLs for IG/Threads.

## Removed vs. old pipeline
- **Notion save → replaced by cardnews-wiki** (git-managed llm-wiki).
- **Slack review (cardnews-review) → dropped** from the default chain; the
  approval gate now lives in cardnews-autopublish. Run cardnews-review manually if
  a Slack sign-off is still wanted before publish.
