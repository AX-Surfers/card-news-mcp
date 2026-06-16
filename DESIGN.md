# Theme Guide / 테마 제작 가이드

Make card news look like *your* brand. A theme is just **one JSON file + three HTML
files + a few logo SVGs** in a folder. No build step, no code.

당신의 브랜드처럼 보이게 만드세요. 테마는 폴더 하나에 **JSON 1개 + HTML 3개 + 로고 SVG
몇 개**가 전부입니다. 빌드도, 코드도 필요 없습니다.

---

## Folder structure / 폴더 구조

```
my-theme/
├── theme.json          # colors, fonts, brand name, asset paths
├── thumbnail.html      # 1st card template
├── body.html           # body page template
├── closing.html        # last card template
└── assets/
    ├── logo-icon.svg       # small logo mark (shown on thumbnail/body)
    ├── logo-wordmark.svg   # full wordmark (shown on closing card)
    └── brand-image.svg     # white/light wordmark for dark cards
```

Register it: set `THEME_DIR=/path/to/my-theme`, or pass `"theme": "/path/to/my-theme"`
in the tool call.

등록: `THEME_DIR=/내/테마/경로` 환경변수를 쓰거나, 툴 호출에서
`"theme": "/내/테마/경로"` 로 지정하세요.

---

## theme.json

```json
{
  "name": "my-theme",
  "primary_color": "#0573F0",
  "accent_color": "#DCEEFF",
  "ink_color": "#1B1D1F",
  "closing_tint": "rgba(220,238,255,0.95)",
  "font": "Pretendard",
  "brand_name": "MY BRAND",
  "logo_icon": "assets/logo-icon.svg",
  "wordmark": "assets/logo-wordmark.svg",
  "brand_image": "assets/brand-image.svg"
}
```

| Field | 설명 / Meaning |
|-------|----------------|
| `primary_color` | 강조색. 카테고리/페이지 뱃지, 아이콘 등 / Main accent (badges, icons) |
| `accent_color` | 보조 강조색. 제목 밑줄 등 / Secondary accent (underlines) |
| `ink_color` | 라이트 카드의 본문 글자색 / Text color on light cards |
| `closing_tint` | 마지막 카드 오버레이 색 (rgba 권장) / Closing card overlay tint |
| `font` | 폰트 패밀리 이름 / Font family name |
| `brand_name` | 로고 없을 때 대체 텍스트 / Fallback brand text |
| `logo_icon`, `wordmark`, `brand_image` | 에셋 상대 경로 / Relative asset paths |

---

## Template placeholders / 템플릿 플레이스홀더

Templates use [Handlebars](https://handlebarsjs.com/). These variables are available
(theme values + per-card content + per-call `brand` overrides are merged in):

템플릿은 Handlebars 문법을 씁니다. 아래 변수들을 쓸 수 있습니다
(테마 값 + 카드별 내용 + 호출별 `brand` 오버라이드가 합쳐집니다):

**All cards / 공통**
`{{primary_color}}` `{{accent_color}}` `{{ink_color}}` `{{font}}`
`{{brand_name}}` `{{logo_url}}` `{{wordmark_url}}` `{{brand_image}}` `{{image_url}}`

**thumbnail** — `{{title}}`, `{{category}}`
**body** — `{{title}}`, `{{body}}`, `{{page_number}}`, `{{total_pages}}`
**closing** — `{{tagline}}`, `{{{cta}}}` (triple-stache: allows `<b>` HTML), `{{closing_tint}}`

> Tip: every card is rendered at exactly **720×720 px**. Set
> `body { width:720px; height:720px; }` and design within that box.
>
> 팁: 모든 카드는 정확히 **720×720px**로 렌더링됩니다.
> `body { width:720px; height:720px; }`로 두고 그 안에서 디자인하세요.

The fastest way to start: **copy the `themes/default` folder**, rename it, and tweak
the colors and HTML.

가장 빠른 시작법: **`themes/default` 폴더를 복사**해서 이름을 바꾸고
색상과 HTML만 손보세요.

---

## Assets / 에셋

- SVG recommended (crisp at any size). PNG also works via data URI in `theme.json`
  paths… but stick to SVG for logos.
- `brand_image` should be a **light/white** version of your wordmark, since it sits on
  dark photo cards (thumbnail/body).
- `wordmark` sits on the light closing card, so use your **normal colored** version.

- SVG 권장(어떤 크기에서도 선명). 로고는 SVG로 두세요.
- `brand_image`는 어두운 사진 카드(썸네일/본문) 위에 올라가므로 **밝은/흰색** 워드마크로.
- `wordmark`는 밝은 마지막 카드에 올라가므로 **원래 컬러** 버전으로.

---

## Example: the bundled `surfers` theme

See `themes/surfers/` for a complete, real-world example (blue brand, Pretendard font,
custom waves logo). Diff it against `themes/default/` to see exactly what changes.

`themes/surfers/`에 완성된 실제 예제가 있습니다(블루 브랜드, Pretendard, 물결 로고).
`themes/default/`와 비교해보면 무엇이 바뀌는지 한눈에 보입니다.
