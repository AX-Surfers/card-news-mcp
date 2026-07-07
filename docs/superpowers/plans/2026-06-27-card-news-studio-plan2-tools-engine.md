# Card News Studio — Plan 2: Tools & Execution Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 자료조사(3종)·렌더링·업로드 기능 구현 + 워크플로우 실행 엔진(SSE 스트리밍) + MCP 툴 전체 등록

**Architecture:** 각 기능은 `packages/server/src/features/*` 순수 함수로 구현. MCP 툴(`mcp/tools.ts`)과 실행 엔진(`engine/run.ts`)이 동일 함수를 공유. 실행 엔진은 워크플로우 steps를 순서대로 dispatch하고 SSE로 진행상황 전송.

**Tech Stack:** cheerio(HTML 파싱), rss-parser(RSS), Tavily API(옵션 웹검색), card-news-mcp renderCardNews, Meta Graph/Threads API(fetch)

## Global Constraints

- Plan 1 제약 전부 상속 (Node ≥22, ESM, strict, node:test)
- 새 의존성: `cheerio`, `rss-parser`
- 웹검색: `TAVILY_API_KEY` 환경변수 — 미설정 시 명확한 에러
- 렌더링 결과 저장: card-news-mcp의 `createStorage`(STORAGE_BACKEND=local, OUTPUT_DIR=dataDir/files) 위임
- 업로드 API Key: settings 테이블에서 로드 (`meta_access_token`, `threads_access_token` 등)

---

## File Map

```
packages/server/src/
├── features/
│   ├── research.ts        ← researchUrl, researchRss, researchWeb
│   ├── render.ts          ← renderCards (renderCardNews 래핑 + DB 저장)
│   └── publish.ts         ← publishToMeta, publishToThreads
├── db/
│   └── settings.ts        ← getSetting, setSetting
├── engine/
│   └── run.ts             ← runWorkflow (async generator → SSE 이벤트)
├── routes/
│   ├── run.ts             ← POST /api/workflows/:id/run (SSE)
│   ├── settings.ts        ← GET/PUT /api/settings
│   └── render.ts          ← POST /api/render (수동 렌더)
└── mcp/tools.ts           ← 툴 8개로 확장
```

---

## Task 1: 의존성 + settings DB

**Files:**
- Modify: `packages/server/package.json` — cheerio, rss-parser 추가
- Create: `packages/server/src/db/settings.ts`

**Interfaces:**
- Produces: `getSetting(db, key): string | null`, `setSetting(db, key, value): void`, `getAllSettings(db): Record<string,string>`

- [ ] **Step 1: 의존성 추가**

```bash
cd /Users/kimjunho/Develop/card-news-studio
pnpm --filter @card-news-studio/server add cheerio rss-parser
```

- [ ] **Step 2: db/settings.ts 작성**

```typescript
import type Database from "better-sqlite3";

export function getSetting(db: Database.Database, key: string): string | null {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export function setSetting(db: Database.Database, key: string, value: string): void {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

export function getAllSettings(db: Database.Database): Record<string, string> {
  const rows = db.prepare("SELECT key, value FROM settings").all() as Array<{
    key: string;
    value: string;
  }>;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
```

- [ ] **Step 3: settings 테스트**

`packages/server/src/db/settings.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDb, migrateDb } from "./client.js";
import { getSetting, setSetting, getAllSettings } from "./settings.js";

test("settings upsert", () => {
  const db = getDb(join(tmpdir(), `cns-test-${Date.now()}`));
  migrateDb(db);

  assert.equal(getSetting(db, "k"), null);
  setSetting(db, "k", "v1");
  assert.equal(getSetting(db, "k"), "v1");
  setSetting(db, "k", "v2");
  assert.equal(getSetting(db, "k"), "v2");
  assert.deepEqual(getAllSettings(db), { k: "v2" });

  db.close();
});
```

- [ ] **Step 4: 빌드 + 테스트**

```bash
pnpm --filter @card-news-studio/server build
node --test packages/server/dist/db/settings.test.js
```

Expected: 1 test pass.

- [ ] **Step 5: Commit**

```bash
git add packages/server/
git commit -m "feat: settings DB layer + cheerio/rss-parser deps"
```

---

## Task 2: 자료조사 기능

**Files:**
- Create: `packages/server/src/features/research.ts`

**Interfaces:**
- Produces:
  - `researchUrl(url: string): Promise<{ content: string }>` — fetch + cheerio로 본문 텍스트 추출
  - `researchRss(rssUrl: string): Promise<{ items: Array<{ title: string; link: string; snippet: string }> }>`
  - `researchWeb(query: string, apiKey: string | null): Promise<{ content: string }>` — Tavily, 키 없으면 throw

- [ ] **Step 1: features/research.ts 작성**

```typescript
import * as cheerio from "cheerio";
import Parser from "rss-parser";

export async function researchUrl(url: string): Promise<{ content: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "card-news-studio/0.1 (+research)" },
  });
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return { content: text.slice(0, 20000) };
}

const rssParser = new Parser();

export async function researchRss(
  rssUrl: string
): Promise<{ items: Array<{ title: string; link: string; snippet: string }> }> {
  const feed = await rssParser.parseURL(rssUrl);
  const items = (feed.items ?? []).slice(0, 20).map((it) => ({
    title: it.title ?? "",
    link: it.link ?? "",
    snippet: (it.contentSnippet ?? it.content ?? "").slice(0, 500),
  }));
  return { items };
}

export async function researchWeb(
  query: string,
  apiKey: string | null
): Promise<{ content: string }> {
  if (!apiKey) {
    throw new Error(
      "웹검색에는 TAVILY_API_KEY가 필요합니다. 설정에서 추가하거나 환경변수로 지정하세요."
    );
  }
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 5,
      include_answer: true,
    }),
  });
  if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);
  const data = (await res.json()) as {
    answer?: string;
    results?: Array<{ title: string; url: string; content: string }>;
  };
  const parts: string[] = [];
  if (data.answer) parts.push(`요약: ${data.answer}`);
  for (const r of data.results ?? []) {
    parts.push(`## ${r.title}\n${r.url}\n${r.content}`);
  }
  return { content: parts.join("\n\n") };
}
```

- [ ] **Step 2: research 테스트 (RSS만 — 네트워크 의존 최소화)**

`packages/server/src/features/research.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { researchWeb } from "./research.js";

test("researchWeb without key throws", async () => {
  await assert.rejects(
    () => researchWeb("test", null),
    /TAVILY_API_KEY/
  );
});
```

> URL/RSS는 실제 네트워크 필요 → 단위테스트 제외. 통합검증은 수동.

- [ ] **Step 3: 빌드 + 테스트**

```bash
pnpm --filter @card-news-studio/server build
node --test packages/server/dist/features/research.test.js
```

Expected: 1 test pass.

- [ ] **Step 4: Commit**

```bash
git add packages/server/
git commit -m "feat: research feature — url crawl, rss, tavily web search"
```

---

## Task 3: 렌더링 기능

**Files:**
- Create: `packages/server/src/features/render.ts`

**Interfaces:**
- Consumes: `renderCardNews` from `@card-news-studio/renderer`, `createCardNews` (Plan 1)
- Produces:
  - `type CardInput = { type: "thumbnail"|"body"|"closing"; index: number; title?: string; body?: string; image_url?: string; page_number?: number; category?: string }`
  - `renderCards(db, dataDir, opts: { cards: CardInput[]; theme?: string; brand?: Record<string,unknown>; title?: string; workflow_id?: string }): Promise<{ card_news_id: string; image_paths: string[] }>`

- [ ] **Step 1: features/render.ts 작성**

> 주의: `renderCardNews`는 `OUTPUT_DIR`/`STORAGE_BACKEND` 환경변수로 저장 위치 결정. dataDir/files로 설정.

```typescript
import { renderCardNews } from "@card-news-studio/renderer";
import type Database from "better-sqlite3";
import { join } from "node:path";
import { createCardNews } from "../db/card-news.js";

export interface CardInput {
  type: "thumbnail" | "body" | "closing";
  index: number;
  title?: string;
  body?: string;
  image_url?: string;
  page_number?: number;
  category?: string;
}

export async function renderCards(
  db: Database.Database,
  dataDir: string,
  opts: {
    cards: CardInput[];
    theme?: string;
    brand?: Record<string, unknown>;
    title?: string;
    workflow_id?: string;
  }
): Promise<{ card_news_id: string; image_paths: string[] }> {
  process.env.STORAGE_BACKEND ??= "local";
  process.env.OUTPUT_DIR ??= join(dataDir, "files");

  const result = await renderCardNews({
    cards: opts.cards as any,
    theme: opts.theme,
    brand: opts.brand as any,
  });

  const image_paths = result.rendered_cards
    .sort((a, b) => a.index - b.index)
    .map((rc) => (rc as { path?: string; url?: string }).path ?? (rc as any).url ?? "");

  const cn = createCardNews(db, {
    workflow_id: opts.workflow_id,
    title: opts.title,
    cards: opts.cards,
    image_paths,
    status: "done",
  });

  return { card_news_id: cn.id, image_paths };
}
```

- [ ] **Step 2: StorageResult 형태 확인**

```bash
cat /Users/kimjunho/Develop/cardnews/src/storage/index.ts | head -40
```

Expected: `StorageResult`에 `path` 또는 `url` 필드 존재 확인. local backend는 `path` 반환할 것. 다르면 Step 1의 매핑 수정.

- [ ] **Step 3: 빌드**

```bash
pnpm --filter @card-news-studio/server build
```

Expected: no TS errors.

- [ ] **Step 4: Commit**

```bash
git add packages/server/
git commit -m "feat: render feature — wrap renderCardNews + persist card_news"
```

---

## Task 4: 업로드 기능

**Files:**
- Create: `packages/server/src/features/publish.ts`

**Interfaces:**
- Produces:
  - `publishToThreads(token: string, userId: string, imageUrls: string[], caption: string): Promise<{ url: string }>`
  - `publishToMeta(token: string, igUserId: string, imageUrls: string[], caption: string): Promise<{ url: string }>`

> 주의: Meta/Threads는 공개 접근 가능한 이미지 URL 필요. local path는 업로드 불가 → 이 함수는 image_url이 http(s)인 경우만 동작. 로컬 저장 시 사용자가 S3/R2 스토리지로 전환하거나 수동 업로드해야 함. caption에 명시.

- [ ] **Step 1: features/publish.ts 작성**

```typescript
// Threads API: https://developers.facebook.com/docs/threads
export async function publishToThreads(
  token: string,
  userId: string,
  imageUrls: string[],
  caption: string
): Promise<{ url: string }> {
  if (imageUrls.length === 0) throw new Error("no images to publish");

  // 단일 이미지 또는 캐러셀
  const creationIds: string[] = [];
  for (const imageUrl of imageUrls) {
    if (!imageUrl.startsWith("http")) {
      throw new Error(
        `Threads 업로드는 공개 이미지 URL이 필요합니다 (현재: ${imageUrl}). S3/R2 스토리지로 전환하세요.`
      );
    }
    const isCarousel = imageUrls.length > 1;
    const params = new URLSearchParams({
      image_url: imageUrl,
      media_type: "IMAGE",
      access_token: token,
      ...(isCarousel ? { is_carousel_item: "true" } : { text: caption }),
    });
    const res = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads?${params}`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error(`Threads media create failed: ${res.status} ${await res.text()}`);
    const { id } = (await res.json()) as { id: string };
    creationIds.push(id);
  }

  let publishId: string;
  if (creationIds.length === 1) {
    publishId = creationIds[0];
  } else {
    // 캐러셀 컨테이너
    const params = new URLSearchParams({
      media_type: "CAROUSEL",
      children: creationIds.join(","),
      text: caption,
      access_token: token,
    });
    const res = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads?${params}`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error(`Threads carousel create failed: ${res.status}`);
    publishId = ((await res.json()) as { id: string }).id;
  }

  const pubParams = new URLSearchParams({
    creation_id: publishId,
    access_token: token,
  });
  const pubRes = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads_publish?${pubParams}`,
    { method: "POST" }
  );
  if (!pubRes.ok) throw new Error(`Threads publish failed: ${pubRes.status} ${await pubRes.text()}`);
  const { id } = (await pubRes.json()) as { id: string };
  return { url: `https://www.threads.net/post/${id}` };
}

// Meta Instagram Graph API
export async function publishToMeta(
  token: string,
  igUserId: string,
  imageUrls: string[],
  caption: string
): Promise<{ url: string }> {
  if (imageUrls.length === 0) throw new Error("no images to publish");

  const childIds: string[] = [];
  const single = imageUrls.length === 1;
  for (const imageUrl of imageUrls) {
    if (!imageUrl.startsWith("http")) {
      throw new Error(
        `Instagram 업로드는 공개 이미지 URL이 필요합니다 (현재: ${imageUrl}). S3/R2 스토리지로 전환하세요.`
      );
    }
    const params = new URLSearchParams({
      image_url: imageUrl,
      access_token: token,
      ...(single ? { caption } : { is_carousel_item: "true" }),
    });
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media?${params}`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error(`Meta media create failed: ${res.status} ${await res.text()}`);
    childIds.push(((await res.json()) as { id: string }).id);
  }

  let containerId: string;
  if (single) {
    containerId = childIds[0];
  } else {
    const params = new URLSearchParams({
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption,
      access_token: token,
    });
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media?${params}`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error(`Meta carousel create failed: ${res.status}`);
    containerId = ((await res.json()) as { id: string }).id;
  }

  const pubParams = new URLSearchParams({
    creation_id: containerId,
    access_token: token,
  });
  const pubRes = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}/media_publish?${pubParams}`,
    { method: "POST" }
  );
  if (!pubRes.ok) throw new Error(`Meta publish failed: ${pubRes.status} ${await pubRes.text()}`);
  const { id } = (await pubRes.json()) as { id: string };
  return { url: `https://www.instagram.com/p/${id}` };
}
```

- [ ] **Step 2: 빌드**

```bash
pnpm --filter @card-news-studio/server build
```

Expected: no TS errors.

- [ ] **Step 3: Commit**

```bash
git add packages/server/
git commit -m "feat: publish feature — Meta Instagram + Threads carousel upload"
```

---

## Task 5: 실행 엔진 (async generator)

**Files:**
- Create: `packages/server/src/engine/run.ts`

**Interfaces:**
- Consumes: research/render features, `getWorkflow`, settings, `write_copy` 로직
- Produces:
  - `type RunEvent = { step: number; type: string; status: "start"|"done"|"error"; data?: unknown; error?: string }`
  - `async function* runWorkflow(db, dataDir, workflowId, input?: { document?: string }): AsyncGenerator<RunEvent>`

> 엔진 동작: enabled된 step만 순서대로 실행. research/document → `context` 누적. copy → LLM으로 카피 생성 후 cards 파싱. render → renderCards. publish → publishTo*. 각 step 전후 이벤트 yield.

- [ ] **Step 1: engine/run.ts 작성**

```typescript
import type Database from "better-sqlite3";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getWorkflow } from "../db/workflows.js";
import { getSetting } from "../db/settings.js";
import { researchUrl, researchRss, researchWeb } from "../features/research.js";
import { renderCards, type CardInput } from "../features/render.js";
import { publishToMeta, publishToThreads } from "../features/publish.js";
import { getCardNews } from "../db/card-news.js";

export interface RunEvent {
  step: number;
  type: string;
  status: "start" | "done" | "error";
  data?: unknown;
  error?: string;
}

export async function* runWorkflow(
  db: Database.Database,
  dataDir: string,
  workflowId: string,
  input?: { document?: string }
): AsyncGenerator<RunEvent> {
  const wf = getWorkflow(db, workflowId);
  if (!wf) throw new Error(`workflow ${workflowId} not found`);

  let context = input?.document ?? "";
  let cards: CardInput[] = [];
  let cardNewsId: string | null = null;

  const steps = wf.steps.filter((s) => s.enabled);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    yield { step: i, type: step.type, status: "start" };
    try {
      switch (step.type) {
        case "research_web": {
          const key =
            getSetting(db, "tavily_api_key") ?? process.env.TAVILY_API_KEY ?? null;
          const r = await researchWeb(step.config.query, key);
          context += "\n\n" + r.content;
          yield { step: i, type: step.type, status: "done", data: { length: r.content.length } };
          break;
        }
        case "research_url": {
          const r = await researchUrl(step.config.url);
          context += "\n\n" + r.content;
          yield { step: i, type: step.type, status: "done", data: { length: r.content.length } };
          break;
        }
        case "research_rss": {
          const r = await researchRss(step.config.rss_url);
          context += "\n\n" + JSON.stringify(r.items);
          yield { step: i, type: step.type, status: "done", data: { count: r.items.length } };
          break;
        }
        case "document": {
          // config.file_path는 미리 업로드된 파일 — 단순화: context에 이미 input.document로 주입됨
          yield { step: i, type: step.type, status: "done" };
          break;
        }
        case "copy": {
          const prompt = [
            step.config.system_prompt,
            step.config.rules ? `\n\n규칙:\n${step.config.rules}` : "",
            `\n\n출력은 반드시 JSON 배열. 각 원소: {type:"thumbnail"|"body"|"closing", index:number, title?:string, body?:string}. ${step.config.output_schema ?? ""}`,
            `\n\n소스:\n${context}`,
          ].join("");
          const { text } = await generateText({
            model: anthropic("claude-sonnet-4-6"),
            prompt,
          });
          cards = parseCards(text);
          yield { step: i, type: step.type, status: "done", data: { cards } };
          break;
        }
        case "render": {
          const r = await renderCards(db, dataDir, {
            cards,
            theme: step.config.template_id,
            brand: wf.brand ?? undefined,
            title: wf.name,
            workflow_id: wf.id,
          });
          cardNewsId = r.card_news_id;
          yield { step: i, type: step.type, status: "done", data: r };
          break;
        }
        case "publish": {
          if (!cardNewsId) throw new Error("publish 전에 render가 필요합니다");
          const cn = getCardNews(db, cardNewsId)!;
          const caption = cn.title ?? "";
          let result: { url: string };
          if (step.config.platform === "threads") {
            const token = getSetting(db, "threads_access_token");
            const userId = getSetting(db, "threads_user_id");
            if (!token || !userId) throw new Error("threads_access_token / threads_user_id 설정 필요");
            result = await publishToThreads(token, userId, cn.image_paths, caption);
          } else {
            const token = getSetting(db, "meta_access_token");
            const userId = getSetting(db, "meta_ig_user_id");
            if (!token || !userId) throw new Error("meta_access_token / meta_ig_user_id 설정 필요");
            result = await publishToMeta(token, userId, cn.image_paths, caption);
          }
          yield { step: i, type: step.type, status: "done", data: result };
          break;
        }
      }
    } catch (e) {
      yield { step: i, type: step.type, status: "error", error: String(e) };
      return;
    }
  }
}

function parseCards(text: string): CardInput[] {
  // ```json ... ``` 또는 raw JSON에서 배열 추출
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("카피 응답에서 JSON 배열을 찾지 못했습니다");
  const parsed = JSON.parse(match[0]) as CardInput[];
  return parsed;
}
```

- [ ] **Step 2: parseCards 테스트**

`packages/server/src/engine/run.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWorkflow } from "./run.js";
import { getDb, migrateDb } from "../db/client.js";
import { createWorkflow } from "../db/workflows.js";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("runWorkflow on empty steps yields nothing", async () => {
  const db = getDb(join(tmpdir(), `cns-test-${Date.now()}`));
  migrateDb(db);
  const wf = createWorkflow(db, { name: "empty", steps: [] });

  const events = [];
  for await (const ev of runWorkflow(db, tmpdir(), wf.id)) {
    events.push(ev);
  }
  assert.equal(events.length, 0);
  db.close();
});

test("runWorkflow research_web without key emits error event", async () => {
  const db = getDb(join(tmpdir(), `cns-test-${Date.now()}`));
  migrateDb(db);
  delete process.env.TAVILY_API_KEY;
  const wf = createWorkflow(db, {
    name: "web",
    steps: [{ type: "research_web", enabled: true, config: { query: "x" } }],
  });

  const events = [];
  for await (const ev of runWorkflow(db, tmpdir(), wf.id)) {
    events.push(ev);
  }
  assert.equal(events.at(-1)?.status, "error");
  assert.match(events.at(-1)?.error ?? "", /TAVILY_API_KEY/);
  db.close();
});
```

- [ ] **Step 3: 빌드 + 테스트**

```bash
pnpm --filter @card-news-studio/server build
node --test packages/server/dist/engine/run.test.js
```

Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/server/
git commit -m "feat: workflow execution engine — async generator dispatch with run events"
```

---

## Task 6: SSE 실행 라우트 + settings/render 라우트

**Files:**
- Create: `packages/server/src/routes/run.ts`
- Create: `packages/server/src/routes/settings.ts`
- Create: `packages/server/src/routes/render.ts`
- Modify: `packages/server/src/index.ts` — 라우트 등록

**Interfaces:**
- Produces:
  - `POST /api/workflows/:id/run` → SSE stream of RunEvent
  - `GET /api/settings` → Record<string,string> (토큰 마스킹)
  - `PUT /api/settings` → `{ ok: true }`
  - `POST /api/render` → `{ card_news_id, image_paths }`

- [ ] **Step 1: routes/run.ts 작성**

```typescript
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type Database from "better-sqlite3";
import { runWorkflow } from "../engine/run.js";

export function runRoutes(db: Database.Database, dataDir: string) {
  const app = new Hono();

  app.post("/:id/run", async (c) => {
    const id = c.req.param("id");
    let body: { document?: string } = {};
    try {
      body = await c.req.json();
    } catch {
      // body 없어도 됨
    }

    return streamSSE(c, async (stream) => {
      try {
        for await (const ev of runWorkflow(db, dataDir, id, body)) {
          await stream.writeSSE({ data: JSON.stringify(ev), event: "step" });
        }
        await stream.writeSSE({ data: "{}", event: "end" });
      } catch (e) {
        await stream.writeSSE({ data: JSON.stringify({ error: String(e) }), event: "error" });
      }
    });
  });

  return app;
}
```

- [ ] **Step 2: routes/settings.ts 작성**

```typescript
import { Hono } from "hono";
import type Database from "better-sqlite3";
import { getAllSettings, setSetting } from "../db/settings.js";

const SECRET_KEYS = [
  "tavily_api_key",
  "meta_access_token",
  "threads_access_token",
];

function mask(key: string, value: string): string {
  if (SECRET_KEYS.includes(key) && value.length > 4) {
    return value.slice(0, 4) + "****";
  }
  return value;
}

export function settingsRoutes(db: Database.Database) {
  const app = new Hono();

  app.get("/", (c) => {
    const all = getAllSettings(db);
    const masked = Object.fromEntries(
      Object.entries(all).map(([k, v]) => [k, mask(k, v)])
    );
    return c.json(masked);
  });

  app.put("/", async (c) => {
    const body = (await c.req.json()) as Record<string, string>;
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === "string" && !v.endsWith("****")) {
        setSetting(db, k, v);
      }
    }
    return c.json({ ok: true });
  });

  return app;
}
```

- [ ] **Step 3: routes/render.ts 작성**

```typescript
import { Hono } from "hono";
import type Database from "better-sqlite3";
import { renderCards, type CardInput } from "../features/render.js";

export function renderRoutes(db: Database.Database, dataDir: string) {
  const app = new Hono();

  app.post("/", async (c) => {
    const body = (await c.req.json()) as {
      cards: CardInput[];
      theme?: string;
      brand?: Record<string, unknown>;
      title?: string;
      workflow_id?: string;
    };
    try {
      const result = await renderCards(db, dataDir, body);
      return c.json(result);
    } catch (e) {
      return c.json({ error: String(e) }, 500);
    }
  });

  return app;
}
```

- [ ] **Step 4: index.ts에 라우트 등록**

`packages/server/src/index.ts`에서 import 추가:

```typescript
import { runRoutes } from "./routes/run.js";
import { settingsRoutes } from "./routes/settings.js";
import { renderRoutes } from "./routes/render.js";
```

`createApp` 내 `app.route("/api/card-news", ...)` 다음에 추가:

```typescript
  app.route("/api/workflows", runRoutes(db, dataDir)); // /:id/run (병합)
  app.route("/api/settings", settingsRoutes(db));
  app.route("/api/render", renderRoutes(db, dataDir));
```

> 주의: `runRoutes`의 `/:id/run`은 기존 `workflowRoutes`의 `/:id`와 다른 경로(`/:id/run`)이므로 동일 `/api/workflows` prefix에 두 라우터를 붙여도 충돌 없음. Hono는 등록 순서대로 매칭.

- [ ] **Step 5: SSE 라우트 테스트**

`packages/server/src/routes/run.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../index.js";

test("POST /api/workflows/:id/run streams SSE for empty workflow", async () => {
  const { app, db } = createApp(join(tmpdir(), `cns-test-${Date.now()}`));
  const createRes = await app.request("/api/workflows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "empty", steps: [] }),
  });
  const { id } = (await createRes.json()) as { id: string };

  const res = await app.request(`/api/workflows/${id}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /event: end/);
  db.close();
});
```

- [ ] **Step 6: 빌드 + 전체 테스트**

```bash
pnpm --filter @card-news-studio/server build
node --test $(find packages/server/dist -name '*.test.js' | tr '\n' ' ')
```

Expected: 모든 테스트 pass (Plan1 8 + settings 1 + research 1 + run 2 + sse 1 = 13).

- [ ] **Step 7: Commit**

```bash
git add packages/server/
git commit -m "feat: SSE run route + settings + manual render routes"
```

---

## Task 7: MCP 툴 전체 등록

**Files:**
- Modify: `packages/server/src/mcp/tools.ts`

**Interfaces:**
- Produces: MCP 툴 8개 — `get_workflow`, `research_web`, `research_url`, `research_rss`, `write_copy`, `list_templates`, `render_card_news`, `publish_card_news`

- [ ] **Step 1: mcp/tools.ts 확장**

기존 `buildTools`에 research/render/publish 툴 추가:

```typescript
import type Database from "better-sqlite3";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getWorkflow } from "../db/workflows.js";
import { getSetting } from "../db/settings.js";
import { researchUrl, researchRss, researchWeb } from "../features/research.js";
import { renderCards, type CardInput } from "../features/render.js";
import { getCardNews } from "../db/card-news.js";
import { publishToMeta, publishToThreads } from "../features/publish.js";

export interface ToolContext {
  db: Database.Database;
  dataDir: string;
}

type ToolResult = { content: Array<{ type: string; text: string }> };

interface ToolDef {
  description: string;
  inputSchema: object;
  handler: (args: any) => Promise<ToolResult>;
}

const ok = (obj: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(obj) }],
});

export function buildTools(ctx: ToolContext): Record<string, ToolDef> {
  const { db, dataDir } = ctx;
  return {
    get_workflow: {
      description: "워크플로우 정의(steps)를 가져온다",
      inputSchema: {
        type: "object",
        properties: { workflow_id: { type: "string" } },
        required: ["workflow_id"],
      },
      handler: async (a: { workflow_id: string }) => {
        const w = getWorkflow(db, a.workflow_id);
        if (!w) throw new Error(`workflow ${a.workflow_id} not found`);
        return ok(w.steps);
      },
    },

    research_web: {
      description: "자유 웹검색으로 자료를 수집한다 (Tavily)",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
      handler: async (a: { query: string }) => {
        const key = getSetting(db, "tavily_api_key") ?? process.env.TAVILY_API_KEY ?? null;
        return ok(await researchWeb(a.query, key));
      },
    },

    research_url: {
      description: "특정 URL 내용을 크롤링한다",
      inputSchema: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"],
      },
      handler: async (a: { url: string }) => ok(await researchUrl(a.url)),
    },

    research_rss: {
      description: "RSS 피드에서 최신 항목을 수집한다",
      inputSchema: {
        type: "object",
        properties: { rss_url: { type: "string" } },
        required: ["rss_url"],
      },
      handler: async (a: { rss_url: string }) => ok(await researchRss(a.rss_url)),
    },

    write_copy: {
      description: "소스 컨텐츠를 기반으로 카드뉴스 카피를 작성한다",
      inputSchema: {
        type: "object",
        properties: {
          source_content: { type: "string" },
          system_prompt: { type: "string" },
          output_schema: { type: "string" },
          rules: { type: "string" },
        },
        required: ["source_content", "system_prompt"],
      },
      handler: async (a: {
        source_content: string;
        system_prompt: string;
        output_schema?: string;
        rules?: string;
      }) => {
        const prompt = [
          a.system_prompt,
          a.rules ? `\n\n규칙:\n${a.rules}` : "",
          a.output_schema ? `\n\n출력 구조:\n${a.output_schema}` : "",
          `\n\n소스:\n${a.source_content}`,
        ].join("");
        const { text } = await generateText({
          model: anthropic("claude-sonnet-4-6"),
          prompt,
        });
        return ok({ text });
      },
    },

    list_templates: {
      description: "사용 가능한 템플릿 목록을 반환한다",
      inputSchema: { type: "object", properties: {}, required: [] },
      handler: async () => ok([{ id: "default", name: "Default" }]),
    },

    render_card_news: {
      description: "카피와 템플릿으로 카드뉴스 이미지를 렌더링한다",
      inputSchema: {
        type: "object",
        properties: {
          cards: { type: "array" },
          template_id: { type: "string" },
          brand: { type: "object" },
          title: { type: "string" },
        },
        required: ["cards"],
      },
      handler: async (a: {
        cards: CardInput[];
        template_id?: string;
        brand?: Record<string, unknown>;
        title?: string;
      }) =>
        ok(
          await renderCards(db, dataDir, {
            cards: a.cards,
            theme: a.template_id,
            brand: a.brand,
            title: a.title,
          })
        ),
    },

    publish_card_news: {
      description: "카드뉴스를 지정 플랫폼에 업로드한다",
      inputSchema: {
        type: "object",
        properties: {
          card_news_id: { type: "string" },
          platform: { type: "string", enum: ["meta", "threads"] },
        },
        required: ["card_news_id", "platform"],
      },
      handler: async (a: { card_news_id: string; platform: "meta" | "threads" }) => {
        const cn = getCardNews(db, a.card_news_id);
        if (!cn) throw new Error(`card_news ${a.card_news_id} not found`);
        const caption = cn.title ?? "";
        if (a.platform === "threads") {
          const token = getSetting(db, "threads_access_token");
          const userId = getSetting(db, "threads_user_id");
          if (!token || !userId) throw new Error("threads 설정 필요");
          return ok(await publishToThreads(token, userId, cn.image_paths, caption));
        }
        const token = getSetting(db, "meta_access_token");
        const userId = getSetting(db, "meta_ig_user_id");
        if (!token || !userId) throw new Error("meta 설정 필요");
        return ok(await publishToMeta(token, userId, cn.image_paths, caption));
      },
    },
  };
}
```

- [ ] **Step 2: 빌드 + MCP 테스트 (툴 개수 확장 반영)**

`packages/server/src/routes/mcp.test.ts`의 `tools/list` 테스트에 추가 검증:

```typescript
  assert.ok(names.includes("research_url"));
  assert.ok(names.includes("render_card_news"));
  assert.ok(names.includes("publish_card_news"));
```

```bash
pnpm --filter @card-news-studio/server build
node --test $(find packages/server/dist -name '*.test.js' | tr '\n' ' ')
```

Expected: 전체 pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/
git commit -m "feat: complete MCP tools — research, render, publish (8 tools)"
```

---

## Self-Review

| Spec 요구사항 | 구현 |
|--------------|------|
| 자료조사 3방식 | Task 2 (research.ts) + MCP/엔진 |
| 카피작성 (사용자 프롬프트) | Task 5 copy step + write_copy 툴 |
| 렌더링 (카드뉴스 단위 저장) | Task 3 (renderCards → createCardNews) |
| 업로드 Meta/Threads | Task 4 (publish.ts) |
| 워크플로우 토글/조정 | Task 5 (`steps.filter(enabled)`) |
| 직접 문서 업로드 시작 | Task 5 (input.document → context) |
| 설정 API Key | Task 1 settings + Task 6 라우트 |

**Plan 3:** Vite + React 웹 UI (워크플로우 편집기, 갤러리, 설정)
**Plan 4:** Docker + npm 패키징 + 문서

**타입 일관성 확인:** `CardInput`(render.ts 정의) → engine/run.ts, mcp/tools.ts 동일 import. `RunEvent` → run.ts → routes/run.ts. OK.

**주의 사항(문서화 필요):** 로컬 스토리지 PNG는 Meta/Threads 업로드 불가(공개 URL 필요). publish 함수가 명확한 에러 반환. Plan 4 README에 명시.
