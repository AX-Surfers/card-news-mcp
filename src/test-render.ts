import { renderCardNews } from "./tools/render-card-news.js";
import { closeBrowser } from "./renderer/playwright.js";

const SHARED_BG = "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80";

// 테마는 인자로 선택: `tsx src/test-render.ts surfers` (기본 default)
const theme = process.argv[2] ?? "default";

const cards = [
  {
    type: "thumbnail" as const,
    index: 0,
    title: "GPT가 공식 발표한\n핵심 프롬프트 가이드",
    category: "AI NEWS | TEXT",
    image_url: SHARED_BG,
  },
  {
    type: "body" as const,
    index: 1,
    page_number: 1,
    title: "GPT-5.5 한 줄 비밀",
    body: "단계 줄줄이 적지 말고 결과를 먼저 말하라.\nOpenAI가 5.5에 박은 핵심이에요.\n짧고 결과 중심 프롬프트가 가장 잘 먹힙니다.",
    image_url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80",
  },
  {
    type: "body" as const,
    index: 2,
    page_number: 2,
    title: "잘 쓰는 사람의 7가지 짜임새",
    body: "역할 → 말투 → 목표 → 성공 기준 → 조건 → 결과 형식 → 멈출 시점.\n이 순서로 짧게 적으면 결과가 확 달라집니다.",
    image_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
  },
  {
    type: "closing" as const,
    index: 3,
    image_url: SHARED_BG,
  },
];

async function main() {
  const result = await renderCardNews({
    id: `test-${theme}`,
    theme,
    cards,
    brand: {
      tagline: theme === "surfers" ? "AI Wave에 올라타세요" : "당신의 브랜드 한 줄",
      cta: "매일 쏟아지는 인사이트\n<b>지금 팔로우</b>하세요.",
    },
  });

  console.log(`theme=${result.theme} id=${result.id}`);
  for (const c of result.rendered_cards) {
    console.log(`  ✓ [${c.index}] ${c.type} → ${c.path ?? c.url ?? "(base64)"}`);
  }
  await closeBrowser();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
