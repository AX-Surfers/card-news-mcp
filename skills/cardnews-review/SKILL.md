---
name: cardnews-review
description: Use after saving to Notion to post a Slack review request via webhook, then HARD STOP and wait - do not publish until the team approves. Step 6 of the card-news pipeline.
---

# Card News — Slack Review + Hard Wait (Step 6)

Notify the team in Slack that a card news draft is ready for review, then **stop**.
This step never proceeds to publish on its own.

## Inputs
- Notion page URL (from cardnews-notion)
- Topic / title

## Prerequisite
- `SLACK_WEBHOOK_URL` env var (Slack Incoming Webhook).

## Procedure

1. Post a review request to Slack via the webhook:

```bash
curl -sS -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d '{"text": "📰 카드뉴스 검수 요청\n제목: <TITLE>\nNotion: <NOTION_URL>\n검수 후 Notion 검수 상태를 *승인*으로 변경해 주세요."}'
```

Substitute `<TITLE>` and `<NOTION_URL>`. A 2xx with body `ok` means delivered.

2. **HARD WAIT.** After posting:
   - Tell the user the review request was sent and that publishing is blocked until
     the reviewer sets the Notion 검수 상태 to 승인 (approved).
   - Do NOT call cardnews-publish automatically. End the step here.
   - The user (or a later explicit run) starts **cardnews-publish**, which re-checks
     the Notion approval state before publishing.

## Output

Confirmation that the Slack request was sent. Pipeline pauses for human review.
