/**
 * Visual regression (#66). Builds nothing itself: run after `vite build`
 * (`npm run test:visual` does both). Serves dist/, opens it with `?capture`,
 * takes every named shot from src/capture.ts and compares it pixel for pixel
 * with test/visual/golden/<name>.png.
 *
 *   npm run test:visual               compare
 *   npm run test:visual -- --update   rewrite the goldens
 *   npm run test:visual -- title hub  only these shots
 *
 * On a mismatch the actual frame and a diff (changed pixels in red over a
 * dimmed copy of the golden) are written to test/visual/out/.
 */
import { chromium } from 'playwright';
import { preview } from 'vite';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const GOLDEN = 'test/visual/golden';
const OUT = 'test/visual/out';
const args = process.argv.slice(2);
const update = args.includes('--update');
const only = args.filter((a) => !a.startsWith('--'));

const png = (dataUrl: string) => Buffer.from(dataUrl.split(',')[1], 'base64');
const dataUrl = (file: string) => 'data:image/png;base64,' + readFileSync(file).toString('base64');

const server = await preview({ preview: { port: 4173, strictPort: false }, logLevel: 'warn' });
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('vite preview did not report a URL');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 512, height: 480 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
// tsx keeps function names with an `__name` helper that the page does not have
await page.addInitScript('globalThis.__name = (f) => f');
await page.goto(url + '?capture');
await page.waitForFunction(() => 'shots' in ((window as unknown as { __capture?: object }).__capture ?? {}));

type Api = { shots: string[]; shoot(n: string): string };
const all = await page.evaluate(() => (window as unknown as { __capture: Api }).__capture.shots);
const shots = only.length ? all.filter((s) => only.includes(s)) : all;
const unknown = only.filter((s) => !all.includes(s));
if (unknown.length) throw new Error(`Unknown shots: ${unknown.join(', ')}`);

mkdirSync(GOLDEN, { recursive: true });
let failed = 0;
for (const name of shots) {
  const actual = await page.evaluate((n) => (window as unknown as { __capture: Api }).__capture.shoot(n), name);
  const file = join(GOLDEN, `${name}.png`);
  if (update) {
    writeFileSync(file, png(actual));
    console.log(`  updated  ${name}`);
    continue;
  }
  if (!existsSync(file)) {
    failed++;
    console.log(`  MISSING  ${name} (run with --update to create it)`);
    continue;
  }
  const result = await page.evaluate(
    async ([a, b]) => {
      const load = (src: string) =>
        new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = src;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { diff: -1, url: '' };
      const pixels = (img: HTMLImageElement) => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d')!;
        g.drawImage(img, 0, 0);
        return { c, g, d: g.getImageData(0, 0, c.width, c.height) };
      };
      const pa = pixels(ia);
      const pb = pixels(ib);
      let diff = 0;
      const out = pb.g.createImageData(pb.c.width, pb.c.height);
      for (let i = 0; i < pa.d.data.length; i += 4) {
        const same = pa.d.data[i] === pb.d.data[i] && pa.d.data[i + 1] === pb.d.data[i + 1] && pa.d.data[i + 2] === pb.d.data[i + 2];
        if (!same) diff++;
        out.data[i] = same ? pb.d.data[i] >> 2 : 255;
        out.data[i + 1] = same ? pb.d.data[i + 1] >> 2 : 0;
        out.data[i + 2] = same ? pb.d.data[i + 2] >> 2 : 64;
        out.data[i + 3] = 255;
      }
      pb.g.putImageData(out, 0, 0);
      return { diff, url: diff ? pb.c.toDataURL('image/png') : '' };
    },
    [actual, dataUrl(file)] as const,
  );
  if (result.diff === 0) {
    console.log(`  ok       ${name}`);
    continue;
  }
  failed++;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${name}.actual.png`), png(actual));
  if (result.url) writeFileSync(join(OUT, `${name}.diff.png`), png(result.url));
  console.log(`  FAILED   ${name}: ${result.diff < 0 ? 'size differs' : `${result.diff} pixels differ`} (see ${OUT}/)`);
}

await browser.close();
await new Promise<void>((res) => server.httpServer.close(() => res()));
if (errors.length) {
  console.error('Page errors:\n  ' + errors.join('\n  '));
  process.exit(1);
}
if (failed) {
  console.error(`Visual check FAILED: ${failed} of ${shots.length} shots`);
  process.exit(1);
}
console.log(`Visual check OK: ${shots.length} shots ${update ? 'written' : 'match their goldens'}.`);
