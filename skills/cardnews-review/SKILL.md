---
name: cardnews-review
description: Optional Slack sign-off before publishing - post a review request via webhook linking the llm-wiki entry, HARD STOP and wait, then on approval write the approval manifest that cardnews-autopublish requires. Not in the default chain; run when a team sign-off is wanted.
---

# Card News — Slack Review + Hard Wait (optional)

Notify the team in Slack that a card news draft is ready, then **stop**. This step
never publishes on its own. Optional — the default workflow gates publish with an
approval manifest directly; run this when a Slack sign-off is wanted first.

## Inputs
- llm-wiki entry path / pushed commit (from cardnews-wiki)
- Topic / title
- The autopublish work dir for this piece (`~/.local/share/cardnews/work/<id>/`)

## Prerequisite
- `SLACK_WEBHOOK_URL` env var (Slack Incoming Webhook).

## Procedure

1. Post a review request to Slack via the webhook:

```bash
curl -sS -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d '{"text": "📰 카드뉴스 검수 요청\n제목: <TITLE>\nllm-wiki: 01-콘텐츠마케팅/카드뉴스/<id> (commit <HASH>)\n검수 후 승인 회신해 주세요."}'
```

Substitute `<TITLE>`, `<id>`, `<HASH>`. A 2xx with body `ok` means delivered.

2. **HARD WAIT.** After posting:
   - Tell the user the review request was sent and that publishing is blocked
     until the team approves.
   - Do NOT publish automatically. End the step here.

3. **On approval only.** When the user confirms the team approved, write the
   approval manifest that `cardnews-autopublish` requires:

```bash
cat > ~/.local/share/cardnews/work/<id>/approval.json <<JSON
{ "approved": true, "approval_source": "<approver>", "approved_at": "$(date -Iseconds)" }
JSON
```

Then hand off to **cardnews-autopublish** (it reads this manifest as its gate).

## Output
Confirmation the Slack request was sent; on approval, an `approval.json` manifest
ready for cardnews-autopublish.
