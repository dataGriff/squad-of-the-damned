/**
 * Hand-placed landmarks (#56): one or two set pieces per night that give each
 * place an identity. Drawn deliberately (not random), each within 3 colours.
 */
import { BAYER4, PixelArt } from '../../engine/pixelart';
import type { Sprite } from '../../engine/sprites';

/** 3×5 capitals for painted signs. */
const MINI: Record<string, string[]> = {
  M: ['1.1', '111', '111', '1.1', '1.1'],
  A: ['.1.', '1.1', '111', '1.1', '1.1'],
  P: ['11.', '1.1', '11.', '1..', '1..'],
  L: ['1..', '1..', '1..', '1..', '111'],
  E: ['111', '1..', '11.', '1..', '111'],
  G: ['.11', '1..', '1.1', '1.1', '.11'],
  R: ['11.', '1.1', '11.', '1.1', '1.1'],
  Y: ['1.1', '1.1', '.1.', '.1.', '.1.'],
};
function sign(p: PixelArt, text: string, x: number, y: number, c: number): void {
  [...text].forEach((ch, i) => {
    const g = MINI[ch];
    if (g) p.stamp(g.map((r) => r.replace(/1/g, String(c))), x + i * 4, y);
  });
}

/* ------------------------------------------------------------------ */
/* Night 1: the grand staircase and chandelier                          */
/* ------------------------------------------------------------------ */

const STAIR_STEPS = 11;
const STEP_W = 8;
const STEP_H = 6;

export const STAIRCASE: Sprite = (() => {
  const W = 128;
  const H = 112;
  const p = new PixelArt(W, H);
  // landing at the top right with its own balustrade
  const landY = H - STAIR_STEPS * STEP_H - 2;
  p.rect(STAIR_STEPS * STEP_W, landY, W - STAIR_STEPS * STEP_W, H - landY, 2);
  // treads and risers, with panelled stringer underneath
  for (let i = 0; i < STAIR_STEPS; i++) {
    const x = i * STEP_W;
    const y = H - (i + 1) * STEP_H;
    p.rect(x, y, W - x, STEP_H, 2);
    p.hline(x, y, STEP_W + 1, 3);
    p.vline(x, y, STEP_H, 1);
  }
  for (let i = 1; i < STAIR_STEPS; i += 3) {
    const x = i * STEP_W + 4;
    const y = H - i * STEP_H + 4;
    p.rect(x, y, 14, H - y - 4, 1).rect(x + 1, y + 1, 12, H - y - 6, 2).hline(x + 1, y + 1, 12, 3);
  }
  // handrail parallel to the stairs, balusters from each tread
  for (let x = 0; x < STAIR_STEPS * STEP_W; x++) {
    const y = H - 2 - Math.round((x / STEP_W) * STEP_H) - 20;
    p.set(x, y, 3).set(x, y + 1, 1);
    if (x % 6 === 3) {
      const tread = H - (Math.floor(x / STEP_W) + 1) * STEP_H;
      p.vline(x, y + 2, tread - y - 2, 1);
    }
  }
  for (let x = STAIR_STEPS * STEP_W; x < W; x++) {
    p.set(x, landY - 20, 3).set(x, landY - 19, 1);
    if (x % 6 === 3) p.vline(x, landY - 18, 18, 1);
  }
  // newel post at the foot of the stairs
  p.rect(0, H - 34, 6, 34, 1).rect(1, H - 33, 4, 32, 2).vline(1, H - 33, 32, 3);
  p.rect(-1 + 1, H - 38, 6, 4, 3).set(2, H - 40, 3).set(3, H - 40, 3);
  return p.toSprite('lm_staircase');
})();

/** The carpet runner, drawn over the staircase in reds. */
export const CARPET: Sprite = (() => {
  const W = 128;
  const H = 112;
  const p = new PixelArt(W, H);
  for (let i = 0; i < STAIR_STEPS; i++) {
    const x = i * STEP_W + 1;
    const y = H - (i + 1) * STEP_H;
    p.rect(x + 1, y + 1, STEP_W, 2, 3);
    p.rect(x, y + 3, 1, STEP_H - 3, 2);
    p.set(x + 1, y + 1, 1);
  }
  p.rect(STAIR_STEPS * STEP_W + 1, H - STAIR_STEPS * STEP_H - 1, 40, 2, 3);
  return p.toSprite('lm_carpet');
})();

export const CHANDELIER: Sprite = (() => {
  const p = new PixelArt(44, 40);
  p.vline(22, 0, 12, 1).vline(21, 0, 12, 2);
  p.ellipse(22, 16, 4, 4, 2).set(21, 14, 3);
  for (const [dx, y, w] of [[0, 18, 18], [0, 26, 12]] as const) {
    for (let x = -w; x <= w; x++) {
      const yy = y + Math.round((x * x) / (w * 3));
      p.set(22 + dx + x, yy, 2).set(22 + dx + x, yy + 1, 1);
    }
    for (const sx of [-w, -Math.round(w / 2), Math.round(w / 2), w]) {
      const bx = 22 + sx;
      const by = y + Math.round((sx * sx) / (w * 3)) - 4;
      p.rect(bx, by, 1, 4, 1).set(bx, by - 1, 3).set(bx, by - 2, 3); // candle and flame
      p.set(bx, by + 6, 3).set(bx, by + 8, 3); // crystal drops
    }
  }
  p.vline(22, 20, 14, 2).ellipse(22, 34, 2, 2, 2).set(22, 37, 3);
  return p.toSprite('lm_chandelier');
})();

/* ------------------------------------------------------------------ */
/* Night 2: the church with bell tower and stained glass                */
/* ------------------------------------------------------------------ */

export const CHURCH: Sprite = (() => {
  const W = 104;
  const H = 120;
  const p = new PixelArt(W, H);
  // bell tower with a spire and cross
  p.rect(10, 34, 24, H - 34, 1);
  p.tri(8, 36, 22, 2, 36, 36, 1);
  p.vline(22, 0, 6, 1).hline(19, 2, 7, 1);
  // belfry opening with the bell lit from below
  p.rect(16, 42, 12, 14, 2).ellipse(22, 42, 6, 4, 2);
  p.ellipse(22, 49, 3, 4, 3).hline(18, 52, 9, 3).set(22, 54, 1);
  // nave with a pitched roof
  p.rect(34, 60, W - 34, H - 60, 1);
  p.tri(30, 62, 68, 34, 104, 62, 1);
  // rose window in the gable: eight sectors of glass with black leading
  const rx = 68;
  const ry = 56;
  for (let y = -9; y <= 9; y++)
    for (let x = -9; x <= 9; x++) {
      const d = Math.hypot(x, y);
      if (d > 9) continue;
      const a = Math.atan2(y, x);
      const sector = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8);
      const lead = d > 8 || d < 2 || Math.abs(Math.sin(a * 4)) < 0.18;
      p.set(rx + x, ry + y, lead ? 1 : sector % 2 ? 2 : 3);
    }
  // tall lancet windows down the nave
  for (const wx of [44, 60, 76, 92]) {
    p.rect(wx, 76, 6, 22, 1);
    p.ellipse(wx + 3, 77, 3, 3, 1);
    for (let y = 75; y < 97; y++) for (let x = wx + 1; x < wx + 5; x++) if (p.get(x, y) === 1 && Math.hypot(x - wx - 2.5, Math.max(0, 77 - y)) < 3) p.set(x, y, (Math.floor(y / 4) + x) % 2 ? 2 : 3);
    p.hline(wx, 86, 6, 1);
  }
  // arched door
  p.rect(60, 104, 16, 16, 2).ellipse(68, 104, 8, 6, 2).vline(68, 100, 20, 1);
  return p.toSprite('lm_church');
})();

/* ------------------------------------------------------------------ */
/* Night 3: the water tower and Mr Grey's porch                         */
/* ------------------------------------------------------------------ */

export const WATER_TOWER: Sprite = (() => {
  const W = 52;
  const H = 104;
  const p = new PixelArt(W, H);
  // legs and cross bracing
  for (const [x0, x1] of [[10, 4], [20, 18], [32, 34], [42, 48]]) p.line(x0, 44, x1, H - 1, 1).line(x0 + 1, 44, x1 + 1, H - 1, 2);
  for (const y of [60, 78, 94]) p.hline(6, y, 40, 1);
  p.line(10, 46, 42, 76, 1).line(42, 46, 10, 76, 1).line(8, 78, 44, 96, 1).line(44, 78, 8, 96, 1);
  // tank
  p.rect(6, 12, 40, 30, 2);
  p.ellipse(26, 42, 20, 3, 2);
  p.tri(4, 13, 26, 0, 48, 13, 1);
  p.hline(4, 13, 44, 3);
  for (let y = 16; y < 42; y += 6) p.hline(6, y, 40, 1);
  p.vline(8, 13, 30, 3).vline(9, 13, 30, 3);
  // catwalk and rail
  p.hline(2, 44, 48, 3).hline(2, 40, 48, 3);
  for (let x = 2; x < 50; x += 4) p.vline(x, 40, 4, 1);
  sign(p, 'MAPLE', 16, 22, 3);
  return p.toSprite('lm_water_tower');
})();

export const GREY_HOUSE: Sprite = (() => {
  const W = 120;
  const H = 104;
  const p = new PixelArt(W, H);
  // walls with siding
  p.rect(8, 34, 104, H - 34, 2);
  for (let y = 37; y < H; y += 4) for (let x = 8; x < 112; x++) if ((x + y) % 2 === 0) p.set(x, y, 1);
  // roof and a turret-like gable over the porch
  p.tri(2, 35, 60, 4, 118, 35, 1);
  for (let y = 10; y < 34; y += 3) for (let x = 0; x < W; x++) if (p.get(x, y) === 1 && (x + y) % 4 === 0) p.set(x, y, 2);
  p.rect(86, 6, 8, 18, 1); // chimney
  // upstairs: one window lit, with a wolf's head in silhouette
  for (const [wx, lit] of [[22, false], [76, true]] as const) {
    p.rect(wx - 1, 42, 16, 18, 1);
    p.rect(wx, 43, 14, 16, lit ? 3 : 1);
    if (lit) {
      p.tri(wx + 3, 58, wx + 7, 47, wx + 11, 58, 1); // head
      p.tri(wx + 4, 49, wx + 5, 44, wx + 7, 49, 1).tri(wx + 8, 49, wx + 10, 44, wx + 10, 50, 1); // ears
      p.tri(wx + 1, 53, wx + 5, 51, wx + 5, 55, 1); // snout
    } else p.rect(wx + 1, 44, 3, 3, 2);
    p.vline(wx + 7, 43, 16, 1);
  }
  // porch: roof, columns, lit lamp, steps and the postman's door
  p.rect(28, 66, 64, 4, 1).hline(28, 66, 64, 2);
  for (const cx of [30, 50, 70, 88]) p.rect(cx, 70, 3, 28, 2).vline(cx, 70, 28, 1);
  p.rect(52, 72, 16, 26, 1).rect(54, 74, 12, 24, 2).set(63, 86, 3);
  sign(p, 'GREY', 52, 60, 3);
  p.rect(44, 72, 3, 4, 3); // porch lamp
  for (let i = 0; i < 3; i++) p.rect(44 - i * 2, 98 + i * 2, 32 + i * 4, 2, i % 2 ? 1 : 2);
  // mailbox on a post by the steps
  p.rect(100, 84, 8, 5, 2).vline(104, 89, 15, 1).rect(107, 81, 1, 4, 3);
  return p.toSprite('lm_grey_house');
})();

/* ------------------------------------------------------------------ */
/* Night 4: through a broken wall into the museum                       */
/* ------------------------------------------------------------------ */

function holeShape(x: number, y: number): boolean {
  const cx = 50;
  const cy = 54;
  const a = Math.atan2(y - cy, x - cx);
  const r = 36 + Math.round(Math.sin(a * 5) * 4 + Math.sin(a * 11) * 2);
  return Math.hypot(x - cx, (y - cy) * 0.9) < r;
}

export const MUSEUM: Sprite = (() => {
  const W = 100;
  const H = 104;
  const p = new PixelArt(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (holeShape(x, y)) p.set(x, y, 1);
  // spotlight cone from above
  for (let y = 20; y < 94; y++)
    for (let x = 0; x < W; x++) {
      if (!holeShape(x, y)) continue;
      const spread = 6 + (y - 20) * 0.35;
      const k = 1 - Math.abs(x - 50) / spread;
      if (k > 0 && (BAYER4[y & 3][x & 3] + 0.5) / 16 < k * 0.45) p.set(x, y, 3);
    }
  // the upright sarcophagus on its plinth
  p.ellipse(50, 44, 9, 10, 2);
  p.rect(41, 44, 18, 36, 2).tri(41, 80, 50, 84, 59, 80, 2);
  for (let y = 36; y < 54; y += 3) p.hline(42, y, 16, 1); // striped headdress
  p.ellipse(50, 45, 5, 6, 3); // golden face
  p.set(48, 44, 1).set(52, 44, 1).hline(49, 48, 3, 1);
  p.line(43, 60, 57, 66, 3).line(57, 60, 43, 66, 3); // crossed arms
  for (let y = 70; y < 80; y += 3) p.hline(44, y, 12, 3);
  p.rect(36, 84, 28, 6, 3).hline(36, 89, 28, 1);
  // rope barrier
  for (const px of [24, 76]) p.rect(px, 74, 2, 16, 2).rect(px - 1, 72, 4, 2, 3);
  for (let x = 26; x < 76; x++) p.set(x, 78 + Math.round(Math.sin(((x - 26) / 50) * Math.PI) * 4), 2);
  return p.toSprite('lm_museum');
})();

export const BROKEN_RIM: Sprite = (() => {
  const W = 100;
  const H = 104;
  const p = new PixelArt(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (holeShape(x, y)) continue;
      // a ring of broken bricks around the opening
      let near = false;
      for (let k = 1; k <= 5 && !near; k++) if (holeShape(x + k, y) || holeShape(x - k, y) || holeShape(x, y + k) || holeShape(x, y - k)) near = true;
      if (!near) continue;
      const brick = ((Math.floor(y / 4) % 2 ? x + 4 : x) % 8 === 0) || y % 4 === 0;
      p.set(x, y, brick ? 1 : 2);
      if (holeShape(x + 1, y) || holeShape(x, y + 1)) p.set(x, y, 3);
    }
  // rubble spilling out of the bottom of the hole
  for (const [x, y, w] of [[30, 92, 6], [38, 95, 5], [58, 93, 7], [66, 96, 4], [46, 97, 5]]) p.rect(x, y, w, 3, 2).hline(x, y, w, 3);
  return p.toSprite('lm_broken_rim');
})();

/* ------------------------------------------------------------------ */
/* Night 5: the great outflow grate                                     */
/* ------------------------------------------------------------------ */

export const OUTFLOW: Sprite = (() => {
  const S = 128;
  const p = new PixelArt(S, S);
  const c = S / 2;
  p.circle(c, c, 62, 1);
  p.circle(c, c, 60, 2);
  p.circle(c, c, 52, 1);
  // rivets around the collar
  for (let a = 0; a < 24; a++) p.set(c + Math.round(Math.cos((a / 24) * Math.PI * 2) * 56), c + Math.round(Math.sin((a / 24) * Math.PI * 2) * 56), 3);
  // heavy bars and two horizontal bands
  for (let x = c - 48; x <= c + 48; x += 10) for (let y = 0; y < S; y++) if (Math.hypot(x - c, y - c) < 52) p.set(x, y, 2).set(x + 1, y, 2).set(x + 2, y, 1);
  for (const by of [c - 18, c + 18]) for (let x = 0; x < S; x++) if (Math.hypot(x - c, by - c) < 52) p.set(x, by, 2).set(x, by + 1, 2).set(x, by + 2, 1).set(x, by - 1, 3);
  // moonlight catching the top of the collar
  for (let a = Math.PI * 1.1; a < Math.PI * 1.9; a += 0.02) p.set(c + Math.round(Math.cos(a) * 61), c + Math.round(Math.sin(a) * 61), 3);
  return p.toSprite('lm_outflow');
})();

/** Water pouring from the bottom of the grate (three frames). */
export const POUR: Sprite[] = [0, 1, 2].map((f) => {
  const p = new PixelArt(72, 40);
  for (let y = 0; y < 40; y++) {
    const w = 30 + Math.floor(y * 0.6);
    for (let x = 36 - w / 2; x < 36 + w / 2; x++) {
      const v = (Math.floor(x * 1.7) + y * 2 + f * 5) % 7;
      p.set(x, y, v === 0 ? 3 : v < 3 ? 1 : 2);
    }
  }
  for (let x = 4; x < 68; x++) if ((x + f * 3) % 4 < 2) p.set(x, 38 + ((x + f) % 2), 3); // foam
  return p.toSprite(`lm_pour_${f}`);
});

/* ------------------------------------------------------------------ */
/* Trees: a shaped oak and a weeping willow (replacing the blob trees)  */
/* ------------------------------------------------------------------ */

export const OAK: Sprite = (() => {
  const p = new PixelArt(80, 112);
  // trunk with a flared root and three limbs into the crown
  for (let y = 56; y < 112; y++) {
    const w = 7 + Math.max(0, (y - 98) * 0.9);
    p.rect(Math.round(40 - w / 2), y, Math.round(w), 1, 1);
  }
  p.limb(40, 66, 24, 44, 4, 1).limb(40, 62, 56, 42, 4, 1).limb(40, 60, 40, 36, 3, 1);
  // canopy: planned overlapping lobes giving a broad, rounded oak crown
  const lobes: [number, number, number, number][] = [
    [24, 22, 14, 11],
    [42, 14, 15, 11],
    [58, 24, 13, 11],
    [14, 38, 12, 10],
    [32, 36, 16, 12],
    [52, 38, 15, 11],
    [66, 44, 10, 8],
    [24, 52, 12, 8],
    [46, 52, 12, 8],
  ];
  for (const [x, y, rx, ry] of lobes) p.ellipse(x, y, rx, ry, 2);
  // inner shade where lobes overlap and on the underside of each lobe
  for (const [x, y, rx, ry] of lobes) for (let k = 0; k < rx * 1.6; k++) p.set(x - rx * 0.6 + k, y + ry * 0.6 + Math.round(Math.sin(k) * 1.5), 1);
  for (let y = 0; y < 112; y++) for (let x = 0; x < 80; x++) if (p.get(x, y) === 2 && (x * 5 + y * 3) % 11 === 0) p.set(x, y, 1);
  // moonlit rim along the top-left of the crown
  const src = p.px.slice();
  for (let y = 1; y < 112; y++)
    for (let x = 1; x < 80; x++) {
      if (src[y * 80 + x] !== 2) continue;
      if (src[(y - 1) * 80 + x] === 0 || (src[y * 80 + x - 1] === 0 && y % 2) || (y > 1 && src[(y - 2) * 80 + x] === 0 && x % 2)) p.set(x, y, 3);
    }
  // a few limbs showing through gaps in the leaves
  p.limb(30, 46, 22, 50, 2, 1).limb(50, 46, 60, 50, 2, 1);
  return p.toSprite('lm_oak');
})();

export const WILLOW: Sprite = (() => {
  const p = new PixelArt(76, 110);
  for (let y = 40; y < 110; y++) {
    const w = 5 + Math.max(0, (y - 98) * 0.9);
    p.rect(Math.round(38 - w / 2 + Math.sin(y / 14) * 2), y, Math.round(w), 1, 1);
  }
  p.ellipse(38, 30, 26, 14, 2);
  // weeping strands falling from the crown
  for (let i = 0; i < 26; i++) {
    const x0 = 14 + i * 1.9;
    const len = 30 + ((i * 7) % 5) * 9;
    for (let y = 26; y < 26 + len && y < 106; y++) p.set(Math.round(x0 + Math.sin(y / 9 + i) * 1.2), y, (y + i) % 5 === 0 ? 3 : 2);
  }
  for (let y = 16; y < 44; y++) for (let x = 12; x < 64; x++) if (p.get(x, y) === 2 && (x * 3 + y) % 7 === 0) p.set(x, y, 1);
  for (let x = 14; x < 62; x++) if (p.get(x, 17) === 2 || p.get(x, 18) === 2) p.set(x, 17, 3);
  return p.toSprite('lm_willow');
})();

export function allLandmarkSprites(): Sprite[] {
  return [STAIRCASE, CARPET, CHANDELIER, CHURCH, WATER_TOWER, GREY_HOUSE, MUSEUM, BROKEN_RIM, OUTFLOW, ...POUR, OAK, WILLOW];
}
