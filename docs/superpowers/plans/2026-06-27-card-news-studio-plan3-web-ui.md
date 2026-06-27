# Card News Studio — Plan 3: Web Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Vite + React 웹 대시보드 — 워크플로우 편집기(Step 토글/편집/실행 SSE), 카드뉴스 갤러리, 템플릿 갤러리, 설정 페이지

**Architecture:** `packages/web` = Vite + React 19 + react-router + Tailwind. dev 시 Vite proxy로 `/api`·`/mcp` → `localhost:3000`. 빌드 산출물(`dist`)은 Plan 4에서 서버가 정적 서빙. API는 `lib/api.ts` fetch 래퍼로 통합.

**Tech Stack:** Vite 6, React 19, react-router-dom 7, Tailwind CSS 4, TypeScript

## Global Constraints

- Plan 1/2 제약 상속 (ESM, strict)
- 서버 API 계약: Plan 1/2에서 정의된 엔드포인트 그대로 사용
- SSE 실행: `POST /api/workflows/:id/run`, EventSource 대신 fetch + ReadableStream(POST라서)
- 디자인: 미니멀, 다크/라이트 무관, Tailwind 유틸만

---

## File Map

```
packages/web/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx                 ← 라우터 + 레이아웃
    ├── lib/
    │   ├── api.ts              ← fetch 래퍼
    │   └── types.ts            ← 서버 타입 미러
    ├── components/
    │   ├── Nav.tsx
    │   └── StepCard.tsx        ← 워크플로우 step 블록
    └── pages/
        ├── Gallery.tsx         ← 카드뉴스 목록
        ├── CardNewsDetail.tsx  ← 단일 카드뉴스 + 업로드
        ├── Workflows.tsx       ← 워크플로우 목록
        ├── WorkflowEditor.tsx  ← 편집 + 실행
        ├── Templates.tsx
        └── Settings.tsx
```

---

## Task 1: Vite 스캐폴딩 + Tailwind

**Files:** package.json, vite.config.ts, tsconfig.json, index.html, tailwind/postcss config, src/main.tsx, src/index.css

**Interfaces:** Produces — `pnpm --filter @card-news-studio/web dev` 동작, Tailwind 적용

- [ ] **Step 1: packages/web/package.json**

```json
{
  "name": "@card-news-studio/web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "echo 'no tests'"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "vite": "^6.0.0"
  }
}
```

> Tailwind 3.4 사용 (4는 설정 방식 상이 — 안정성 위해 3.4 고정).

- [ ] **Step 2: vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/mcp": "http://localhost:3000",
    },
  },
  build: { outDir: "dist" },
});
```

- [ ] **Step 3: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "allowImportingTsExtensions": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: index.html**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Card News Studio</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: tailwind.config.js**

```javascript
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 6: postcss.config.js**

```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 7: src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: src/main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 9: 설치 + dev 기동 확인**

```bash
cd /Users/kimjunho/Develop/card-news-studio
pnpm install
pnpm --filter @card-news-studio/web build
```

Expected: 빌드 성공 (App.tsx는 Task 2에서 생성하므로, 먼저 최소 App.tsx 스텁 필요 — Task 2 완료 후 빌드).

> Step 9 빌드는 Task 2 이후로 미룸. 여기선 install만.

- [ ] **Step 10: Commit**

```bash
git add packages/web/
git commit -m "chore: scaffold Vite + React + Tailwind web package"
```

---

## Task 2: API 클라이언트 + 타입 + 라우터/레이아웃

**Files:** src/lib/types.ts, src/lib/api.ts, src/components/Nav.tsx, src/App.tsx

**Interfaces:**
- Produces:
  - `api.workflows.list/get/create/update/remove`
  - `api.cardNews.list/get`
  - `api.settings.get/update`
  - `api.render(body)`
  - `api.runWorkflow(id, body, onEvent)` — SSE 스트림 파싱
  - 타입: `Workflow`, `WorkflowStep`, `CardNewsMeta`, `RunEvent`

- [ ] **Step 1: src/lib/types.ts**

```typescript
export type StepType =
  | "research_web"
  | "research_url"
  | "research_rss"
  | "document"
  | "copy"
  | "render"
  | "publish";

export interface WorkflowStep {
  type: StepType;
  enabled: boolean;
  config: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  brand: Record<string, unknown> | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardNewsMeta {
  id: string;
  workflow_id: string | null;
  title: string | null;
  cards: unknown[];
  image_paths: string[];
  status: "draft" | "done" | "published";
  created_at: string;
}

export interface RunEvent {
  step: number;
  type: string;
  status: "start" | "done" | "error";
  data?: unknown;
  error?: string;
}
```

- [ ] **Step 2: src/lib/api.ts**

```typescript
import type { Workflow, WorkflowStep, CardNewsMeta, RunEvent } from "./types";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  workflows: {
    list: () => fetch("/api/workflows").then(j<Workflow[]>),
    get: (id: string) => fetch(`/api/workflows/${id}`).then(j<Workflow>),
    create: (data: { name: string; steps: WorkflowStep[]; brand?: object; template_id?: string }) =>
      fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(j<Workflow>),
    update: (id: string, data: Partial<{ name: string; steps: WorkflowStep[]; brand: object; template_id: string }>) =>
      fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(j<Workflow>),
    remove: (id: string) =>
      fetch(`/api/workflows/${id}`, { method: "DELETE" }).then(j<{ ok: true }>),
  },
  cardNews: {
    list: () => fetch("/api/card-news").then(j<CardNewsMeta[]>),
    get: (id: string) => fetch(`/api/card-news/${id}`).then(j<CardNewsMeta>),
  },
  settings: {
    get: () => fetch("/api/settings").then(j<Record<string, string>>),
    update: (data: Record<string, string>) =>
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(j<{ ok: true }>),
  },
  render: (body: { cards: unknown[]; theme?: string; brand?: object; title?: string }) =>
    fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(j<{ card_news_id: string; image_paths: string[] }>),

  async runWorkflow(
    id: string,
    body: { document?: string },
    onEvent: (ev: RunEvent | { end: true } | { error: string }) => void
  ): Promise<void> {
    const res = await fetch(`/api/workflows/${id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.body) throw new Error("no response body");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const eventLine = chunk.split("\n").find((l) => l.startsWith("event:"));
        const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        const event = eventLine?.slice(6).trim();
        const data = JSON.parse(dataLine.slice(5).trim());
        if (event === "end") onEvent({ end: true });
        else if (event === "error") onEvent({ error: data.error });
        else onEvent(data as RunEvent);
      }
    }
  },
};
```

- [ ] **Step 3: src/components/Nav.tsx**

```tsx
import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "갤러리" },
  { to: "/workflows", label: "워크플로우" },
  { to: "/templates", label: "템플릿" },
  { to: "/settings", label: "설정" },
];

export function Nav() {
  return (
    <nav className="flex gap-1 border-b border-gray-200 bg-white px-6 py-3">
      <span className="mr-6 font-bold text-gray-900">Card News Studio</span>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === "/"}
          className={({ isActive }) =>
            `rounded px-3 py-1.5 text-sm ${
              isActive ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
            }`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: src/App.tsx**

```tsx
import { Routes, Route } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Gallery } from "./pages/Gallery";
import { CardNewsDetail } from "./pages/CardNewsDetail";
import { Workflows } from "./pages/Workflows";
import { WorkflowEditor } from "./pages/WorkflowEditor";
import { Templates } from "./pages/Templates";
import { Settings } from "./pages/Settings";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/card-news/:id" element={<CardNewsDetail />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/workflows/:id" element={<WorkflowEditor />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Commit (페이지는 Task 3에서, 빌드는 Task 3 후)**

```bash
git add packages/web/src/lib packages/web/src/components packages/web/src/App.tsx
git commit -m "feat: web API client, types, router and layout"
```

---

## Task 3: 페이지 구현

**Files:** src/pages/*.tsx (6개)

**Interfaces:** Consumes `api`, 타입. Produces 라우트별 페이지 컴포넌트.

- [ ] **Step 1: src/pages/Workflows.tsx**

```tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { Workflow } from "../lib/types";

export function Workflows() {
  const [items, setItems] = useState<Workflow[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    api.workflows.list().then(setItems);
  }, []);

  async function create() {
    const wf = await api.workflows.create({ name: "새 워크플로우", steps: [] });
    nav(`/workflows/${wf.id}`);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">워크플로우</h1>
        <button onClick={create} className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
          + 새 워크플로우
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((w) => (
          <li key={w.id}>
            <Link to={`/workflows/${w.id}`} className="block rounded border border-gray-200 bg-white p-4 hover:border-gray-400">
              <div className="font-medium">{w.name}</div>
              <div className="text-sm text-gray-500">{w.steps.length} steps · {new Date(w.created_at).toLocaleDateString()}</div>
            </Link>
          </li>
        ))}
        {items.length === 0 && <p className="text-gray-500">워크플로우가 없습니다.</p>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: src/components/StepCard.tsx**

```tsx
import type { WorkflowStep, StepType } from "../lib/types";

const STEP_LABELS: Record<StepType, string> = {
  research_web: "자료조사 — 웹검색",
  research_url: "자료조사 — URL 크롤링",
  research_rss: "자료조사 — RSS",
  document: "문서 업로드",
  copy: "카피작성",
  render: "렌더링",
  publish: "업로드",
};

const FIELDS: Record<StepType, Array<{ key: string; label: string; type: "text" | "textarea" }>> = {
  research_web: [{ key: "query", label: "검색어", type: "text" }],
  research_url: [{ key: "url", label: "URL", type: "text" }],
  research_rss: [{ key: "rss_url", label: "RSS URL", type: "text" }],
  document: [{ key: "file_path", label: "파일 경로", type: "text" }],
  copy: [
    { key: "system_prompt", label: "시스템 프롬프트", type: "textarea" },
    { key: "rules", label: "규칙", type: "textarea" },
    { key: "output_schema", label: "출력 구조", type: "textarea" },
  ],
  render: [{ key: "template_id", label: "템플릿 ID", type: "text" }],
  publish: [{ key: "platform", label: "플랫폼 (meta/threads)", type: "text" }],
};

export function StepCard({
  step,
  index,
  onChange,
  onRemove,
  onMove,
}: {
  step: WorkflowStep;
  index: number;
  onChange: (s: WorkflowStep) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className={`rounded border p-4 ${step.enabled ? "border-gray-300 bg-white" : "border-gray-200 bg-gray-100 opacity-60"}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{index + 1}</span>
          <span className="font-medium">{STEP_LABELS[step.type]}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => onMove(-1)} className="text-gray-400 hover:text-gray-700">↑</button>
          <button onClick={() => onMove(1)} className="text-gray-400 hover:text-gray-700">↓</button>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={step.enabled}
              onChange={(e) => onChange({ ...step, enabled: e.target.checked })}
            />
            활성
          </label>
          <button onClick={onRemove} className="text-red-500 hover:text-red-700">삭제</button>
        </div>
      </div>
      <div className="space-y-2">
        {FIELDS[step.type].map((f) => (
          <div key={f.key}>
            <label className="block text-xs text-gray-500">{f.label}</label>
            {f.type === "textarea" ? (
              <textarea
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                rows={3}
                value={step.config[f.key] ?? ""}
                onChange={(e) => onChange({ ...step, config: { ...step.config, [f.key]: e.target.value } })}
              />
            ) : (
              <input
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                value={step.config[f.key] ?? ""}
                onChange={(e) => onChange({ ...step, config: { ...step.config, [f.key]: e.target.value } })}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: src/pages/WorkflowEditor.tsx**

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Workflow, WorkflowStep, StepType, RunEvent } from "../lib/types";
import { StepCard } from "../components/StepCard";

const ADD_TYPES: StepType[] = [
  "research_web", "research_url", "research_rss", "document", "copy", "render", "publish",
];

export function WorkflowEditor() {
  const { id } = useParams<{ id: string }>();
  const [wf, setWf] = useState<Workflow | null>(null);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<Array<RunEvent | { end: true } | { error: string }>>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (id) api.workflows.get(id).then(setWf);
  }, [id]);

  if (!wf) return <p>로딩...</p>;

  function update(steps: WorkflowStep[]) {
    setWf({ ...wf!, steps });
  }

  function addStep(type: StepType) {
    update([...wf!.steps, { type, enabled: true, config: {} }]);
  }

  function moveStep(i: number, dir: -1 | 1) {
    const next = [...wf!.steps];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  }

  async function save() {
    setSaving(true);
    await api.workflows.update(wf!.id, { name: wf!.name, steps: wf!.steps });
    setSaving(false);
  }

  async function run() {
    setEvents([]);
    setRunning(true);
    await api.runWorkflow(wf!.id, {}, (ev) => setEvents((prev) => [...prev, ev]));
    setRunning(false);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <input
          className="rounded border border-gray-300 px-3 py-1.5 text-lg font-bold"
          value={wf.name}
          onChange={(e) => setWf({ ...wf, name: e.target.value })}
        />
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="rounded bg-gray-200 px-4 py-2 text-sm">
            {saving ? "저장중..." : "저장"}
          </button>
          <button onClick={run} disabled={running} className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
            {running ? "실행중..." : "실행"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {wf.steps.map((s, i) => (
          <StepCard
            key={i}
            step={s}
            index={i}
            onChange={(ns) => update(wf.steps.map((x, xi) => (xi === i ? ns : x)))}
            onRemove={() => update(wf.steps.filter((_, xi) => xi !== i))}
            onMove={(dir) => moveStep(i, dir)}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {ADD_TYPES.map((t) => (
          <button key={t} onClick={() => addStep(t)} className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100">
            + {t}
          </button>
        ))}
      </div>

      {events.length > 0 && (
        <div className="mt-6 rounded border border-gray-200 bg-black p-4 font-mono text-xs text-green-400">
          {events.map((ev, i) => (
            <div key={i}>{JSON.stringify(ev)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: src/pages/Gallery.tsx**

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { CardNewsMeta } from "../lib/types";

export function Gallery() {
  const [items, setItems] = useState<CardNewsMeta[]>([]);
  useEffect(() => {
    api.cardNews.list().then(setItems);
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">카드뉴스 갤러리</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((cn) => (
          <Link key={cn.id} to={`/card-news/${cn.id}`} className="rounded border border-gray-200 bg-white p-3 hover:border-gray-400">
            <div className="aspect-square overflow-hidden rounded bg-gray-100">
              {cn.image_paths[0] && (
                <img src={`/api/files?path=${encodeURIComponent(cn.image_paths[0])}`} className="h-full w-full object-cover" alt="" />
              )}
            </div>
            <div className="mt-2 truncate text-sm font-medium">{cn.title ?? "(제목 없음)"}</div>
            <div className="text-xs text-gray-500">{cn.status}</div>
          </Link>
        ))}
        {items.length === 0 && <p className="text-gray-500">생성된 카드뉴스가 없습니다.</p>}
      </div>
    </div>
  );
}
```

> 주의: `/api/files?path=` 엔드포인트는 Task 4에서 서버에 추가. 로컬 PNG 절대경로를 안전하게 서빙.

- [ ] **Step 5: src/pages/CardNewsDetail.tsx**

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { CardNewsMeta } from "../lib/types";

export function CardNewsDetail() {
  const { id } = useParams<{ id: string }>();
  const [cn, setCn] = useState<CardNewsMeta | null>(null);
  const [platform, setPlatform] = useState("threads");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (id) api.cardNews.get(id).then(setCn);
  }, [id]);

  if (!cn) return <p>로딩...</p>;

  async function publish() {
    setMsg("업로드 중...");
    try {
      const res = await fetch("/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "publish_card_news", arguments: { card_news_id: cn!.id, platform } },
        }),
      }).then((r) => r.json());
      if (res.error) setMsg(`오류: ${res.error.message}`);
      else setMsg(`완료: ${res.result.content[0].text}`);
    } catch (e) {
      setMsg(`오류: ${e}`);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{cn.title ?? "(제목 없음)"}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cn.image_paths.map((p, i) => (
          <img key={i} src={`/api/files?path=${encodeURIComponent(p)}`} className="aspect-square rounded border border-gray-200 object-cover" alt="" />
        ))}
      </div>
      <div className="mt-6 flex items-center gap-2">
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="rounded border border-gray-300 px-2 py-1.5 text-sm">
          <option value="threads">Threads</option>
          <option value="meta">Instagram (Meta)</option>
        </select>
        <button onClick={publish} className="rounded bg-gray-900 px-4 py-2 text-sm text-white">업로드</button>
        <span className="text-sm text-gray-600">{msg}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: src/pages/Templates.tsx**

```tsx
import { useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
}

export function Templates() {
  const [items, setItems] = useState<Template[]>([]);

  useEffect(() => {
    fetch("/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_templates", arguments: {} } }),
    })
      .then((r) => r.json())
      .then((res) => setItems(JSON.parse(res.result.content[0].text)));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">템플릿</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((t) => (
          <div key={t.id} className="rounded border border-gray-200 bg-white p-4">
            <div className="aspect-square rounded bg-gray-100" />
            <div className="mt-2 font-medium">{t.name}</div>
            <div className="text-xs text-gray-500">{t.id}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-500">템플릿 업로드는 다음 버전에서 지원됩니다.</p>
    </div>
  );
}
```

- [ ] **Step 7: src/pages/Settings.tsx**

```tsx
import { useEffect, useState } from "react";
import { api } from "../lib/api";

const FIELDS = [
  { key: "tavily_api_key", label: "Tavily API Key (웹검색)" },
  { key: "meta_access_token", label: "Meta Access Token" },
  { key: "meta_ig_user_id", label: "Meta IG User ID" },
  { key: "threads_access_token", label: "Threads Access Token" },
  { key: "threads_user_id", label: "Threads User ID" },
];

export function Settings() {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.settings.get().then(setVals);
  }, []);

  async function save() {
    setMsg("저장 중...");
    await api.settings.update(vals);
    setMsg("저장됨");
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-xl font-bold">설정</h1>
      <div className="space-y-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm text-gray-600">{f.label}</label>
            <input
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              value={vals[f.key] ?? ""}
              onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <button onClick={save} className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm text-white">저장</button>
      <span className="ml-3 text-sm text-gray-600">{msg}</span>
    </div>
  );
}
```

- [ ] **Step 8: 빌드**

```bash
cd /Users/kimjunho/Develop/card-news-studio
pnpm --filter @card-news-studio/web build
```

Expected: `packages/web/dist` 생성, TS 에러 없음.

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/pages packages/web/src/components/StepCard.tsx
git commit -m "feat: web pages — gallery, workflow editor, templates, settings"
```

---

## Task 4: 파일 서빙 엔드포인트 (서버)

**Files:** Modify `packages/server/src/index.ts` — `/api/files` 추가

**Interfaces:** Produces — `GET /api/files?path=<absolute>` → PNG (dataDir/files 하위만 허용)

- [ ] **Step 1: index.ts에 파일 서빙 추가**

`createApp` 내 `app.get("/health"...)` 위에 추가:

```typescript
import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";

  const filesRoot = resolve(join(dataDir, "files"));
  app.get("/api/files", async (c) => {
    const p = c.req.query("path");
    if (!p) return c.json({ error: "path required" }, 400);
    const abs = resolve(p);
    if (!abs.startsWith(filesRoot)) return c.json({ error: "forbidden" }, 403);
    try {
      const buf = await readFile(abs);
      return c.body(buf, 200, { "Content-Type": "image/png" });
    } catch {
      return c.json({ error: "not found" }, 404);
    }
  });
```

> 보안: `resolve(p)`가 `filesRoot` 하위가 아니면 403. 경로 탈출 방지.

- [ ] **Step 2: 빌드 + 기존 테스트 재확인**

```bash
pnpm --filter @card-news-studio/server build
node --test $(find packages/server/dist -name '*.test.js' | tr '\n' ' ')
```

Expected: 13 tests 여전히 pass.

- [ ] **Step 3: 파일 서빙 보안 테스트**

`packages/server/src/routes/files.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../index.js";

test("GET /api/files rejects path traversal", async () => {
  const { app, db } = createApp(join(tmpdir(), `cns-test-${Date.now()}`));
  const res = await app.request("/api/files?path=/etc/passwd");
  assert.equal(res.status, 403);
  db.close();
});

test("GET /api/files requires path", async () => {
  const { app, db } = createApp(join(tmpdir(), `cns-test-${Date.now()}`));
  const res = await app.request("/api/files");
  assert.equal(res.status, 400);
  db.close();
});
```

```bash
pnpm --filter @card-news-studio/server build
node --test packages/server/dist/routes/files.test.js
```

Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/
git commit -m "feat: secure /api/files endpoint for serving local PNGs"
```

---

## Task 5: 통합 수동 검증

- [ ] **Step 1: 서버 + 웹 동시 기동**

```bash
cd /Users/kimjunho/Develop/card-news-studio
node bin/cli.js --port 3000 &
pnpm --filter @card-news-studio/web dev &
```

- [ ] **Step 2: 브라우저 확인 (localhost:5173)**

- 워크플로우 생성 → step 추가/토글/순서변경 → 저장
- 설정 페이지에서 값 입력 → 저장 → 새로고침 후 마스킹 확인
- (Tavily 키 있으면) research_web + copy + render 워크플로우 실행 → SSE 이벤트 표시 → 갤러리에 결과

- [ ] **Step 3: 정리**

```bash
kill %1 %2 2>/dev/null
```

---

## Self-Review

| Spec | 구현 |
|------|------|
| 워크플로우 시각화 조회/편집/저장 | Task 3 WorkflowEditor + StepCard |
| Step 토글(기능 on/off) | StepCard enabled 체크박스 |
| Step 순서 조정 | moveStep ↑↓ |
| 실행 + 진행상황 | runWorkflow SSE → events 표시 |
| 카드뉴스 갤러리/뷰어 | Gallery + CardNewsDetail |
| 업로드 (플랫폼 선택) | CardNewsDetail publish |
| 템플릿 조회 | Templates |
| 설정(API Key) | Settings + 마스킹 |
| 이미지 서빙 | Task 4 /api/files |

**Plan 4:** Docker + npm 패키징 + 서버가 web/dist 정적 서빙 + README + DESIGN.md 제약 문서화
**미구현(차기):** 템플릿 HTML 업로드, DESIGN.md 업로드 UI, 드래그앤드롭(현재 ↑↓ 버튼), 미리보기 렌더

**타입 일관성:** `Workflow`/`WorkflowStep`/`CardNewsMeta`/`RunEvent` — 서버 타입과 web/lib/types.ts 미러 일치 확인.
