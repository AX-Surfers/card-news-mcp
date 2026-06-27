# Card News Studio — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npx card-news-studio` 로 로컬에서 실행되는 Hono 서버 + SQLite DB + 워크플로우 CRUD API + MCP HTTP 엔드포인트 구축

**Architecture:** pnpm monorepo (`/Users/kimjunho/Develop/card-news-studio`). `packages/server`는 Hono + better-sqlite3. `packages/renderer`는 기존 `card-news-mcp` 렌더러 함수를 re-export하는 얇은 래퍼. CLI bin이 서버를 기동하고 브라우저를 연다. Web UI는 Plan 2에서 구현.

**Tech Stack:** pnpm 9, Node.js 22, TypeScript 5, Hono 4, better-sqlite3, @modelcontextprotocol/sdk, @ai-sdk/anthropic, Zod, card-news-mcp (local path 의존성 → npm 배포 후 교체)

## Global Constraints

- Node.js ≥ 22 필수 (package.json engines 명시)
- ESM 전용 (`"type": "module"`)
- 모든 파일 TypeScript strict mode
- DB 기본: SQLite (`~/.card-news-studio/db.sqlite`)
- 파일 기본: `~/.card-news-studio/files/`
- Auth 없음 (단일유저 로컬 도구)
- 테스트 러너: Node.js built-in `node:test` (외부 의존성 없이)
- card-news-mcp 경로: `file:../../cardnews` (로컬 개발 중)

---

## File Map

```
/Users/kimjunho/Develop/card-news-studio/
├── package.json                          ← pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json                    ← 공유 tsconfig
├── bin/
│   └── cli.ts                            ← npx 진입점
├── packages/
│   ├── renderer/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts                  ← card-news-mcp 렌더러 re-export
│   └── server/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                  ← Hono 앱 + startServer()
│           ├── db/
│           │   ├── client.ts             ← SQLite 연결 + migrate()
│           │   ├── schema.sql            ← CREATE TABLE 구문
│           │   └── workflows.ts          ← workflow CRUD 함수
│           ├── storage/
│           │   └── local.ts              ← 파일시스템 저장
│           ├── routes/
│           │   ├── workflows.ts          ← GET/POST/PUT/DELETE /api/workflows
│           │   ├── card-news.ts          ← GET/POST /api/card-news
│           │   ├── render.ts             ← POST /api/render
│           │   └── mcp.ts                ← POST /mcp (MCP HTTP)
│           └── mcp/
│               └── tools.ts              ← MCP 툴 8개 정의
```

---

## Task 1: Monorepo 스캐폴딩

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `packages/renderer/package.json`
- Create: `packages/renderer/tsconfig.json`
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`

**Interfaces:**
- Produces: pnpm workspace, TypeScript 빌드 환경

- [ ] **Step 1: 디렉터리 생성**

```bash
mkdir -p /Users/kimjunho/Develop/card-news-studio/{bin,packages/renderer/src,packages/server/src}
cd /Users/kimjunho/Develop/card-news-studio
git init
```

- [ ] **Step 2: Root package.json 작성**

```json
{
  "name": "card-news-studio",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "pnpm -r build",
    "dev": "tsx bin/cli.ts",
    "test": "pnpm -r test"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tsx": "^4.15.0"
  }
}
```

- [ ] **Step 3: pnpm-workspace.yaml 작성**

```yaml
packages:
  - 'packages/*'
  - 'bin'
```

- [ ] **Step 4: tsconfig.base.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: packages/renderer/package.json 작성**

```json
{
  "name": "@card-news-studio/renderer",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "node --test dist/index.test.js"
  },
  "dependencies": {
    "card-news-mcp": "file:../../cardnews"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 6: packages/renderer/tsconfig.json 작성**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 7: packages/server/package.json 작성**

```json
{
  "name": "@card-news-studio/server",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "node --test dist/**/*.test.js"
  },
  "dependencies": {
    "@card-news-studio/renderer": "workspace:*",
    "@hono/node-server": "^1.12.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "ai": "^4.0.0",
    "better-sqlite3": "^11.0.0",
    "hono": "^4.5.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 8: packages/server/tsconfig.json 작성**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 9: 의존성 설치**

```bash
cd /Users/kimjunho/Develop/card-news-studio
pnpm install
```

Expected: `node_modules` 생성, workspace 링크 완료.

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "chore: init pnpm monorepo with renderer and server packages"
```

---

## Task 2: card-news-mcp 렌더러 Export 추가

> 기존 repo(`/Users/kimjunho/Develop/cardnews`) 수정

**Files:**
- Modify: `/Users/kimjunho/Develop/cardnews/package.json` — exports 필드 추가
- Create: `/Users/kimjunho/Develop/cardnews/src/index.ts` — public API re-export

**Interfaces:**
- Produces: `import { renderCardNews, RenderCardNewsInput, RenderedCard } from 'card-news-mcp'`

- [ ] **Step 1: src/index.ts 작성**

파일: `/Users/kimjunho/Develop/cardnews/src/index.ts`

```typescript
export { renderCardNews } from "./tools/render-card-news.js";
export type {
  RenderCardNewsInput,
  RenderedCard,
} from "./tools/render-card-news.js";
export { loadTheme } from "./renderer/theme-loader.js";
export { createStorage } from "./storage/index.js";
export type { StorageBackend, StorageResult } from "./storage/index.js";
```

- [ ] **Step 2: package.json에 exports 추가**

파일: `/Users/kimjunho/Develop/cardnews/package.json`

기존 `"main": "dist/server.js"` 아래에 추가:

```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "types": "./dist/index.d.ts"
  },
  "./server": {
    "import": "./dist/server.js"
  }
},
```

- [ ] **Step 3: tsconfig.json에 index.ts 포함 확인**

`/Users/kimjunho/Develop/cardnews/tsconfig.json`의 `include`에 `"src/index.ts"` 포함 여부 확인. 이미 `"src"` 전체가 포함되어 있으면 OK.

- [ ] **Step 4: 빌드 + 확인**

```bash
cd /Users/kimjunho/Develop/cardnews
npm run build
ls dist/index.js dist/index.d.ts
```

Expected: 두 파일 모두 존재.

- [ ] **Step 5: Commit (cardnews repo)**

```bash
cd /Users/kimjunho/Develop/cardnews
git add src/index.ts package.json
git commit -m "feat: export renderCardNews and types as public API"
```

---

## Task 3: Renderer 패키지 구현

**Files:**
- Create: `packages/renderer/src/index.ts`

**Interfaces:**
- Consumes: `renderCardNews`, `RenderCardNewsInput`, `RenderedCard` from `card-news-mcp`
- Produces: 동일 타입 re-export (server 패키지가 `@card-news-studio/renderer`에서 import)

- [ ] **Step 1: packages/renderer/src/index.ts 작성**

```typescript
export { renderCardNews } from "card-news-mcp";
export type { RenderCardNewsInput, RenderedCard } from "card-news-mcp";
```

- [ ] **Step 2: 빌드 확인**

```bash
cd /Users/kimjunho/Develop/card-news-studio
pnpm --filter @card-news-studio/renderer build
ls packages/renderer/dist/index.js
```

Expected: `dist/index.js` 생성.

- [ ] **Step 3: Commit**

```bash
git add packages/renderer/
git commit -m "feat: renderer package — re-export card-news-mcp public API"
```

---

## Task 4: DB 레이어 (SQLite)

**Files:**
- Create: `packages/server/src/db/schema.sql`
- Create: `packages/server/src/db/client.ts`
- Create: `packages/server/src/db/workflows.ts`
- Create: `packages/server/src/db/card-news.ts`

**Interfaces:**
- Produces:
  - `getDb(): Database` — better-sqlite3 인스턴스
  - `migrateDb(db: Database): void`
  - `listWorkflows(db): Workflow[]`
  - `getWorkflow(db, id: string): Workflow | null`
  - `createWorkflow(db, data: CreateWorkflowInput): Workflow`
  - `updateWorkflow(db, id: string, data: Partial<CreateWorkflowInput>): Workflow | null`
  - `deleteWorkflow(db, id: string): boolean`
  - `listCardNews(db): CardNewsMeta[]`
  - `getCardNews(db, id: string): CardNewsMeta | null`
  - `createCardNews(db, data: CreateCardNewsInput): CardNewsMeta`
  - `updateCardNewsStatus(db, id: string, status: CardNewsStatus): void`

- [ ] **Step 1: schema.sql 작성**

파일: `packages/server/src/db/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS workflows (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  steps       TEXT NOT NULL,
  brand       TEXT,
  template_id TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS card_news (
  id          TEXT PRIMARY KEY,
  workflow_id TEXT,
  title       TEXT,
  cards       TEXT NOT NULL,
  image_paths TEXT NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'draft',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL
);
```

- [ ] **Step 2: db/client.ts 작성**

```typescript
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getDb(dataDir: string): Database.Database {
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(resolve(dataDir, "db.sqlite"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function migrateDb(db: Database.Database): void {
  const schema = readFileSync(resolve(__dirname, "schema.sql"), "utf-8");
  db.exec(schema);
}
```

- [ ] **Step 3: db/workflows.ts 작성**

```typescript
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { WorkflowStep } from "../types.js";

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  brand: Record<string, unknown> | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkflowInput {
  name: string;
  steps: WorkflowStep[];
  brand?: Record<string, unknown>;
  template_id?: string;
}

type WorkflowRow = {
  id: string;
  name: string;
  steps: string;
  brand: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
};

function toWorkflow(row: WorkflowRow): Workflow {
  return {
    ...row,
    steps: JSON.parse(row.steps),
    brand: row.brand ? JSON.parse(row.brand) : null,
  };
}

export function listWorkflows(db: Database.Database): Workflow[] {
  const rows = db
    .prepare("SELECT * FROM workflows ORDER BY created_at DESC")
    .all() as WorkflowRow[];
  return rows.map(toWorkflow);
}

export function getWorkflow(
  db: Database.Database,
  id: string
): Workflow | null {
  const row = db
    .prepare("SELECT * FROM workflows WHERE id = ?")
    .get(id) as WorkflowRow | undefined;
  return row ? toWorkflow(row) : null;
}

export function createWorkflow(
  db: Database.Database,
  data: CreateWorkflowInput
): Workflow {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO workflows (id, name, steps, brand, template_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.name,
    JSON.stringify(data.steps),
    data.brand ? JSON.stringify(data.brand) : null,
    data.template_id ?? null,
    now,
    now
  );
  return getWorkflow(db, id)!;
}

export function updateWorkflow(
  db: Database.Database,
  id: string,
  data: Partial<CreateWorkflowInput>
): Workflow | null {
  const existing = getWorkflow(db, id);
  if (!existing) return null;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE workflows SET
      name = ?, steps = ?, brand = ?, template_id = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    data.name ?? existing.name,
    JSON.stringify(data.steps ?? existing.steps),
    data.brand !== undefined
      ? data.brand
        ? JSON.stringify(data.brand)
        : null
      : existing.brand
      ? JSON.stringify(existing.brand)
      : null,
    data.template_id !== undefined ? data.template_id : existing.template_id,
    now,
    id
  );
  return getWorkflow(db, id)!;
}

export function deleteWorkflow(db: Database.Database, id: string): boolean {
  const result = db
    .prepare("DELETE FROM workflows WHERE id = ?")
    .run(id);
  return result.changes > 0;
}
```

- [ ] **Step 4: types.ts 작성 (WorkflowStep 타입)**

파일: `packages/server/src/types.ts`

```typescript
export type ResearchWebStep = {
  type: "research_web";
  enabled: boolean;
  config: { query: string };
};

export type ResearchUrlStep = {
  type: "research_url";
  enabled: boolean;
  config: { url: string };
};

export type ResearchRssStep = {
  type: "research_rss";
  enabled: boolean;
  config: { rss_url: string };
};

export type DocumentStep = {
  type: "document";
  enabled: boolean;
  config: { file_path: string };
};

export type CopyStep = {
  type: "copy";
  enabled: boolean;
  config: {
    system_prompt: string;
    output_schema: string;
    rules: string;
  };
};

export type RenderStep = {
  type: "render";
  enabled: boolean;
  config: { template_id: string };
};

export type PublishStep = {
  type: "publish";
  enabled: boolean;
  config: { platform: "meta" | "threads" };
};

export type WorkflowStep =
  | ResearchWebStep
  | ResearchUrlStep
  | ResearchRssStep
  | DocumentStep
  | CopyStep
  | RenderStep
  | PublishStep;

export type CardNewsStatus = "draft" | "done" | "published";

export interface CardNewsMeta {
  id: string;
  workflow_id: string | null;
  title: string | null;
  cards: unknown[];
  image_paths: string[];
  status: CardNewsStatus;
  created_at: string;
}
```

- [ ] **Step 5: db/card-news.ts 작성**

```typescript
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { CardNewsMeta, CardNewsStatus } from "../types.js";

type CardNewsRow = {
  id: string;
  workflow_id: string | null;
  title: string | null;
  cards: string;
  image_paths: string;
  status: string;
  created_at: string;
};

function toCardNews(row: CardNewsRow): CardNewsMeta {
  return {
    ...row,
    cards: JSON.parse(row.cards),
    image_paths: JSON.parse(row.image_paths),
    status: row.status as CardNewsStatus,
  };
}

export interface CreateCardNewsInput {
  workflow_id?: string;
  title?: string;
  cards: unknown[];
  image_paths?: string[];
  status?: CardNewsStatus;
}

export function listCardNews(db: Database.Database): CardNewsMeta[] {
  const rows = db
    .prepare("SELECT * FROM card_news ORDER BY created_at DESC")
    .all() as CardNewsRow[];
  return rows.map(toCardNews);
}

export function getCardNews(
  db: Database.Database,
  id: string
): CardNewsMeta | null {
  const row = db
    .prepare("SELECT * FROM card_news WHERE id = ?")
    .get(id) as CardNewsRow | undefined;
  return row ? toCardNews(row) : null;
}

export function createCardNews(
  db: Database.Database,
  data: CreateCardNewsInput
): CardNewsMeta {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO card_news (id, workflow_id, title, cards, image_paths, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.workflow_id ?? null,
    data.title ?? null,
    JSON.stringify(data.cards),
    JSON.stringify(data.image_paths ?? []),
    data.status ?? "draft",
    now
  );
  return getCardNews(db, id)!;
}

export function updateCardNewsStatus(
  db: Database.Database,
  id: string,
  status: CardNewsStatus
): void {
  db.prepare("UPDATE card_news SET status = ? WHERE id = ?").run(status, id);
}
```

- [ ] **Step 6: DB 레이어 테스트**

파일: `packages/server/src/db/client.test.ts`

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDb, migrateDb } from "./client.js";
import { createWorkflow, getWorkflow, listWorkflows, deleteWorkflow } from "./workflows.js";
import { createCardNews, getCardNews } from "./card-news.js";

test("workflow CRUD", () => {
  const db = getDb(join(tmpdir(), `cns-test-${Date.now()}`));
  migrateDb(db);

  const created = createWorkflow(db, {
    name: "Test Workflow",
    steps: [{ type: "research_web", enabled: true, config: { query: "AI news" } }],
  });

  assert.equal(created.name, "Test Workflow");
  assert.equal(created.steps.length, 1);

  const fetched = getWorkflow(db, created.id);
  assert.ok(fetched);
  assert.equal(fetched.name, "Test Workflow");

  const list = listWorkflows(db);
  assert.equal(list.length, 1);

  const deleted = deleteWorkflow(db, created.id);
  assert.ok(deleted);
  assert.equal(getWorkflow(db, created.id), null);

  db.close();
});

test("card_news CRUD", () => {
  const db = getDb(join(tmpdir(), `cns-test-${Date.now()}`));
  migrateDb(db);

  const created = createCardNews(db, {
    title: "Test",
    cards: [{ type: "thumbnail", index: 0 }],
    image_paths: ["/tmp/img.png"],
  });

  assert.equal(created.title, "Test");
  assert.equal(created.image_paths.length, 1);

  const fetched = getCardNews(db, created.id);
  assert.ok(fetched);

  db.close();
});
```

- [ ] **Step 7: 빌드 + 테스트 실행**

```bash
cd /Users/kimjunho/Develop/card-news-studio
pnpm --filter @card-news-studio/server build
node --test packages/server/dist/db/client.test.js
```

Expected: 2 tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/server/src/
git commit -m "feat: SQLite DB layer — workflows and card_news CRUD"
```

---

## Task 5: Hono 서버 + 워크플로우 API 라우트

**Files:**
- Create: `packages/server/src/index.ts`
- Create: `packages/server/src/routes/workflows.ts`
- Create: `packages/server/src/routes/card-news.ts`

**Interfaces:**
- Consumes: `getDb`, `migrateDb`, `listWorkflows`, `getWorkflow`, `createWorkflow`, `updateWorkflow`, `deleteWorkflow` (Task 4)
- Produces:
  - `createApp(dataDir: string): Hono`
  - `startServer(port: number, dataDir: string): Promise<void>`
  - `GET    /api/workflows` → `Workflow[]`
  - `POST   /api/workflows` → `Workflow`
  - `GET    /api/workflows/:id` → `Workflow`
  - `PUT    /api/workflows/:id` → `Workflow`
  - `DELETE /api/workflows/:id` → `{ ok: true }`
  - `GET    /api/card-news` → `CardNewsMeta[]`
  - `GET    /api/card-news/:id` → `CardNewsMeta`

- [ ] **Step 1: routes/workflows.ts 작성**

```typescript
import { Hono } from "hono";
import type Database from "better-sqlite3";
import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from "../db/workflows.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const StepSchema = z.object({
  type: z.enum([
    "research_web", "research_url", "research_rss",
    "document", "copy", "render", "publish",
  ]),
  enabled: z.boolean(),
  config: z.record(z.unknown()),
});

const CreateSchema = z.object({
  name: z.string().min(1),
  steps: z.array(StepSchema),
  brand: z.record(z.unknown()).optional(),
  template_id: z.string().optional(),
});

export function workflowRoutes(db: Database.Database) {
  const app = new Hono();

  app.get("/", (c) => c.json(listWorkflows(db)));

  app.post("/", zValidator("json", CreateSchema), (c) => {
    const data = c.req.valid("json");
    return c.json(createWorkflow(db, data as any), 201);
  });

  app.get("/:id", (c) => {
    const w = getWorkflow(db, c.req.param("id"));
    if (!w) return c.json({ error: "not found" }, 404);
    return c.json(w);
  });

  app.put("/:id", zValidator("json", CreateSchema.partial()), (c) => {
    const data = c.req.valid("json");
    const updated = updateWorkflow(db, c.req.param("id"), data as any);
    if (!updated) return c.json({ error: "not found" }, 404);
    return c.json(updated);
  });

  app.delete("/:id", (c) => {
    const ok = deleteWorkflow(db, c.req.param("id"));
    if (!ok) return c.json({ error: "not found" }, 404);
    return c.json({ ok: true });
  });

  return app;
}
```

- [ ] **Step 2: routes/card-news.ts 작성**

```typescript
import { Hono } from "hono";
import type Database from "better-sqlite3";
import { listCardNews, getCardNews } from "../db/card-news.js";

export function cardNewsRoutes(db: Database.Database) {
  const app = new Hono();

  app.get("/", (c) => c.json(listCardNews(db)));

  app.get("/:id", (c) => {
    const cn = getCardNews(db, c.req.param("id"));
    if (!cn) return c.json({ error: "not found" }, 404);
    return c.json(cn);
  });

  return app;
}
```

- [ ] **Step 3: server/src/index.ts 작성**

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { getDb, migrateDb } from "./db/client.js";
import { workflowRoutes } from "./routes/workflows.js";
import { cardNewsRoutes } from "./routes/card-news.js";

export function createApp(dataDir: string) {
  const db = getDb(dataDir);
  migrateDb(db);

  const app = new Hono();
  app.use("*", cors());

  app.route("/api/workflows", workflowRoutes(db));
  app.route("/api/card-news", cardNewsRoutes(db));

  app.get("/health", (c) => c.json({ ok: true }));

  return { app, db };
}

export async function startServer(port: number, dataDir: string): Promise<void> {
  const { app } = createApp(dataDir);
  console.log(`Card News Studio running at http://localhost:${port}`);
  serve({ fetch: app.fetch, port });
}
```

- [ ] **Step 4: @hono/zod-validator 의존성 추가**

```bash
cd /Users/kimjunho/Develop/card-news-studio
pnpm --filter @card-news-studio/server add @hono/zod-validator
```

- [ ] **Step 5: 빌드**

```bash
pnpm --filter @card-news-studio/server build
```

Expected: no TypeScript errors.

- [ ] **Step 6: 서버 smoke test**

`packages/server/src/routes/workflows.test.ts` 작성:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../index.js";

test("GET /api/workflows returns empty array", async () => {
  const { app } = createApp(join(tmpdir(), `cns-test-${Date.now()}`));
  const res = await app.request("/api/workflows");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, []);
});

test("POST + GET /api/workflows", async () => {
  const { app } = createApp(join(tmpdir(), `cns-test-${Date.now()}`));

  const createRes = await app.request("/api/workflows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "My Workflow",
      steps: [{ type: "research_web", enabled: true, config: { query: "AI" } }],
    }),
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json() as { id: string };
  assert.ok(created.id);

  const getRes = await app.request(`/api/workflows/${created.id}`);
  assert.equal(getRes.status, 200);
  const fetched = await getRes.json() as { name: string };
  assert.equal(fetched.name, "My Workflow");
});

test("DELETE /api/workflows/:id", async () => {
  const { app } = createApp(join(tmpdir(), `cns-test-${Date.now()}`));

  const createRes = await app.request("/api/workflows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Del", steps: [] }),
  });
  const { id } = await createRes.json() as { id: string };

  const delRes = await app.request(`/api/workflows/${id}`, { method: "DELETE" });
  assert.equal(delRes.status, 200);

  const getRes = await app.request(`/api/workflows/${id}`);
  assert.equal(getRes.status, 404);
});
```

```bash
pnpm --filter @card-news-studio/server build
node --test packages/server/dist/routes/workflows.test.js
```

Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/routes/ packages/server/src/index.ts
git commit -m "feat: Hono server with workflow and card-news REST API"
```

---

## Task 6: MCP HTTP 엔드포인트 + 기본 툴

**Files:**
- Create: `packages/server/src/mcp/tools.ts`
- Create: `packages/server/src/routes/mcp.ts`

**Interfaces:**
- Consumes: `getWorkflow` (Task 4)
- Produces: `POST /mcp` — MCP HTTP transport (AI 에이전트 연결용)
- MCP 툴: `get_workflow`, `list_templates`, `write_copy` (나머지는 Plan 2에서)

- [ ] **Step 1: mcp/tools.ts 작성**

```typescript
import type Database from "better-sqlite3";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getWorkflow } from "../db/workflows.js";
import { createCardNews } from "../db/card-news.js";

export interface ToolContext {
  db: Database.Database;
  dataDir: string;
}

export function buildTools(ctx: ToolContext) {
  return {
    get_workflow: {
      description: "워크플로우 정의(steps)를 가져온다",
      inputSchema: {
        type: "object" as const,
        properties: { workflow_id: { type: "string" } },
        required: ["workflow_id"],
      },
      handler: async (args: { workflow_id: string }) => {
        const w = getWorkflow(ctx.db, args.workflow_id);
        if (!w) throw new Error(`workflow ${args.workflow_id} not found`);
        return { content: [{ type: "text", text: JSON.stringify(w.steps) }] };
      },
    },

    list_templates: {
      description: "사용 가능한 템플릿 목록을 반환한다",
      inputSchema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
      handler: async () => {
        // Plan 2에서 템플릿 DB 추가 예정 — 지금은 빌트인만 반환
        const templates = [{ id: "default", name: "Default" }];
        return { content: [{ type: "text", text: JSON.stringify(templates) }] };
      },
    },

    write_copy: {
      description: "소스 컨텐츠를 기반으로 카드뉴스 카피를 작성한다",
      inputSchema: {
        type: "object" as const,
        properties: {
          source_content: { type: "string" },
          system_prompt: { type: "string" },
          output_schema: { type: "string" },
          rules: { type: "string" },
        },
        required: ["source_content", "system_prompt"],
      },
      handler: async (args: {
        source_content: string;
        system_prompt: string;
        output_schema?: string;
        rules?: string;
      }) => {
        const prompt = [
          args.system_prompt,
          args.rules ? `\n\n규칙:\n${args.rules}` : "",
          args.output_schema ? `\n\n출력 구조:\n${args.output_schema}` : "",
          `\n\n소스:\n${args.source_content}`,
        ].join("");

        const { text } = await generateText({
          model: anthropic("claude-sonnet-4-6"),
          prompt,
        });

        return { content: [{ type: "text", text }] };
      },
    },
  } satisfies Record<string, { description: string; inputSchema: object; handler: (args: any) => Promise<{ content: Array<{ type: string; text: string }> }> }>;
}
```

- [ ] **Step 2: routes/mcp.ts 작성**

```typescript
import { Hono } from "hono";
import type Database from "better-sqlite3";
import { buildTools } from "../mcp/tools.js";

export function mcpRoutes(db: Database.Database, dataDir: string) {
  const app = new Hono();
  const tools = buildTools({ db, dataDir });

  // Streamable HTTP MCP endpoint (단순 JSON-RPC)
  app.post("/", async (c) => {
    const body = await c.req.json() as {
      jsonrpc: string;
      id: string | number;
      method: string;
      params?: Record<string, unknown>;
    };

    if (body.method === "initialize") {
      return c.json({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "card-news-studio", version: "0.1.0" },
        },
      });
    }

    if (body.method === "tools/list") {
      return c.json({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          tools: Object.entries(tools).map(([name, t]) => ({
            name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      });
    }

    if (body.method === "tools/call") {
      const { name, arguments: args } = body.params as { name: string; arguments: unknown };
      const tool = tools[name as keyof typeof tools];
      if (!tool) {
        return c.json({
          jsonrpc: "2.0",
          id: body.id,
          error: { code: -32601, message: `tool ${name} not found` },
        });
      }
      try {
        const result = await tool.handler(args as any);
        return c.json({ jsonrpc: "2.0", id: body.id, result });
      } catch (e) {
        return c.json({
          jsonrpc: "2.0",
          id: body.id,
          error: { code: -32603, message: String(e) },
        });
      }
    }

    return c.json({
      jsonrpc: "2.0",
      id: body.id,
      error: { code: -32601, message: "method not found" },
    });
  });

  return app;
}
```

- [ ] **Step 3: index.ts에 /mcp 라우트 추가**

`packages/server/src/index.ts`의 `createApp` 함수에 추가:

```typescript
import { mcpRoutes } from "./routes/mcp.js";

// app.get("/health", ...) 위에 추가
app.route("/mcp", mcpRoutes(db, dataDir));
```

- [ ] **Step 4: MCP 엔드포인트 테스트**

파일: `packages/server/src/routes/mcp.test.ts`

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../index.js";

test("MCP initialize", async () => {
  const { app } = createApp(join(tmpdir(), `cns-test-${Date.now()}`));
  const res = await app.request("/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  });
  assert.equal(res.status, 200);
  const body = await res.json() as { result: { serverInfo: { name: string } } };
  assert.equal(body.result.serverInfo.name, "card-news-studio");
});

test("MCP tools/list", async () => {
  const { app } = createApp(join(tmpdir(), `cns-test-${Date.now()}`));
  const res = await app.request("/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
  });
  const body = await res.json() as { result: { tools: Array<{ name: string }> } };
  const names = body.result.tools.map((t) => t.name);
  assert.ok(names.includes("get_workflow"));
  assert.ok(names.includes("write_copy"));
  assert.ok(names.includes("list_templates"));
});
```

```bash
pnpm --filter @card-news-studio/server build
node --test packages/server/dist/routes/mcp.test.js
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/mcp/ packages/server/src/routes/mcp.ts packages/server/src/index.ts
git commit -m "feat: MCP HTTP endpoint with get_workflow, list_templates, write_copy tools"
```

---

## Task 7: CLI 진입점

**Files:**
- Create: `bin/cli.ts`
- Modify: `package.json` — bin 필드 추가

**Interfaces:**
- Consumes: `startServer` from `@card-news-studio/server`
- Produces: `npx card-news-studio [--port N] [--data PATH]` 실행

- [ ] **Step 1: bin/cli.ts 작성**

```typescript
#!/usr/bin/env node
import { startServer } from "@card-news-studio/server";
import { homedir } from "node:os";
import { join } from "node:path";
import { openSync } from "node:fs";

const args = process.argv.slice(2);
const portIdx = args.indexOf("--port");
const dataIdx = args.indexOf("--data");

const port = portIdx !== -1 ? Number(args[portIdx + 1]) : 3000;
const dataDir =
  dataIdx !== -1 ? args[dataIdx + 1] : join(homedir(), ".card-news-studio");

await startServer(port, dataDir);

// 브라우저 열기 (플랫폼별)
const url = `http://localhost:${port}`;
const { exec } = await import("node:child_process");
const cmd =
  process.platform === "darwin"
    ? `open ${url}`
    : process.platform === "win32"
    ? `start ${url}`
    : `xdg-open ${url}`;
exec(cmd);
```

- [ ] **Step 2: root package.json에 bin 추가**

```json
"bin": {
  "card-news-studio": "bin/cli.js"
},
```

- [ ] **Step 3: bin/tsconfig.json 작성**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": ".",
    "rootDir": "."
  },
  "include": ["cli.ts"]
}
```

- [ ] **Step 4: bin/package.json 작성**

```json
{
  "name": "@card-news-studio/cli",
  "private": true,
  "type": "module",
  "dependencies": {
    "@card-news-studio/server": "workspace:*"
  },
  "devDependencies": { "typescript": "^5.5.0" }
}
```

- [ ] **Step 5: 빌드 + 실행 테스트**

```bash
cd /Users/kimjunho/Develop/card-news-studio
pnpm build
node bin/cli.js --port 3001 &
sleep 2
curl -s http://localhost:3001/health
kill %1
```

Expected: `{"ok":true}` 출력.

- [ ] **Step 6: Commit**

```bash
git add bin/ package.json
git commit -m "feat: CLI entrypoint — npx card-news-studio --port --data"
```

---

## Self-Review

**Spec 커버리지 확인:**

| 요구사항 | 구현 태스크 |
|---------|------------|
| 워크플로우 CRUD | Task 4, 5 |
| MCP HTTP 서버 | Task 6 |
| 카피작성 (AI SDK) | Task 6 (write_copy tool) |
| DB (SQLite) | Task 4 |
| npx 실행 | Task 7 |
| card-news-mcp 렌더러 재사용 | Task 2, 3 |

**Plan 2 (별도 문서)에서 구현:**
- 자료조사 툴 (research_web, research_url, research_rss)
- 렌더링 툴 (render_card_news — Task 3 renderer 연결)
- 업로드 툴 (publish — Meta/Threads API)
- 워크플로우 실행 SSE 스트리밍
- 템플릿 관리 API

**Plan 3:** Vite + React 웹 UI
**Plan 4:** Docker Compose + 패키징

---

**Plan 저장:** `docs/superpowers/plans/2026-06-27-card-news-studio-plan1-foundation.md`
