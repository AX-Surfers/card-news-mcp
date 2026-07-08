import { z } from "zod";
import { loadTheme } from "../renderer/theme-loader.js";
import { renderHtmlToPng } from "../renderer/playwright.js";
import { createStorage, type StorageResult } from "../storage/index.js";

const CardSchema = z.object({
  type: z.enum(["thumbnail", "body", "closing"]),
  index: z.number().int().min(0),
  title: z.string().optional(),
  body: z.string().optional(),
  image_url: z.string().url().optional(),
  page_number: z.number().int().optional(),
  category: z.string().optional(),
});

// 브랜드 오버라이드 — 미지정 시 테마 기본값 사용
const BrandSchema = z
  .object({
    logo_url: z.string().url().optional(),
    brand_image: z.string().url().optional(),
    wordmark_url: z.string().url().optional(),
    brand_name: z.string().optional(),
    tagline: z.string().optional(),
    primary_color: z.string().optional(),
    accent_color: z.string().optional(),
    closing_tint: z.string().optional(),
    font: z.string().optional(),
    cta: z.string().optional(),
  })
  .optional();

export const RenderCardNewsInputSchema = z.object({
  id: z.string().optional(),
  theme: z.string().optional(), // 테마 이름 또는 경로 (미지정 시 THEME env / default)
  cards: z.array(CardSchema).min(1),
  brand: BrandSchema,
  // true면 <out>/<id>/ 서브폴더 없이 <out>/ 바로 밑에 저장 (--flat CLI 플래그와 동일)
  flat: z.boolean().optional(),
});

export type RenderCardNewsInput = z.infer<typeof RenderCardNewsInputSchema>;

export interface RenderedCard extends StorageResult {
  index: number;
  type: string;
}

function stripUndefined<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export async function renderCardNews(
  input: RenderCardNewsInput
): Promise<{ id: string; theme: string; rendered_cards: RenderedCard[] }> {
  const id = input.id ?? `cardnews-${Date.now()}`;
  const theme = loadTheme(input.theme);
  const storage = await createStorage();
  const brand = stripUndefined((input.brand ?? {}) as Record<string, unknown>);

  // 테마 기본 컨텍스트 + 클라이언트 브랜드 오버라이드
  const base = { ...theme.context, ...brand };

  const total_pages = input.cards.filter((c) => c.type === "body").length;
  const thumbnailImage = input.cards.find((c) => c.type === "thumbnail")?.image_url;

  const results: RenderedCard[] = [];

  for (const card of input.cards) {
    let html: string;

    if (card.type === "thumbnail") {
      html = theme.templates.thumbnail({
        ...base,
        title: card.title ?? "",
        image_url: card.image_url,
        category: card.category,
      });
    } else if (card.type === "body") {
      html = theme.templates.body({
        ...base,
        title: card.title ?? "",
        body: card.body ?? "",
        image_url: card.image_url,
        page_number: card.page_number ?? card.index,
        total_pages,
      });
    } else {
      html = theme.templates.closing({
        ...base,
        cta: (base as any).cta ?? "지금 팔로우하세요",
        image_url: card.image_url ?? thumbnailImage,
      });
    }

    const png = await renderHtmlToPng(html);
    const key = input.flat ? `${card.index}_${card.type}` : `${id}/${card.index}_${card.type}`;
    const stored = await storage.save(key, png);
    results.push({ index: card.index, type: card.type, ...stored });
  }

  return { id, theme: theme.name, rendered_cards: results };
}
