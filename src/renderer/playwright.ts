import { chromium as playwrightChromium, type Browser } from "playwright";

const IS_VERCEL = process.env.VERCEL === "1";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;

  let launched: Browser;
  if (IS_VERCEL) {
    // 서버리스 환경: @sparticuz/chromium + playwright-core (optional deps)
    // 변수 specifier로 동적 import → 미설치 시에도 typecheck 통과
    const sparticuzMod = "@sparticuz/chromium";
    const coreMod = "playwright-core";
    const chromiumPkg = (await import(sparticuzMod)).default;
    const { chromium: playwrightCore } = await import(coreMod);
    const executablePath = await chromiumPkg.executablePath();
    launched = await playwrightCore.launch({
      args: chromiumPkg.args,
      executablePath,
      headless: true,
    });
  } else {
    // 로컬: 번들된 Chromium 사용
    launched = await playwrightChromium.launch({ headless: true });
  }

  browser = launched;
  return launched;
}

export async function renderHtmlToPng(html: string): Promise<Buffer> {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.setViewportSize({ width: 720, height: 720 });
    await page.setContent(html, { waitUntil: "networkidle" });
    // 폰트/이미지 로딩 대기
    await page.waitForTimeout(300);
    const screenshot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: 720, height: 720 },
    });
    return Buffer.from(screenshot);
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
