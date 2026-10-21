/**
 * Retro manual PDF (#49): generates docs/manual.pdf from the same page data
 * the in-game bestiary uses. Hand-rolled PDF (Helvetica + Courier, text only)
 * so there are no dependencies.
 */
import { writeFileSync } from 'node:fs';
import { MANUAL_PAGES } from '../src/game/manual';
import { KIDS, KID_ORDER } from '../src/game/squad';
import { CREATURE_ART } from '../src/game/art/monsters';

const W = 420, H = 595; // A5 portrait in points

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

interface Page { ops: string[] }
const pages: Page[] = [];
function page(): Page {
  const p = { ops: [] as string[] };
  pages.push(p);
  return p;
}
function text(p: Page, x: number, y: number, s: string, size = 11, font = 'F1'): void {
  p.ops.push(`BT /${font} ${size} Tf ${x} ${H - y} Td (${esc(s)}) Tj ET`);
}
function rect(p: Page, x: number, y: number, w: number, h: number, fill: string): void {
  p.ops.push(`${fill} rg ${x} ${H - y - h} ${w} ${h} re f 0 g`);
}
/** Draw a sprite as filled rectangles (pixel art in vector form). */
function sprite(p: Page, x: number, y: number, art: { sprite: { w: number; h: number; px: Uint8Array }; pal: readonly [null, string, string, string] }, scale: number, grey = false): void {
  const { sprite: s, pal } = art;
  for (let yy = 0; yy < s.h; yy++) for (let xx = 0; xx < s.w; xx++) {
    const v = s.px[yy * s.w + xx];
    if (!v) continue;
    const hex = grey ? '#3c3c3c' : (pal[v] as string);
    const n = parseInt(hex.slice(1), 16);
    const fill = `${(((n >> 16) & 255) / 255).toFixed(3)} ${(((n >> 8) & 255) / 255).toFixed(3)} ${((n & 255) / 255).toFixed(3)}`;
    rect(p, x + xx * scale, y + yy * scale, scale, scale, fill);
  }
}

// Cover
let p = page();
rect(p, 0, 0, W, H, '0 0 0.66');
text(p, 60, 160, 'SQUAD OF THE DAMNED', 28, 'F2');
text(p, 60, 190, 'MONSTER MANUAL', 18, 'F2');
text(p, 60, 230, 'Property of the squad. If found, return to the treehouse.', 10);
text(p, 60, 250, 'Do not show to parents.', 10);
KID_ORDER.forEach((id, i) => text(p, 60, 300 + i * 18, `${KIDS[id].name} - ${KIDS[id].blurb}`, 9, 'F2'));
text(p, 60, 540, 'A Hungovercoders game - 2026', 9);

// How to play
p = page();
text(p, 40, 60, 'HOW TO PLAY', 18, 'F2');
const howto = [
  'Arrows / WASD: move     Z: jump     X: ability     C: swap kid',
  'Enter: pause / manual   Up + X: fire silver (Casey)   Hold X: charge',
  '',
  'The squad shares one life bar. Streetlamps are checkpoints.',
  'Every monster has a weakness. It only works once you have found',
  'the page about it. Pages hide behind vents and cracked walls.',
  '',
  'Pip is the only one who fits through a vent.',
  'Bruno is the only one who can push a crate or break a cracked wall.',
  'Mo\'s garlic stuns anything standing in the cloud.',
  'Casey\'s pebbles are free. Silver is not: watch the counter.',
];
howto.forEach((l, i) => text(p, 40, 95 + i * 16, l, 10, 'F2'));

// One page per creature
for (const m of MANUAL_PAGES) {
  p = page();
  rect(p, 20, 20, W - 40, H - 40, '0.97 0.85 0.78');
  text(p, 40, 60, m.creature, 18, 'F2');
  text(p, 40, 80, m.night ? `NIGHT ${m.night}` : 'FIELD NOTES', 10, 'F2');
  const art = CREATURE_ART[m.art];
  sprite(p, 40, 100, art, 4);
  m.lore.forEach((l, i) => text(p, 200, 110 + i * 16, l, 11, 'F2'));
  text(p, 200, 180, 'WEAKNESS:', 11, 'F2');
  text(p, 200, 196, m.weaknessText, 11, 'F2');
  const hint = m.hint.match(/.{1,30}(\s|$)/g) ?? [m.hint];
  hint.forEach((l, i) => text(p, 200, 212 + i * 16, l.trim(), 11, 'F2'));
  text(p, 40, 540, `Page ${m.id}`, 8);
}

// Assemble the PDF
const objects: string[] = [];
const add = (s: string) => objects.push(s) && objects.length;
const fontN = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
const fontM = add('<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>');
const pageIds: number[] = [];
const pagesIdx = objects.length + pages.length * 2 + 1;
for (const pg of pages) {
  const stream = pg.ops.join('\n');
  const content = add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
  pageIds.push(add(`<< /Type /Page /Parent ${pagesIdx} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${content} 0 R /Resources << /Font << /F1 ${fontN} 0 R /F2 ${fontM} 0 R >> >> >>`));
}
const pagesObj = add(`<< /Type /Pages /Kids [${pageIds.map((i) => `${i} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
const catalog = add(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);
let out = '%PDF-1.4\n';
const offsets: number[] = [];
objects.forEach((o, i) => {
  offsets.push(Buffer.byteLength(out, 'latin1'));
  out += `${i + 1} 0 obj\n${o}\nendobj\n`;
});
const xref = Buffer.byteLength(out, 'latin1');
out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const o of offsets) out += `${o.toString().padStart(10, '0')} 00000 n \n`;
out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
writeFileSync('docs/manual.pdf', Buffer.from(out, 'latin1'));
console.log(`Wrote docs/manual.pdf (${pages.length} pages)`);
