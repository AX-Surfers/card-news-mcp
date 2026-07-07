---
name: cardnews-wiki
description: Use after render to archive the finished card news into the llm-wiki git repo (~/Develop/llm-wiki) as a markdown note plus the PNGs, then commit and push. Replaces the old Notion save step (step 6 of the card-news pipeline).
---

# Card News — Wiki Archive (Step 6)

Save the rendered card news into the **llm-wiki** Obsidian/git repo and push it,
so the team's marketing knowledge base holds every published piece. This replaces
the old `cardnews-notion` step.

## Inputs
- `spec.json` (copy from cardnews-copy, image_url filled by cardnews-image)
- Rendered PNG dir (from cardnews-render): `.../card-news-out/<id>/*.png`
- Research notes (from cardnews-research) — core message, sources, hook, gaps

## Repo
- Path: `~/Develop/llm-wiki/` (git, remote `AX-Surfers/marketing-llm-wiki`, branch `main`).
- Card news is our own produced content → archive under **`01-콘텐츠마케팅/카드뉴스/`**.

## Procedure

1. **Pre-flight**: confirm the repo is clean-ish and up to date.
   ```bash
   WIKI=~/Develop/llm-wiki
   git -C "$WIKI" pull --rebase --autostash
   ```

2. **Lay down the piece** at `01-콘텐츠마케팅/카드뉴스/<id>/`. If cardnews-render
   already wrote the PNGs here (its default out dir), they're in place — just add
   the spec. Otherwise copy both:
   ```bash
   DEST="$WIKI/01-콘텐츠마케팅/카드뉴스/<id>"
   mkdir -p "$DEST"
   cp /path/to/card-news-out/<id>/*.png "$DEST/" 2>/dev/null || true   # skip if already rendered here
   cp /path/to/spec.json "$DEST/spec.json"
   ```

3. **Write the note** `<id>.md` in that folder (Obsidian-friendly). Include:
   - Frontmatter: `title`, `date` (YYYY-MM-DD), `type: 카드뉴스`, `status: draft`,
     `source_url`, `platforms: [instagram, threads]`, `tags`.
   - **핵심 메시지** (research core message).
   - **카드별 카피** — per-card title/body from spec.json, in order.
   - **이미지** — embed each PNG with Obsidian syntax `![[0_thumbnail.png]]` … in
     card order (files sit next to the note).
   - **출처** — research sources as links.
   - **갭/주의** — research gaps (what must not be overstated).
   - **## 관련** — REQUIRED. This vault is a linked MOC graph; a note with no
     `## 관련` links is an orphan. Always link:
     `[[카드뉴스]]` (the index/MOC), `[[콘텐츠 방향성]]`, `[[톤앤매너 가이드]]`,
     `[[디자인 시스템]]`, `[[브랜드 아이덴티티]]`.

4. **Register in the MOC.** Append a row for this piece to
   `01-콘텐츠마케팅/카드뉴스.md` (the 카드뉴스 index): `| <date> | <제목> | <소재> | [[<id>]] |`.
   If that index file does not exist yet, create it (tags `[content-marketing, 카드뉴스, moc]`,
   a `## 발행물` table, and `## 관련` → `[[콘텐츠 방향성]]`), and link it from
   `00-Home/Home.md` (시작 노트 목록) + `01-콘텐츠마케팅/콘텐츠 방향성.md` (관련) so it
   is reachable from the top MOC.

5. **Commit + push**:
   ```bash
   git -C "$WIKI" add "01-콘텐츠마케팅/카드뉴스/<id>" "01-콘텐츠마케팅/카드뉴스.md" "00-Home/Home.md" "01-콘텐츠마케팅/콘텐츠 방향성.md"
   git -C "$WIKI" commit -m "카드뉴스: <제목> (<id>)"
   git -C "$WIKI" push origin main
   ```
   Report the pushed commit hash + the note path.

## Notes
- This is an outward-facing action (push to a shared repo). If the working tree
  has unrelated staged/dirty changes, stage only the card-news path — never blanket
  `git add -A`.
- If push is rejected (remote moved), `git pull --rebase` then push again.
- No secrets belong in the wiki. Do not copy `.env`/tokens here.

## Output
Pushed commit hash + note path. Hand to **cardnews-autopublish** for the final
Instagram + Threads publish.
