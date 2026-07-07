---
name: cardnews-autopublish
description: Use to publish rendered card news as an Instagram and/or Threads carousel (either platform alone, or both) by running the local publish scripts directly (no hermes, no docker). Gated by a local approval manifest (no Notion). Tokens live in the local runtime's .env/.secrets and are never printed. Final step of the card-news pipeline.
---

# Card News — Auto Publish (local)

Publish the rendered card news as an Instagram and/or Threads **carousel** —
both platforms by default, or just one via `--platform` — by running the publish
scripts **locally**. The scripts were pulled off the hermes server and patched
for local paths; they now live in a self-contained runtime:

```
~/.local/share/cardnews/     ($CARDNEWS_DATA_ROOT — override to relocate)
├── .env / .secrets/         tokens (600/700, gitignored, NEVER printed)
├── scripts/                 patched publish scripts
├── work/                    scratch (PNGs, url lists, results)
└── run_publish.sh           loads .env → runs the pipeline
```

## SECURITY (non-negotiable)
- **Never read, print, copy, or echo any token value.** Do not `cat` `.env`,
  `.secrets/*`, or any credential file. The scripts load values themselves.
- Publishing is outward-facing and irreversible. Confirm with the user before the
  final publish call, and only after the approval gate passes.

## Prerequisites
- Runtime set up: `~/.local/share/cardnews/.env` filled (see `.env.example`) and
  `.secrets/` populated. If `.env` is missing, STOP — tell the user to set it up.
- Rendered PNGs from `cardnews-render` (`.../card-news-out/<id>/*.png`, named
  `0_*.png … N_*.png` so carousel order = filename order).
- **Approval manifest** JSON asserting an explicit sign-off (see gate below).
- Caption/text file(s) for whichever platform(s) you're publishing to: IG caption
  file, and/or Threads body text file.

## One platform or both
`post_card_news_social.py` takes `--platform {both,instagram,threads}` (default
`both`). Pick `instagram` or `threads` to post to only that platform — the other
platform's caption/urls args become optional and are simply ignored. Ask the user
which platform(s) they want if it isn't obvious from context.

### Credentials the scripts expect (names only)
`INSTAGRAM_GRAPH_TOKEN`(or `META_GRAPH_ACCESS_TOKEN`)+`INSTAGRAM_BUSINESS_ACCOUNT_ID`,
`THREADS_ACCESS_TOKEN`+`THREADS_USER_ID`, `GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE`,
`GOOGLE_DRIVE_PARENT_ID`. `*_FILE` variants honored. **No Notion token needed** —
this skill has no Notion dependency.

> **Google Drive parent is required.** The service account has 0 personal Drive
> quota, so uploads to My Drive fail with 403. `GOOGLE_DRIVE_PARENT_ID` must point
> at a **Shared Drive** the SA is a member of; `run_publish.sh upload-public`
> auto-injects it as `--parent-id`. (Current shared drive: "SNS Image".)

## Approval gate (no Notion)
Publishing requires a local approval manifest — a small JSON with explicit sign-off:
```json
{ "approved": true, "approval_source": "<who approved, e.g. 김준호>", "approved_at": "2026-07-07T19:30:00+09:00" }
```
The publish script blocks unless `approved` is true and both `approval_source` and
`approved_at` are present. Create this only after the user/team approves the draft
(e.g. right after the `cardnews-wiki` archive, or a manual review). Never fabricate
approval — get the user's explicit go first, then write the manifest.

## Why public URLs
IG and Threads fetch each carousel image from a public URL at publish time. Local
PNGs can't be posted, so the pipeline uploads them to public Google Drive URLs
(`google_drive_public_upload.py`, anyone-with-link reader) and feeds those.

## Procedure

```bash
RT="$HOME/.local/share/cardnews"
ID=<id>;  DIR=/path/to/card-news-out/$ID;  W="$RT/work/$ID";  mkdir -p "$W"

# 1. verify credentials (no posting). Aborts if tokens don't load.
bash "$RT/run_publish.sh" verify

# 2. upload rendered PNGs → public URLs (ordered by filename)
bash "$RT/run_publish.sh" upload-public --dir "$DIR" > "$W/upload.json"
python3 - "$W/upload.json" "$W" <<'PY'
import json,sys
d=json.load(open(sys.argv[1])); w=sys.argv[2]
items=d if isinstance(d,list) else d.get("files",d.get("results",[]))
items=sorted(items,key=lambda x:x.get("name",""))
urls="\n".join(x["public_direct_url"] for x in items)+"\n"
open(w+"/ig_urls.txt","w").write(urls); open(w+"/threads_urls.txt","w").write(urls)
PY

# 3. stage caption + text (write your copy to these files)
#    $W/ig_caption.txt   $W/threads_text.txt

# 4. write the approval manifest ONLY after the user approves
cat > "$W/approval.json" <<JSON
{ "approved": true, "approval_source": "<approver>", "approved_at": "$(date -Iseconds)" }
JSON

# 5. approval-gated publish. Blocks unless approval.json is valid.
#    --platform defaults to "both"; use "instagram" or "threads" for one only.
bash "$RT/run_publish.sh" publish \
  --platform                  both \
  --instagram-caption-file    "$W/ig_caption.txt" \
  --instagram-image-urls-file "$W/ig_urls.txt" \
  --threads-text-file         "$W/threads_text.txt" \
  --threads-image-urls-file   "$W/threads_urls.txt" \
  --approval-manifest         "$W/approval.json" \
  --result-json               "$W/publish_result.json"
```

To publish Instagram only, drop the `--threads-*` args and pass `--platform instagram`
(symmetric for `--platform threads`). `run_publish.sh verify` also takes an optional
platform arg: `verify instagram` / `verify threads` / `verify` (both, default).

## Operational rules
1. Secret values never appear in logs/output.
2. Multi-slide card news is always posted as a carousel, on each targeted platform.
3. Every carousel image must be a public URL.
4. No publish unless the approval manifest asserts `approved: true`.
5. Publish result recorded as JSON (`publish_result.json`).

## Output
`publish_result.json` (IG + Threads creation/publish ids). Report the permalinks.
