/** Title and treehouse scenery (#30, #44): the big oak, the treehouse and ground strips. */
import { PixelArt, rng } from '../../engine/pixelart';
import type { Sprite } from '../../engine/sprites';
import { pal } from '../palette';

/** The oak: a textured trunk with roots and two big limbs. */
export const OAK_TRUNK: Sprite = (() => {
  const p = new PixelArt(72, 150);
  for (let y = 0; y < 150; y++) {
    const w = 20 + Math.max(0, (y - 110) * 0.9);
    const cx = 36 + Math.round(Math.sin(y / 23) * 2);
    p.rect(Math.round(cx - w / 2), y, Math.round(w), 1, 2);
  }
  // limbs reaching out under the canopy
  for (let t = 0; t < 30; t++) {
    p.rect(26 - t, 20 - Math.round(t * 0.6), 6, 5, 2);
    p.rect(44 + t * 0.8, 26 - Math.round(t * 0.7), 6, 5, 2);
  }
  // bark: vertical fissures and knots
  const r = rng(12);
  for (let i = 0; i < 40; i++) {
    const x = 24 + Math.floor(r() * 24);
    const y0 = Math.floor(r() * 140);
    for (let y = y0; y < y0 + 6 + r() * 12; y++) if (p.get(x, y) === 2) p.set(x, y, 1);
  }
  p.ellipse(42, 70, 3, 4, 1);
  p.ellipse(42, 70, 1.5, 2, 3);
  // light on the left edge
  for (let y = 0; y < 150; y++)
    for (let x = 1; x < 72; x++) if (p.get(x, y) === 2 && p.get(x - 1, y) === 0 && y % 3) p.set(x, y, 3);
  return p.toSprite('oak_trunk');
})();
export const OAK_TRUNK_PAL = pal('darkBrown', 'brown', 'rust');

/** Canopy clusters: dark leaves with a moonlit top rim. */
export const OAK_CANOPY: Sprite = (() => {
  const p = new PixelArt(256, 70);
  const r = rng(31);
  for (let i = 0; i < 26; i++) p.ellipse(10 + r() * 236, 18 + r() * 34, 16 + r() * 14, 10 + r() * 8, 2);
  for (let y = 0; y < 70; y++) for (let x = 0; x < 256; x++) if (p.get(x, y) === 2 && (x * 7 + y * 5) % 9 === 0) p.set(x, y, 1);
  const src = p.px.slice();
  for (let y = 1; y < 70; y++)
    for (let x = 0; x < 256; x++) {
      if (src[y * 256 + x] !== 2) continue;
      if (src[(y - 1) * 256 + x] === 0 || (y > 2 && src[(y - 2) * 256 + x] === 0 && x % 2)) p.set(x, y, 3);
      if (y < 69 && src[(y + 1) * 256 + x] === 0) p.set(x, y, 1);
    }
  return p.toSprite('oak_canopy');
})();
export const OAK_CANOPY_PAL = pal('black', 'darkGreen', 'midGreen');

/** The treehouse: plank walls, shingle roof, a lit window and a rope ladder. */
export const TREEHOUSE: Sprite = (() => {
  const p = new PixelArt(136, 72);
  // roof
  p.tri(2, 26, 68, 0, 134, 26, 1);
  for (let y = 4; y < 26; y += 3) for (let x = 0; x < 136; x++) if (p.get(x, y) === 1 && (x + y) % 6 < 3) p.set(x, y, 2);
  // walls: horizontal planks
  p.rect(10, 26, 116, 34, 2);
  for (let y = 28; y < 60; y += 4) p.hline(10, y, 116, 1);
  for (let y = 26; y < 60; y += 4) for (let x = 10 + ((y / 4) % 3) * 13; x < 126; x += 37) p.vline(x, y + 1, 3, 1);
  // windows, one lit
  for (const [wx, lit] of [[22, true], [94, false]] as const) {
    p.rect(wx - 1, 31, 22, 18, 1);
    p.rect(wx, 32, 20, 16, lit ? 3 : 1);
    p.rect(wx + 9, 32, 2, 16, 1).rect(wx, 39, 20, 2, 1);
  }
  // deck and supports
  p.rect(0, 60, 136, 4, 2).hline(0, 60, 136, 3).hline(0, 63, 136, 1);
  for (let x = 4; x < 136; x += 8) p.vline(x, 64, 8, 1);
  // a sign over the door
  p.rect(56, 30, 24, 8, 1).rect(57, 31, 22, 6, 3);
  for (let x = 59; x < 77; x += 3) p.set(x, 33, 1).set(x + 1, 34, 1);
  // door
  p.rect(60, 40, 16, 20, 1);
  p.vline(68, 40, 20, 2);
  return p.toSprite('treehouse');
})();
export const TREEHOUSE_PAL = pal('darkBrown', 'brown', 'yellow');

export const ROPE_LADDER: Sprite = (() => {
  const p = new PixelArt(12, 90);
  for (let y = 0; y < 90; y++) {
    const sway = Math.round(Math.sin(y / 30) * 1);
    p.set(1 + sway, y, 1).set(10 + sway, y, 1);
    if (y % 8 === 4) p.hline(1 + sway, y, 10, 2);
  }
  return p.toSprite('rope_ladder');
})();
export const ROPE_PAL = pal('tan', 'brown', 'brown');

/** A drip of blood under the logo letters. */
export const DRIP: Sprite = (() => {
  const p = new PixelArt(3, 6);
  p.vline(1, 0, 4, 1).rect(0, 4, 3, 2, 1).set(1, 5, 2);
  return p.toSprite('drip');
})();
export const DRIP_PAL = pal('crimson', 'red', 'red');

export function allScenerySprites(): Sprite[] {
  return [OAK_TRUNK, OAK_CANOPY, TREEHOUSE, ROPE_LADDER, DRIP];
}
