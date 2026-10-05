import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = process.argv[2] || 'assets/projects';
await fs.mkdir(outDir, { recursive: true });

const shots = [
  { name: 'burzh-beats', url: 'https://mburzhinsky-hub.github.io/burzh_beats/', scrollY: 0 },
  { name: 'burzh-beats-alt', url: 'https://mburzhinsky-hub.github.io/burzh_beats/', scrollY: 280 },
  { name: 'kid-go', url: 'https://mburzhinsky-hub.github.io/kid_go/', scrollY: 0 },
  { name: 'kid-go-alt', url: 'https://mburzhinsky-hub.github.io/kid_go/map/', scrollY: 0 },
  { name: '1001-dates', url: 'https://mburzhinsky-hub.github.io/1001dates/', scrollY: 0 },
  { name: '1001-dates-alt', url: 'https://mburzhinsky-hub.github.io/1001dates/', scrollY: 760 },
  { name: 'vision-photo', url: 'https://mburzhinsky-hub.github.io/vision_photo/', scrollY: 0 },
  { name: 'vision-photo-alt', url: 'https://mburzhinsky-hub.github.io/vision_photo/', scrollY: 520 }
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
});

async function capture(shot) {
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(shot.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
      await page.waitForTimeout(1800);
      if (shot.scrollY) {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), shot.scrollY);
        await page.waitForTimeout(700);
      }
      const png = path.join(outDir, `${shot.name}.png`);
      const webp = path.join(outDir, `${shot.name}.webp`);
      await page.screenshot({ path: png, fullPage: false, animations: 'disabled' });
      await sharp(png).webp({ quality: 84, effort: 5, smartSubsample: true }).toFile(webp);
      await fs.unlink(png);
      const stat = await fs.stat(webp);
      console.log(`${shot.name}: ${stat.size} bytes`);
      await page.close();
      return;
    } catch (err) {
      lastError = err;
      console.warn(`Attempt ${attempt} failed for ${shot.name}: ${err.message}`);
      await page.waitForTimeout(1200 * attempt);
    }
  }
  await page.close();
  throw lastError;
}

for (const shot of shots) await capture(shot);
await browser.close();
