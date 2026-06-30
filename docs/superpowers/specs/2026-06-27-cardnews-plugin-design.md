# card-news-mcp → Claude Code 플러그인 전환 설계

날짜: 2026-06-27

## 목표

`Develop/cardnews` repo를 Claude Code 플러그인으로 전환한다. MCP 서버 기능은 제거하고,
Playwright 기반 렌더러는 `render-cli` 스크립트로 보존한다. 카드뉴스 자동화 7단계
파이프라인을 7개 독립 스킬 + 1개 오케스트레이터 스킬로 분할하여, 사용자가 Claude로
스킬을 조합해 자신만의 워크플로우를 구성할 수 있게 한다.

## 비목표

- card-news-studio (별도 monorepo) 개발 — 중지
- MCP 서버 유지 — 제거
- 이미지 생성(generation) fallback — 제거 (크롤 실패 시 사용자에게 직접 제공 요청)

## 파이프라인 (7단계)

1. 리서치
2. 카피 작성 (harness schema + lint 통과 후에만 다음 단계)
3. 이미지 취득 (웹 크롤; 실패 시 사용자에게 요청)
4. 로컬 렌더 (1080×1350 PNG)
5. Notion 저장 (문서 DB, 마케팅 타입, 제목 `카드뉴스 | YYYY-MM-DD`)
6. 슬랙 리뷰 요청 후 하드 대기
7. Notion 검수 상태 승인 확인 후 Instagram/Threads 캐러셀 발행

## Repo 구조

```
cardnews/
├── .claude-plugin/
│   ├── plugin.json          # 매니페스트
│   └── marketplace.json     # 로컬 마켓플레이스
├── skills/
│   ├── cardnews-workflow/   # 오케스트레이터 (7단계 전체 안내)
│   ├── cardnews-research/
│   ├── cardnews-copy/       # schema + lint 게이트
│   ├── cardnews-image/      # Playwright 크롤, 실패→사용자 요청
│   ├── cardnews-render/     # render-cli 호출
│   ├── cardnews-notion/
│   ├── cardnews-review/     # Slack webhook + 하드 대기
│   └── cardnews-publish/    # 승인확인 + IG/Threads 발행
├── src/
│   ├── render-cli.ts        # NEW: spec.json → PNG
│   ├── tools/render-card-news.ts   # 유지 (renderCardNews)
│   ├── renderer/ storage/ index.ts # 유지
│   └── (server.ts, cli.ts 제거)
├── themes/ dist/ docs/ ...
```

## 코드 변경

### 제거
- `src/server.ts`, `src/cli.ts`
- `@modelcontextprotocol/sdk` 의존성
- package.json `bin` (MCP), `exports["./server"]`, MCP 관련 scripts/keywords

### 추가: `src/render-cli.ts`
```
node dist/render-cli.js <spec.json> [--out <dir>]
```
- `spec.json` = 기존 `RenderCardNewsInputSchema` (id, theme, cards[], brand) — 변경 없음
- `renderCardNews(spec)` 호출, 결과 JSON을 stdout으로 출력
- 종료 시 `closeBrowser()` 호출
- 비제로 exit code on error

## 스킬 책임

| 스킬 | 입력 | 동작 | 출력 |
|------|------|------|------|
| research | 주제 | WebSearch/WebFetch 자료수집 | 리서치 노트 |
| copy | 리서치 | 카피 작성 → schema+lint 게이트 | spec.json (cards) |
| image | spec | Playwright 키워드 크롤 → image_url; 실패→사용자 요청 | spec (image_url) |
| render | spec | `node dist/render-cli.js spec.json` | PNG 1080×1350 |
| notion | PNG+메타 | Notion MCP로 문서 DB 페이지 생성 | Notion page URL |
| review | Notion URL | Slack webhook(curl) 전송 → 하드 대기 | — |
| publish | Notion page | 검수상태=승인 확인 후 IG/Threads Graph API 캐러셀 발행 | 게시 URL |
| workflow | 주제 | 위 7개 순차 오케스트레이션 | 발행 완료 |

## Copy 스킬 — schema + lint 게이트

### schema
작성한 카피를 `RenderCardNewsInputSchema`로 검증한다.

### lint 규칙 (default 테마 기준, 사용자 조정 가능)
폰트 크기 기반 합리적 기본값:
- thumbnail `category` ≤ 10자
- thumbnail `title` ≤ 40자 (52px, 2~3줄)
- body `title` ≤ 30자 (41px)
- body `body` ≤ 200자 (20px)
- closing `tagline` ≤ 24자 (32px)
- closing `cta` ≤ 80자
- 구성: thumbnail 1개 필수 + body 1~N개 + closing 1개 필수
- 빈 title/body 금지

→ 통과 실패 시 render 단계로 진행 불가, 재작성 루프.

## 연동 인증 (혼합)

- Notion: 외부 Notion MCP (현 세션 연결됨)
- Slack: Incoming Webhook URL (`SLACK_WEBHOOK_URL` env), curl
- Instagram/Threads: Meta Graph API (`IG_*`, `THREADS_*` env), curl
  - 캐러셀 발행은 **공개 URL 필요** → 로컬 PNG는 S3 등 공개 스토리지 전환 후 가능

## 배포 / 설치

```
claude plugin marketplace add /Users/kimjunho/Develop/cardnews
claude plugin install card-news@cardnews
```

추후 git push 후 원격 marketplace로 확장.

## 검증

- `npm run build` (tsc) 통과
- render-cli e2e: 샘플 spec → 3장 PNG 생성
- `claude plugin validate .` 통과
