# card-news-mcp

> 🇺🇸 English docs: [README.md](./README.md)

텍스트와 배경 이미지를 넣으면 **인스타그램 스타일 정사각형 카드뉴스**(720×720 PNG)를
자동으로 만들어주는 **MCP(Model Context Protocol) 서버**입니다.
썸네일 → 본문 → 마지막장(팔로우 유도)까지, 테마만 고르면 바로 올릴 수 있는 이미지가 나옵니다.

Claude Desktop, Cursor 같은 MCP 클라이언트(AI 에이전트)에게
"카드뉴스 디자인" 능력을 붙여준다고 생각하면 됩니다.

## 무엇을 해주나요?

카드 목록(제목, 본문, 배경 이미지 URL)을 주면:

1. 고른 **테마**(색상·폰트·로고)를 HTML 템플릿에 채웁니다.
2. 헤드리스 브라우저(Playwright)로 각 카드를 선명한 **720×720 PNG**로 렌더링합니다.
3. 결과 이미지를 **로컬 파일 경로**, **원격 URL**, 또는 **base64** 중
   선택한 저장 방식으로 돌려줍니다.

디자인 지식 없이, AI가 카피를 쓰고 바로 올릴 수 있는 이미지를 받습니다.

## 카드 종류

| 종류 | 구성 |
|------|------|
| `thumbnail` | 꽉 찬 배경 이미지 + 브랜드 로고 + 카테고리 뱃지 + 큰 제목 |
| `body` | 배경 이미지 + 페이지 번호 + 제목 + 본문 + 브랜드 마크 |
| `closing` | 브랜드 워드마크 + 태그라인 + 후킹 문구 + 저장/좋아요/팔로우 아이콘 |

## 빠른 시작

### 1. MCP 클라이언트에 등록

**Claude Desktop** — `claude_desktop_config.json` 편집:

```json
{
  "mcpServers": {
    "card-news": {
      "command": "npx",
      "args": ["-y", "card-news-mcp"],
      "env": {
        "THEME": "default",
        "STORAGE_BACKEND": "local",
        "OUTPUT_DIR": "./card-news-out"
      }
    }
  }
}
```

클라이언트를 재시작하면 `render_card_news` 툴이 바로 활성화됩니다.

> 첫 실행 시 렌더링용 Chromium 브라우저(~170MB)를 한 번 내려받습니다.
> 시스템 브라우저를 재사용하려면 아래 [문제 해결](#문제-해결)을 참고하세요.

### 2. 에이전트에게 요청

> "이 배경 이미지들로 'GPT 프롬프트 가이드' 주제 4장짜리 인스타 캐러셀 만들어줘"

에이전트가 `render_card_news`를 호출하고, `./card-news-out`에 PNG 파일이 생성됩니다.

## `render_card_news` 툴

입력 형태:

```jsonc
{
  "id": "my-post",          // 선택. 출력 폴더 이름에 사용
  "theme": "default",       // 선택. 테마 이름 또는 경로 (THEME 환경변수보다 우선)
  "cards": [
    { "type": "thumbnail", "index": 0, "title": "…", "category": "NEWS", "image_url": "https://…" },
    { "type": "body", "index": 1, "page_number": 1, "title": "…", "body": "…", "image_url": "https://…" },
    { "type": "closing", "index": 2, "image_url": "https://…" }
  ],
  "brand": {                // 선택. 호출마다 테마 기본값 덮어쓰기
    "brand_name": "ACME",
    "tagline": "팔로우하고 더 보기",
    "cta": "<b>지금 팔로우</b>하세요",
    "primary_color": "#0573F0"
  }
}
```

출력:

```jsonc
{
  "id": "my-post",
  "theme": "default",
  "rendered_cards": [
    { "index": 0, "type": "thumbnail", "path": "/절대/경로/0_thumbnail.png", "base64": "data:image/png;base64,…" }
  ]
}
```

## 테마

기본 제공 테마 2종:

- **`default`** — 깔끔한 무채색(흑백). 중립적인 시작점.
- **`surfers`** — 예제 브랜드 테마 (블루 + 연블루 포인트).

`THEME` 환경변수로 고르거나, 호출마다 `theme` 필드로 지정합니다.

내 색상·폰트·로고로 만들고 싶다면 **[DESIGN.md](./DESIGN.md)** 를 보세요.
코드 없이 `theme.json` 하나와 HTML 3개로 몇 분이면 커스텀 테마를 만들 수 있습니다.

```json
{ "env": { "THEME_DIR": "/내/테마/경로" } }
```

## 저장 방식 (스토리지)

`STORAGE_BACKEND`로 선택:

| 값 | 동작 | 추가 설정 |
|----|------|-----------|
| `local` (기본) | `OUTPUT_DIR`에 PNG 저장 + base64도 반환 | 없음 |
| `base64` | base64 data URI만 반환 (파일 저장 안 함) | 없음 |
| `supabase` | Supabase Storage 업로드 → 공개 URL 반환 | `npm i @supabase/supabase-js`, `SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY` 설정 |
| `s3` | S3 / Cloudflare R2 업로드 | `npm i @aws-sdk/client-s3`, `S3_*` 변수 설정 |

## 환경변수 정리

| 변수 | 기본값 | 용도 |
|------|--------|------|
| `THEME` | `default` | 번들 테마 이름 |
| `THEME_DIR` | — | 외부 커스텀 테마 경로 |
| `STORAGE_BACKEND` | `local` | `base64` / `local` / `supabase` / `s3` |
| `OUTPUT_DIR` | `./card-news-out` | `local` 저장 위치 |
| `MCP_TRANSPORT` | `stdio` | `stdio`(기본) 또는 `http` |
| `PORT` | `3000` | HTTP 트랜스포트 포트 |

## HTTP 서버로 실행 (선택)

대부분은 기본값 stdio면 충분합니다. 원격/자체 호스팅이 필요하면:

```bash
MCP_TRANSPORT=http npx card-news-mcp
# → http://localhost:3000/mcp
```

## 문제 해결

- **Chromium 다운로드가 크거나 막힘.** 설치 시 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`을
  설정하고, 기존 Chrome/Chromium을 Playwright가 쓰도록 지정하세요.
- **한글/CJK 글자가 깨짐.** 테마는 Pretendard 웹폰트를 불러옵니다. 첫 렌더링 시
  인터넷 연결이 되어 있는지 확인하거나, 테마에 로컬 폰트를 포함하세요.

## Hermes 에이전트 연동

Hermes 에이전트(또는 MCP 설정을 직접 관리하는 에이전트)로 돌린다면 아래 프롬프트를 복사해서 쓰세요.

### 1. MCP 설치 / 등록 프롬프트

> `card-news`라는 이름으로 MCP 서버를 새로 등록해줘.
> - 트랜스포트: **stdio** — 커맨드 `npx`, args `["-y", "card-news-mcp"]`.
>   (네트워크로 자체 호스팅한다면 `MCP_TRANSPORT=http npx card-news-mcp`로 띄우고
>   URL `http://<host>:3000/mcp`를 등록해.)
> - 환경변수: `THEME=default`, `STORAGE_BACKEND=local`, `OUTPUT_DIR=./card-news-out`.
>   (공개 URL이 필요하면 `STORAGE_BACKEND=supabase` 또는 `s3`와 해당 키를 설정.)
> - 등록 후 툴 목록을 출력하고 `render_card_news`가 있는지 확인해줘.

### 2. 카드뉴스 제작 프롬프트

> **{{주제}}** 에 대한 {{N}}장짜리 인스타 캐러셀을 `render_card_news`를 호출해서 만들어줘.
> - 0번 카드 = `thumbnail` (카테고리 뱃지 + 임팩트 있는 제목).
> - 1 ~ N-2번 카드 = `body` (카드마다 핵심 포인트 하나씩, `page_number` 포함).
> - 마지막 카드 = `closing` (팔로우 / 저장 유도 CTA).
> - 카피는 네가 직접 작성하고, 제목은 짧게 본문은 한눈에 읽히게.
> - 배경 이미지: {{이미지 URL들 또는 "어울리는 스톡 이미지를 골라"}}.
> - 테마: `{{default | surfers | 내-테마}}`.
> 각 카드의 저장 경로(또는 URL)를 돌려줘.

## 개발

```bash
npm install
npm run typecheck
npm run test:render default   # 샘플 카드를 ./card-news-out 에 렌더링
npm run build
```

## 라이선스

[MIT](./LICENSE)
