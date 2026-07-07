# card-news

> 🇺🇸 English docs: [README.md](./README.md)

주제 선정부터 인스타그램·스레드 발행까지, **인스타 카드뉴스**(1080×1350 PNG) 제작 전
과정을 자동화하는 **Claude Code 플러그인**입니다. 파이프라인 전체를 **조합 가능한
스킬**로 제공해서, 한 번에 끝까지 돌리거나 단계별로 나눠 쓸 수 있습니다.

**SURFERS**(AI·AX 오프라인 교육) 전용으로 만들어졌습니다 — 기본 흐름은 AI/LLM 주제를
고르고, 비개발자용 쉬운 한국어 카피를 쓰고, SURFERS 브랜드 테마로 렌더링하고, 팀 위키에
아카이브한 뒤 자동 발행합니다. 테마와 소스만 바꾸면 다른 브랜드로 전환할 수 있습니다.

## 파이프라인

| # | 스킬 | 하는 일 | 게이트 |
|---|------|---------|--------|
| 1 | *(주제 선정)* | `news.hada.io/rss/news` 크롤 → 가장 화제성 높은 온-브랜드 항목 선택 | — |
| 2 | `cardnews-research` | 원문 + 링크된 출처 → 핵심 메시지·키포인트·훅·갭 | — |
| 3 | `cardnews-copy` | 렌더 스펙(`spec.json`) 작성 | **스키마 + 글자수 lint** |
| 4 | `cardnews-image` | 카드별 이미지: **①** 주제 원문/링크, **②** 구글/Unsplash 크롤 | 실패 → 사용자에게 요청 |
| 5 | `cardnews-render` | 1080×1350 PNG 로컬 렌더(Playwright), **surfers** 테마 | 렌더러 빌드 + Chromium |
| 6 | `cardnews-wiki` | 노트 + PNG를 `llm-wiki` git 저장소에 아카이브·push | 저장소 접근 가능 |
| 7 | `cardnews-autopublish` | 로컬 발행 런타임으로 인스타 + 스레드 캐러셀 발행 | **승인 매니페스트** |
| — | `cardnews-workflow` | 1~7단계 전체 오케스트레이션 | — |

**선택 / 독립 실행**
- `cardnews-review` — 슬랙 사인오프 → `cardnews-autopublish`가 요구하는 승인
  매니페스트 작성. 기본 체인에는 없음.
- `cardnews-notion` — 레거시 Notion 저장(현재는 `cardnews-wiki`로 대체).

전체는 **`cardnews-workflow`**로 돌리고, 개별 스킬만 호출해 나만의 흐름을 만들 수도
있습니다: 렌더만, 카피+렌더, 발행 없이 아카이브만 등.

## 설치

```bash
claude plugin marketplace add https://github.com/AX-Surfers/card-news-mcp
claude plugin install card-news@cardnews
```

(로컬 개발 시엔 `claude plugin marketplace add /이/저장소/경로`.)

### 렌더러 준비 (최초 1회)

렌더 단계는 번들된 Playwright 렌더러를 씁니다. 빌드 + Chromium 설치:

```bash
cd <plugin-root> && npm install && npm run build && npx playwright install chromium
```

## 렌더러 (`render-cli`)

렌더 단계는 스펙 JSON을 PNG로 바꾸는 작은 CLI를 호출합니다:

```bash
node dist/render-cli.js <spec.json> [--out <dir>]
```

입력 스펙 형태:

```jsonc
{
  "id": "my-post",          // 선택, 출력 폴더 이름
  "theme": "surfers",       // 선택, 테마 이름 또는 경로
  "cards": [
    { "type": "thumbnail", "index": 0, "title": "…", "category": "NEWS", "image_url": "https://…" },
    { "type": "body", "index": 1, "page_number": 1, "title": "…", "body": "…", "image_url": "https://…" },
    { "type": "closing", "index": 2, "tagline": "…", "cta": "…", "image_url": "https://…" }
  ],
  "brand": {                // 선택, 호출 단위로 테마 기본값 오버라이드
    "brand_name": "SURFERS",
    "tagline": "Follow for more",
    "cta": "지금 <b>팔로우</b>",
    "primary_color": "#0573F0"
  }
}
```

출력(stdout JSON):

```jsonc
{
  "id": "my-post",
  "theme": "surfers",
  "rendered_cards": [
    { "index": 0, "type": "thumbnail", "path": "/abs/path/0_thumbnail.png", "base64": "data:image/png;base64,…" }
  ]
}
```

### 카드 타입

| 타입 | 구성 |
|------|------|
| `thumbnail` | 풀블리드 배경 이미지, 브랜드 로고, 카테고리 뱃지, 큰 제목 |
| `body` | 배경 이미지, 페이지 번호 뱃지, 헤딩, 본문, 브랜드 마크 |
| `closing` | 브랜드 워드마크, 태그라인, 행동 유도, 저장/좋아요/팔로우 아이콘 |

### 카피 lint (스키마 게이트)

`cardnews-copy`는 모든 카드가 통과해야 스펙을 내보냅니다(기본 테마 기준, 테마별 조정 가능):

| 규칙 | 한도 |
|------|------|
| `thumbnail` 1개(맨앞) + `closing` 1개(맨뒤) | 필수 |
| `body` 카드 | 1~N개 |
| thumbnail `category` / `title` | ≤ 10 / ≤ 40자 |
| body `title` / `body` | ≤ 30 / ≤ 200자 |
| closing `tagline` / `cta` | ≤ 24 / ≤ 80자 |
| 모든 title/body | 비어있으면 안 됨 |

## 테마

기본 포함 테마 2종:

- **`surfers`** — SURFERS 브랜드 테마(블루 `#0573F0`, Pretendard). 기본 파이프라인이 사용.
- **`default`** — 무채색 그레이스케일. 중립 시작점.

`spec.theme`, `THEME` 환경변수, 또는 `THEME_DIR` 경로로 선택합니다.

내 색상·폰트·로고를 쓰고 싶다면 **[DESIGN.md](./DESIGN.md)** 참고 — 커스텀 테마는
`theme.json` + HTML 3개 + SVG 몇 개면 끝, 코드 불필요.

```bash
THEME_DIR=/path/to/my-theme
```

## 저장 백엔드

렌더 출력 위치, `STORAGE_BACKEND`로 선택:

| 값 | 동작 | 추가 설정 |
|----|------|-----------|
| `local` (기본) | `OUTPUT_DIR`에 PNG 저장, base64도 반환 | 없음 |
| `base64` | base64 data URI만 반환(파일 없음) | 없음 |
| `supabase` | Supabase Storage 업로드, 공개 URL 반환 | `npm i @supabase/supabase-js`, `SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY` |
| `s3` | S3 / Cloudflare R2 업로드, 공개 URL 반환 | `npm i @aws-sdk/client-s3`, `S3_*` |

> **발행에 공개 렌더 백엔드는 불필요.** `cardnews-autopublish`가 발행 시점에 PNG를
> 공개 Google Drive URL로 업로드하므로 `local` 출력이면 충분합니다. (IG/스레드는 공개
> URL에서만 이미지를 가져갑니다.)

## 렌더러 환경변수

| 변수 | 기본 | 용도 |
|------|------|------|
| `THEME` | `default` | 번들 테마 이름(파이프라인은 `surfers`) |
| `THEME_DIR` | — | 외부 커스텀 테마 경로 |
| `STORAGE_BACKEND` | `local` | `base64` / `local` / `supabase` / `s3` |
| `OUTPUT_DIR` | `./card-news-out` | `local` 저장 위치 |

## 발행 런타임 (`cardnews-autopublish`)

발행은 자체 완결된 런타임의 로컬 스크립트로 실행됩니다 — **hermes·docker·Notion 없음**:

```
~/.local/share/cardnews/     (재배치는 $CARDNEWS_DATA_ROOT)
├── .env / .secrets/         토큰 (600/700, gitignore, 절대 출력 안 함)
├── scripts/                 패치된 발행 스크립트
├── work/                    스크래치 (PNG, URL 목록, 결과)
└── run_publish.sh           .env 로드 → verify / upload-public / publish
```

- **자격증명**(이름만; 값은 `.env`/`.secrets`에 있고 절대 출력하지 않음):
  `INSTAGRAM_GRAPH_TOKEN`(또는 `META_GRAPH_ACCESS_TOKEN`) +
  `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `THREADS_ACCESS_TOKEN` + `THREADS_USER_ID`,
  `GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE`, `GOOGLE_DRIVE_PARENT_ID`(**공유 드라이브**여야
  함 — 서비스 계정은 개인 드라이브 용량이 0).
- **승인 게이트.** `approval.json` 매니페스트가
  `{ "approved": true, "approval_source": "...", "approved_at": "..." }`를 단언하지
  않으면 발행이 차단됩니다. 승인을 날조하지 말 것 — 명시적 승인을 받은 뒤 매니페스트를
  작성(또는 `cardnews-review`의 슬랙 사인오프로 생성).
- **한 플랫폼 또는 둘 다.** `--platform {both,instagram,threads}`(기본 `both`).

## 위키 아카이브 (`cardnews-wiki`)

모든 산출물은 팀 `llm-wiki` git 저장소(`~/Develop/llm-wiki`, 리모트
`AX-Surfers/marketing-llm-wiki`, `main`)의 `01-콘텐츠마케팅/카드뉴스/<id>/` 아래
Obsidian 노트(`## 관련` MOC 링크) + PNG로 아카이브되고 commit·push 됩니다. 제작
콘텐츠의 영구 보관소이며, 기존 Notion 저장을 대체합니다.

## 문제 해결

- **Chromium 다운로드가 크거나 막힘.** 설치 시 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`
  설정하고 기존 Chrome/Chromium을 Playwright에 지정.
- **한글/CJK가 깨짐.** 테마는 Pretendard 웹폰트를 로드 — 첫 렌더 시 인터넷 연결을
  확인하거나 테마에 로컬 폰트를 번들.
- **Google Drive 업로드 403.** `GOOGLE_DRIVE_PARENT_ID`는 My Drive가 아니라 서비스
  계정이 속한 공유 드라이브여야 함.

## 개발

```bash
npm install
npm run typecheck
npm run test:render surfers   # 샘플 카드를 ./card-news-out에 렌더
npm run build
node dist/render-cli.js spec.json --out ./card-news-out
```

## 라이선스

[MIT](./LICENSE)
