#!/usr/bin/env node
import { readFileSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import { loadTheme } from "./renderer/theme-loader.js";
import { renderHtmlToPng, closeBrowser } from "./renderer/playwright.js";

/**
 * Render a card's *background-less, transparent* overlay PNG — logo, badge,
 * title, gradient scrim — for compositing onto a video background with ffmpeg.
 *
 *   node dist/render-overlay-cli.js <spec.json> --card-index <n> --out <file.png>
 *
 * Only thumbnail cards are supported today (theme must ship
 * `thumbnail-overlay.html`). spec.json is the same file cardnews-copy produces.
 */
function parseArgs(argv: string[]) {
  const result: { specPath?: string; cardIndex?: number; out?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--card-index") {
      result.cardIndex = Number(argv[++i]);
    } else if (arg === "--out") {
      result.out = argv[++i];
    } else if (!arg.startsWith("--") && !result.specPath) {
      result.specPath = arg;
    }
  }
  return result;
}

async function main() {
  const { specPath, cardIndex, out } = parseArgs(process.argv.slice(2));

  if (!specPath || cardIndex === undefined || !out) {
    console.error("Usage: render-overlay-cli <spec.json> --card-index <n> --out <file.png>");
    process.exit(1);
  }

  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  const card = spec.cards?.find((c: { index: number }) => c.index === cardIndex);
  if (!card) throw new Error(`No card with index ${cardIndex} in ${specPath}`);
  if (card.type !== "thumbnail") {
    throw new Error(`Card ${cardIndex} is type "${card.type}" — overlay render only supports "thumbnail" today`);
  }

  const theme = loadTheme(spec.theme);
  if (!theme.templates.thumbnailOverlay) {
    throw new Error(
      `Theme "${theme.name}" has no thumbnail-overlay.html — add one (copy thumbnail.html, drop the bg-image layer) to enable video-card rendering`
    );
  }

  const brand = spec.brand ?? {};
  const html = theme.templates.thumbnailOverlay({
    ...theme.context,
    ...brand,
    title: card.title ?? "",
    category: card.category,
  });

  const png = await renderHtmlToPng(html, { omitBackground: true });
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, png);
  console.log(JSON.stringify({ path: out }, null, 2));
}

main()
  .then(async () => {
    await closeBrowser();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await closeBrowser();
    process.exit(1);
  });
