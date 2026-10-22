/**
 * Renders the style guide (#65) headlessly and saves it to
 * docs/screenshots/styleguide.png (the design sections) and
 * docs/screenshots/styleguide-art.png (the art registry). Run after a build:
 * `npm run styleguide:shot` does both.
 */
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { port: 4174, strictPort: false }, logLevel: 'warn' });
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('vite preview did not report a URL');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1140, height: 900 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + 'styleguide.html');
await page.waitForFunction(() => document.body.dataset.ready === 'true');
const box = async (sel: string) => (await page.locator(sel).boundingBox())!;
const top = await box('main');
const art = await box('#art');
await page.screenshot({ path: 'docs/screenshots/styleguide.png', clip: { x: top.x, y: top.y, width: top.width, height: art.y - top.y }, fullPage: true });
await page.screenshot({ path: 'docs/screenshots/styleguide-art.png', clip: art, fullPage: true });
await browser.close();
await new Promise<void>((res) => server.httpServer.close(() => res()));
if (errors.length) {
  console.error('Style guide page errors:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log('Style guide captured: docs/screenshots/styleguide.png, docs/screenshots/styleguide-art.png');
