/**
 * Parallax backdrops (#31, #40 dressing pass). Every layer is a 4-colour sprite
 * (transparent + 3) generated with PixelArt, so the whole background obeys the
 * same palette rule as the characters. Layers repeat horizontally and scroll at
 * a fraction of the camera speed; a few animate (stars, fog, candles, slime).
 */
import { PixelArt, rng } from '../../engine/pixelart';
import type { Sprite } from '../../engine/sprites';
import { pal, type SpritePalette } from '../palette';
import type { Theme } from './tiles';

export interface BackLayer {
  frames: Sprite[];
  pal: SpritePalette;
  /** Screen y of the strip's top edge. */
  y: number;
  /** Parallax factor: 0 = fixed to the screen, 1 = moves with the level. */
  factor: number;
  /** Constant scroll in px/s (clouds, fog). */
  drift?: number;
  fps?: number;
  /** Non-repeating sprite pinned at this screen x (moon). */
  x?: number;
  /** Horizontal gap between repeats (default: sprite width). */
  every?: number;
  /** Offset of the first repeat. */
  offset?: number;
}

const W = 256;

/* ------------------------------------------------------------------ */
/* Shared generators                                                    */
/* ------------------------------------------------------------------ */

/** A dithered vertical gradient between two colours, 32px wide, tiled across the screen. */
function skyBand(name: string, top: string, bottom: string, y0: number, y1: number): BackLayer {
  const p = new PixelArt(32, y1 - y0).gradientV(0, 0, 32, y1 - y0, 1, 2);
  return { frames: [p.toSprite(name)], pal: pal(top, bottom, bottom), y: y0, factor: 0 };
}

function starField(name: string, h: number, seed: number): Sprite[] {
  const r = rng(seed);
  const stars: { x: number; y: number; big: boolean; tw: boolean }[] = [];
  for (let i = 0; i < 46; i++) stars.push({ x: Math.floor(r() * W), y: Math.floor(Math.pow(r(), 1.6) * h), big: r() < 0.12, tw: r() < 0.4 });
  return [0, 1].map((f) => {
    const p = new PixelArt(W, h);
    for (const s of stars) {
      const bright = s.tw ? (f === 0 ? 3 : 2) : s.big ? 3 : 1;
      p.set(s.x, s.y, bright);
      if (s.big && !(s.tw && f === 1)) {
        p.set(s.x - 1, s.y, 1).set(s.x + 1, s.y, 1).set(s.x, s.y - 1, 1).set(s.x, s.y + 1, 1);
      }
    }
    return p.toSprite(`${name}_${f}`);
  });
}

function moonSprite(name: string, r: number): Sprite {
  const d = r * 2 + 2;
  const c = r + 1;
  const p = new PixelArt(d, d);
  p.circle(c, c, r, 1);
  // terminator shadow on the lower right
  for (let y = 0; y < d; y++)
    for (let x = 0; x < d; x++) {
      if (!p.get(x, y)) continue;
      const k = Math.hypot(x - c + r * 0.35, y - c + r * 0.35);
      if (k > r * 1.05) p.set(x, y, 2);
      else if (k > r * 0.92 && (x + y) % 2 === 0) p.set(x, y, 2);
    }
  const cr = rng(r * 7 + 3);
  for (let i = 0; i < Math.round(r * 0.5); i++) {
    const a = cr() * Math.PI * 2;
    const dist = cr() * r * 0.7;
    const rr = 1 + Math.floor(cr() * (r / 5));
    const x = c + Math.cos(a) * dist;
    const y = c + Math.sin(a) * dist;
    p.circle(x, y, rr, 3);
    p.circle(x - 0.6, y - 0.6, Math.max(0.6, rr - 1), 2);
  }
  return p.toSprite(name);
}

/** Soft dithered halo; transparent pixels let the sky through. */
function haloSprite(name: string, r: number): Sprite {
  const d = r * 2;
  const p = new PixelArt(d, d);
  for (let y = 0; y < d; y++)
    for (let x = 0; x < d; x++) {
      const k = Math.hypot(x - r + 0.5, y - r + 0.5) / r;
      if (k > 1) continue;
      const density = (1 - k) * 0.9;
      const th = ((([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)]) + 0.5) / 16);
      if (th < density) p.set(x, y, k < 0.55 ? 2 : 1);
    }
  return p.toSprite(name);
}

/** Highlight top edges with `hi` and darken bottom edges with `lo` for any pixels of colour `body`. */
function shadeEdges(p: PixelArt, body: number, hi: number, lo: number, depth = 1): void {
  const src = p.px.slice();
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= p.w || y >= p.h ? 0 : src[y * p.w + ((x + p.w) % p.w)]);
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (src[y * p.w + x] !== body) continue;
      for (let k = 1; k <= depth; k++) {
        if (at(x, y - k) === 0 && hi) p.set(x, y, hi);
        if (at(x, y + k) === 0 && lo) p.set(x, y, lo);
      }
    }
}

/* ------------------------------------------------------------------ */
/* Suburb (Night 3)                                                     */
/* ------------------------------------------------------------------ */

function clouds(name: string, seed: number): Sprite {
  const p = new PixelArt(W, 36);
  const r = rng(seed);
  for (let i = 0; i < 5; i++) {
    const cx = r() * W;
    const cy = 14 + r() * 12;
    const len = 30 + r() * 50;
    for (let k = 0; k < 6; k++) p.ellipse(cx + (k - 2.5) * (len / 6), cy - Math.sin((k / 5) * Math.PI) * 5, len / 6 + 3, 4 + r() * 3, 2, true);
  }
  shadeEdges(p, 2, 3, 1);
  // dithered underbelly
  for (let y = 0; y < p.h; y++) for (let x = 0; x < W; x++) if (p.get(x, y) === 2 && p.get(x, y + 2) === 0 && (x + y) % 2) p.set(x, y, 1);
  return p.toSprite(name);
}

function farRooftops(name: string, seed: number, h: number, church = false, litChance = 0.18): Sprite {
  const p = new PixelArt(W, h);
  const r = rng(seed);
  let x = 0;
  while (x < W) {
    const bw = 14 + Math.floor(r() * 24);
    const bh = 12 + Math.floor(r() * (h - 26));
    const top = h - bh;
    p.rectWrap(x, top, bw, bh, 1);
    const kind = r();
    if (kind < 0.45) p.tri(x - 2, top + 1, x + bw / 2, top - 8 - r() * 6, x + bw + 2, top + 1, 1, true);
    else if (kind < 0.7) p.rectWrap(x + 3 + Math.floor(r() * (bw - 8)), top - 6, 3, 6, 1);
    else if (kind < 0.8) {
      p.rectWrap(x + bw / 2, top - 10, 1, 10, 1);
      p.rectWrap(x + bw / 2 - 3, top - 8, 7, 1, 1);
    }
    // lit windows
    for (let wy = top + 4; wy < h - 4; wy += 6)
      for (let wx = x + 2; wx < x + bw - 2; wx += 5) if (r() < litChance) p.rectWrap(wx, wy, 2, 2, 3);
    x += bw + (r() < 0.3 ? 2 : 0);
  }
  if (church) {
    const cx = 170;
    p.rectWrap(cx, h - 46, 22, 46, 1);
    p.tri(cx - 1, h - 46, cx + 11, h - 76, cx + 23, h - 46, 1, true);
    p.rectWrap(cx + 10, h - 86, 2, 10, 1);
    p.rectWrap(cx + 7, h - 83, 8, 2, 1);
    p.rectWrap(cx + 8, h - 38, 6, 9, 3);
    p.rectWrap(cx + 10, h - 38, 2, 9, 1);
  }
  shadeEdges(p, 1, 2, 0);
  return p.toSprite(name);
}

function suburbTrees(name: string, seed: number): Sprite {
  const h = 110;
  const p = new PixelArt(W, h);
  const r = rng(seed);
  for (let i = 0; i < 4; i++) {
    const tx = 20 + i * 64 + Math.floor(r() * 24);
    const top = 10 + Math.floor(r() * 30);
    p.rectWrap(tx - 2, top + 30, 5, h - top - 30, 1);
    for (let k = 0; k < 7; k++) p.ellipse(tx + (r() - 0.5) * 30, top + 10 + r() * 30, 10 + r() * 8, 9 + r() * 6, 2, true);
  }
  // leaf texture: dark dither inside, light rim on top
  for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) if (p.get(x, y) === 2 && ((x * 7 + y * 3) % 5 === 0)) p.set(x, y, 1);
  shadeEdges(p, 2, 3, 0);
  return p.toSprite(name);
}

function suburbHouses(name: string): Sprite {
  const h = 104;
  const p = new PixelArt(W, h);
  const house = (x: number, w: number, wallTop: number, lit: number[]) => {
    // walls with siding
    p.rectWrap(x, wallTop, w, h - wallTop, 2);
    for (let y = wallTop + 3; y < h; y += 4) for (let xx = x; xx < x + w; xx++) if ((xx + y) % 2 === 0) p.setWrap(xx, y, 1);
    // roof
    const peak = wallTop - Math.floor(w * 0.35);
    p.tri(x - 4, wallTop + 1, x + w / 2, peak, x + w + 4, wallTop + 1, 1, true);
    for (let y = peak + 4; y < wallTop; y += 3) for (let xx = x - 4; xx < x + w + 4; xx++) if (p.get(((xx % W) + W) % W, y) === 1 && (xx + y) % 4 === 0) p.setWrap(xx, y, 2);
    // chimney
    p.rectWrap(x + w - 14, peak + 6, 6, 14, 1);
    p.rectWrap(x + w - 15, peak + 5, 8, 2, 2);
    // windows
    const wy = wallTop + 8;
    const slots = Math.floor((w - 8) / 18);
    for (let i = 0; i < slots; i++) {
      const wx = x + 6 + i * 18;
      const on = lit.includes(i);
      p.rectWrap(wx - 1, wy - 1, 12, 14, 1);
      p.rectWrap(wx, wy, 10, 12, on ? 3 : 1);
      if (on) {
        p.rectWrap(wx + 4, wy, 2, 12, 1);
        p.rectWrap(wx, wy + 5, 10, 1, 1);
      } else {
        p.rectWrap(wx, wy, 10, 12, 1);
        p.rectWrap(wx + 1, wy + 1, 2, 2, 2);
      }
      // second storey
      if (h - wy > 40) {
        p.rectWrap(wx - 1, wy + 27, 12, 14, 1);
        p.rectWrap(wx, wy + 28, 10, 12, lit.includes(i + 10) ? 3 : 1);
        p.rectWrap(wx + 4, wy + 28, 2, 12, 1);
      }
    }
    // door with porch light
    const dx = x + Math.floor(w / 2) - 6;
    p.rectWrap(dx, h - 24, 12, 24, 1);
    p.rectWrap(dx + 9, h - 13, 1, 1, 2);
    p.rectWrap(dx - 4, h - 26, 2, 2, 3);
  };
  house(6, 92, 34, [0, 2, 11]);
  house(134, 104, 46, [1, 3]);
  return p.toSprite(name);
}

function hedges(name: string, seed: number): Sprite {
  const h = 30;
  const p = new PixelArt(W, h);
  const r = rng(seed);
  // picket fence
  for (let x = 0; x < W; x += 6) {
    p.rectWrap(x, 8, 4, h - 8, 3);
    p.setWrap(x, 8, 0).setWrap(x + 3, 8, 0);
    p.rectWrap(x + 4, 8, 2, h - 8, 0);
  }
  p.rectWrap(0, 13, W, 2, 3);
  p.rectWrap(0, 22, W, 2, 3);
  // hedge clumps in front of parts of the fence
  for (let i = 0; i < 6; i++) {
    const cx = r() * W;
    const w = 18 + r() * 26;
    for (let k = 0; k < 5; k++) p.ellipse(cx + (k - 2) * (w / 5), h - 6 - r() * 6, w / 5 + 4, 8 + r() * 4, 2, true);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) if (p.get(x, y) === 2 && (x * 5 + y * 3) % 7 === 0) p.set(x, y, 1);
  shadeEdges(p, 2, 3, 1);
  return p.toSprite(name);
}

/* ------------------------------------------------------------------ */
/* Graveyard (Night 2, finale)                                          */
/* ------------------------------------------------------------------ */

function branch(p: PixelArt, x: number, y: number, ang: number, len: number, thick: number, depth: number, r: () => number): void {
  const x2 = x + Math.cos(ang) * len;
  const y2 = y + Math.sin(ang) * len;
  for (let t = -Math.floor(thick / 2); t <= Math.floor((thick - 1) / 2); t++) p.line(Math.round(x + t), Math.round(y), Math.round(x2 + t), Math.round(y2), 1);
  if (depth <= 0 || len < 3) return;
  const n = 2 + (r() < 0.4 ? 1 : 0);
  for (let i = 0; i < n; i++) branch(p, x2, y2, ang + (r() - 0.5) * 1.6, len * (0.55 + r() * 0.2), Math.max(1, thick - 1), depth - 1, r);
}

function deadTrees(name: string, seed: number): Sprite {
  const h = 150;
  const p = new PixelArt(W, h);
  const r = rng(seed);
  for (const tx of [34, 150, 214]) {
    const trunkTop = 40 + Math.floor(r() * 30);
    for (let y = trunkTop; y < h; y++) {
      const wob = Math.round(Math.sin(y / 9) * 1.5);
      const w = 4 + Math.floor((y - trunkTop) / 14);
      p.rect(tx - Math.floor(w / 2) + wob, y, w, 1, 1);
    }
    for (let i = 0; i < 4; i++) branch(p, tx, trunkTop + i * 8, -Math.PI / 2 + (r() - 0.5) * 1.8, 20 + r() * 14, 3, 4, r);
    // roots
    p.tri(tx - 10, h, tx, h - 12, tx + 10, h, 1);
  }
  // moonlit rim on the left of every trunk/branch pixel
  const src = p.px.slice();
  for (let y = 0; y < h; y++) for (let x = 1; x < W; x++) if (src[y * W + x] === 1 && src[y * W + x - 1] === 0 && (y % 3)) p.set(x, y, 2);
  return p.toSprite(name);
}

function fog(name: string, seed: number, frame: number): Sprite {
  const h = 26;
  const p = new PixelArt(W, h);
  const r = rng(seed);
  const blobs: { x: number; y: number; rx: number; ry: number }[] = [];
  for (let i = 0; i < 9; i++) blobs.push({ x: r() * W, y: 8 + r() * 12, rx: 20 + r() * 30, ry: 5 + r() * 5 });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < W; x++) {
      let d = 0;
      for (const b of blobs) {
        for (const off of [-W, 0, W]) {
          const k = Math.hypot((x - b.x - off) / b.rx, (y - b.y) / b.ry);
          if (k < 1) d = Math.max(d, 1 - k);
        }
      }
      const th = ([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][((y + frame) & 3) * 4 + (x & 3)] + 0.5) / 16;
      if (th < d * 0.75) p.set(x, y, d > 0.55 ? 2 : 1);
    }
  return p.toSprite(`${name}_${frame}`);
}

function ironFence(name: string): Sprite {
  const h = 46;
  const p = new PixelArt(W, h);
  for (let x = 0; x < W; x += 5) {
    p.rectWrap(x, 10, 1, h - 10, 1);
    p.setWrap(x, 8, 1).setWrap(x - 1, 9, 1).setWrap(x + 1, 9, 1).setWrap(x, 9, 1);
  }
  p.rectWrap(0, 14, W, 1, 1);
  p.rectWrap(0, h - 8, W, 1, 1);
  // stone gate pillars with urns
  for (const px of [0, 128]) {
    p.rectWrap(px, 6, 12, h - 6, 2);
    p.rectWrap(px - 1, 4, 14, 3, 3);
    p.rectWrap(px + 2, 0, 8, 4, 2);
    p.rectWrap(px + 4, -2 + 1, 4, 2, 3);
    for (let y = 10; y < h; y += 6) p.rectWrap(px, y, 12, 1, 1);
    p.rectWrap(px + 6, 13, 1, 6, 1);
    p.rectWrap(px + 1, 6, 1, h - 6, 3);
  }
  // headstones peeking up between
  const stone = (x: number, w: number, hh: number, cross: boolean) => {
    if (cross) {
      p.rectWrap(x + w / 2 - 1, h - hh, 3, hh, 2);
      p.rectWrap(x, h - hh + 4, w, 3, 2);
      p.rectWrap(x + w / 2 - 1, h - hh, 1, hh, 3);
    } else {
      p.rectWrap(x, h - hh + 3, w, hh - 3, 2);
      p.ellipse(x + w / 2, h - hh + 4, w / 2, 4, 2, true);
      p.rectWrap(x + 1, h - hh + 3, 1, hh - 4, 3);
      p.rectWrap(x + 3, h - hh + 8, w - 6, 1, 1);
      p.rectWrap(x + 3, h - hh + 11, w - 6, 1, 1);
    }
  };
  stone(30, 12, 22, false);
  stone(62, 9, 26, true);
  stone(92, 14, 18, false);
  stone(170, 10, 24, false);
  stone(206, 9, 30, true);
  stone(232, 12, 16, false);
  return p.toSprite(name);
}

/* ------------------------------------------------------------------ */
/* Mansion (Night 1)                                                    */
/* ------------------------------------------------------------------ */

function wallpaper(name: string): Sprite {
  const h = 112;
  const p = new PixelArt(32, h, 1);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < 32; x++) {
      const a = (x + y) % 32;
      const b = (x - y + 320) % 32;
      if (a === 0 || b === 0) p.set(x, y, (x + y) % 2 ? 2 : 1);
    }
  const fleur = ['..3..', '.333.', '3.3.3', '..3..', '.2.2.', '2...2'];
  for (let y = 0; y < h; y += 32) {
    p.stamp(fleur, 14, y + 13);
    p.stamp(fleur, -2, y - 3);
    p.stamp(fleur, 30, y - 3);
    p.stamp(fleur, -2, y + 29);
    p.stamp(fleur, 30, y + 29);
  }
  // darker toward the ceiling
  for (let y = 0; y < 14; y++) for (let x = 0; x < 32; x++) if ((x + y * 3) % (2 + Math.floor(y / 5)) === 0) p.set(x, y, 2);
  return p.toSprite(name);
}

function wainscot(name: string): Sprite {
  const h = 80;
  const p = new PixelArt(64, h, 2);
  // rail
  p.rect(0, 0, 64, 2, 3).rect(0, 2, 64, 2, 1).rect(0, 5, 64, 1, 3);
  // panels
  for (const px of [4, 36]) {
    p.rect(px, 12, 24, h - 22, 1);
    p.rect(px + 1, 13, 22, h - 24, 2);
    p.hline(px + 1, 13, 22, 3).vline(px + 1, 13, h - 24, 3);
    p.rect(px + 5, 18, 14, h - 34, 1);
    p.rect(px + 6, 19, 12, h - 36, 2);
    p.hline(px + 6, h - 18, 12, 3).vline(px + 17, 19, h - 36, 3);
  }
  for (let x = 0; x < 64; x += 2) p.set(x, h - 4, 1);
  p.rect(0, h - 3, 64, 3, 1);
  return p.toSprite(name);
}

function moulding(name: string): Sprite {
  const p = new PixelArt(16, 10, 2);
  p.hline(0, 0, 16, 1).hline(0, 3, 16, 3).hline(0, 9, 16, 1);
  for (let x = 0; x < 16; x += 4) p.rect(x + 1, 5, 2, 3, 1).set(x + 1, 5, 3);
  return p.toSprite(name);
}

function mansionWindow(name: string): Sprite {
  const w = 40;
  const h = 92;
  const p = new PixelArt(w, h);
  // arched frame
  p.rect(0, 16, w, h - 16, 1);
  p.ellipse(w / 2, 18, w / 2, 18, 1);
  p.rect(3, 18, w - 6, h - 22, 2);
  p.ellipse(w / 2, 20, w / 2 - 3, 16, 2);
  // moonlight streaks on the glass
  for (let y = 4; y < h - 6; y++) for (let x = 3; x < w - 3; x++) if (p.get(x, y) === 2 && (x - y * 0.6 + 200) % 14 < 2) p.set(x, y, 3);
  // mullions
  p.rect(w / 2 - 1, 4, 2, h - 8, 1);
  for (const y of [30, 52, 74]) p.rect(3, y, w - 6, 1, 1);
  // sill
  p.rect(-1 + 1, h - 5, w, 5, 1);
  p.hline(0, h - 5, w, 3);
  return p.toSprite(name);
}

function curtain(name: string, flip: boolean): Sprite {
  const w = 16;
  const h = 100;
  const p = new PixelArt(w, h);
  for (let y = 0; y < h; y++) {
    const pinch = y > 54 && y < 64 ? 5 : 0;
    const width = w - pinch - Math.max(0, Math.floor((y - 64) / 10));
    for (let x = 0; x < width; x++) {
      const fold = (x + Math.floor(y / 30)) % 5;
      p.set(x, y, fold === 0 ? 1 : fold === 2 ? 3 : 2);
    }
  }
  p.rect(0, 57, w - 4, 3, 3); // tie-back
  const q = new PixelArt(w, h);
  q.blit(p, 0, 0, flip);
  return q.toSprite(name);
}

function portrait(name: string): Sprite {
  const p = new PixelArt(30, 38);
  p.rect(0, 0, 30, 38, 1);
  p.rect(2, 2, 26, 34, 3);
  for (let i = 0; i < 30; i += 3) p.set(i, 0, 3).set(i, 37, 3);
  p.rect(4, 4, 22, 30, 2);
  // the gloomy ancestor whose eyes follow you
  p.ellipse(15, 15, 6, 8, 3);
  p.rect(10, 21, 10, 10, 1);
  p.tri(6, 34, 15, 22, 24, 34, 1);
  p.rect(12, 14, 2, 1, 2).rect(17, 14, 2, 1, 2);
  p.rect(13, 19, 4, 1, 2);
  p.rect(9, 7, 12, 3, 1);
  return p.toSprite(name);
}

function candle(name: string, frame: number): Sprite {
  const p = new PixelArt(14, 22);
  // brass sconce
  p.rect(2, 16, 10, 2, 1).rect(6, 18, 2, 4, 1).rect(1, 15, 2, 2, 1).rect(11, 15, 2, 2, 1);
  p.rect(5, 8, 4, 8, 2);
  p.set(5, 8, 3);
  // flame
  const fl = frame === 0 ? ['..3..', '.333.', '.323.', '..2..'] : ['...3.', '..33.', '.323.', '..2..'];
  p.stamp(fl, 4, 3);
  return p.toSprite(`${name}_${frame}`);
}

function glow(name: string, r: number): Sprite {
  const d = r * 2;
  const p = new PixelArt(d, d);
  for (let y = 0; y < d; y++)
    for (let x = 0; x < d; x++) {
      const k = Math.hypot(x - r + 0.5, y - r + 0.5) / r;
      if (k > 1) continue;
      const th = ([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      if (th < (1 - k) * 0.5) p.set(x, y, 1);
    }
  return p.toSprite(name);
}

/* ------------------------------------------------------------------ */
/* Sewer (Night 4)                                                      */
/* ------------------------------------------------------------------ */

function sewerWall(name: string, seed: number): Sprite {
  const h = 192;
  const p = new PixelArt(W, h, 1);
  const r = rng(seed);
  // running-bond bricks
  for (let y = 0; y < h; y += 8)
    for (let x = 0; x < W; x += 16) {
      const ox = (y / 8) % 2 ? 8 : 0;
      if (r() < 0.04) continue; // missing brick
      p.rectWrap(x + ox + 1, y + 1, 14, 6, 2);
      // a few bricks are darker so the wall isn't a flat grid
      if (r() < 0.25) p.checker(x + ox + 1, y + 1, 14, 6, 1);
    }
  // two tunnel arches receding into darkness
  for (const ax of [40, 168]) {
    const aw = 56;
    const top = 60;
    p.ellipse(ax + aw / 2, top + 26, aw / 2 + 6, 32, 2);
    for (let y = top - 6; y < h; y++) for (let x = ax - 6; x < ax + aw + 6; x++) if (p.get(x, y) === 2 && ((x * 3 + y) % 6 === 0)) p.set(x, y, 3);
    p.rect(ax - 6, top + 26, aw + 12, h - top - 26, 2);
    p.ellipse(ax + aw / 2, top + 26, aw / 2, 26, 1);
    p.rect(ax, top + 26, aw, h - top - 26, 1);
    // a far-off arch inside
    p.ellipse(ax + aw / 2, top + 50, 12, 14, 2);
    p.ellipse(ax + aw / 2, top + 52, 9, 11, 1);
    p.rect(ax + aw / 2 - 9, top + 52, 18, h, 1);
  }
  // damp streaks
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(r() * W);
    const y0 = Math.floor(r() * 40);
    for (let y = y0; y < y0 + 30 + r() * 60; y++) if (p.get(x, y) === 2) p.set(x, y, 3);
  }
  // darker toward the ceiling, and dimmed overall so the play area reads first
  for (let y = 0; y < 30; y++) for (let x = 0; x < W; x++) if (([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)] + 0.5) / 16 < (1 - y / 30) * 0.8) p.set(x, y, 1);
  for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) if (p.get(x, y) === 2 && (x + y) % 2 === 0 && y % 4 !== 1) p.set(x, y, 1);
  return p.toSprite(name);
}

function pipes(name: string): Sprite {
  const h = 120;
  const p = new PixelArt(W, h);
  const pipe = (y: number, th: number) => {
    p.rectWrap(0, y, W, th, 2);
    p.rectWrap(0, y, W, 1, 1);
    p.rectWrap(0, y + 1, W, 1, 3);
    p.rectWrap(0, y + th - 1, W, 1, 1);
    for (let x = 12; x < W; x += 64) {
      p.rectWrap(x, y - 1, 4, th + 2, 2);
      p.rectWrap(x, y - 1, 1, th + 2, 3);
      p.rectWrap(x + 3, y - 1, 1, th + 2, 1);
    }
  };
  pipe(6, 8);
  pipe(70, 5);
  // a drop pipe and a valve wheel
  p.rect(200, 14, 6, 56, 2).vline(200, 14, 56, 3).vline(205, 14, 56, 1);
  p.circle(203, 40, 6, 1);
  p.circle(203, 40, 5, 3);
  p.circle(203, 40, 3, 0);
  p.line(198, 40, 208, 40, 3).line(203, 35, 203, 45, 3);
  // brackets up to the ceiling
  for (let x = 44; x < W; x += 64) p.rectWrap(x, 0, 2, 6, 1);
  return p.toSprite(name);
}

function slime(name: string, frame: number): Sprite {
  const p = new PixelArt(W, 12);
  for (let x = 0; x < W; x++) {
    const hgt = 5 + Math.round(Math.sin((x + frame * 4) / 7) * 1.5 + Math.sin(x / 3.1) * 0.8);
    p.rect(x, 12 - hgt, 1, hgt, 2);
    p.set(x, 12 - hgt, 3);
    if ((x + frame) % 9 === 0) p.set(x, 12 - hgt + 2, 3);
  }
  for (let x = 0; x < W; x += 2) p.set(x + frame % 2, 11, 1);
  return p.toSprite(`${name}_${frame}`);
}

/* ------------------------------------------------------------------ */
/* Storm drain (Night 5)                                                */
/* ------------------------------------------------------------------ */

function culvert(name: string): Sprite {
  const h = 192;
  const p = new PixelArt(W, h, 1);
  const cx = W / 2;
  const cy = 112;
  // concrete ring segments receding into the dark: thick arcs, black gaps
  const rings: [number, number][] = [
    [136, 10],
    [106, 8],
    [82, 6],
    [62, 5],
    [46, 4],
    [34, 3],
    [25, 2],
  ];
  for (const [rad, th] of rings) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < W; x++) {
        const k = Math.hypot(x - cx, (y - cy) / 0.86);
        if (k <= rad && k > rad - th) {
          const a = Math.atan2(y - cy, x - cx);
          const seam = Math.abs(Math.sin(a * 8)) < 0.06;
          p.set(x, y, seam ? 1 : k > rad - 1 && y < cy ? 3 : 2);
        }
      }
  }
  // a trickle of water along the culvert floor
  for (let x = 40; x < 216; x++) if ((x * 7) % 5 < 2) p.set(x, h - 2, 3);
  return p.toSprite(name);
}

function lightShafts(name: string): Sprite {
  const h = 192;
  const p = new PixelArt(W, h);
  for (const sx of [56, 188]) {
    // grate in the ceiling
    p.rect(sx - 9, 0, 20, 4, 1);
    for (let x = sx - 8; x < sx + 10; x += 3) p.rect(x, 0, 1, 4, 2);
    for (let y = 4; y < h; y++) {
      const spread = 8 + y * 0.18;
      const fade = 1 - y / h;
      for (let x = Math.floor(sx - spread + y * 0.12); x < sx + spread + y * 0.12; x++) {
        const edge = 1 - Math.abs(x - (sx + y * 0.12)) / spread;
        const th = ([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)] + 0.5) / 16;
        if (th < edge * fade * 0.42) p.set(x, y, edge > 0.6 && y < 60 ? 3 : 2);
      }
    }
  }
  return p.toSprite(name);
}

function rain(name: string, frame: number): Sprite {
  const p = new PixelArt(64, 64);
  const r = rng(77);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(r() * 64);
    const y = (Math.floor(r() * 64) + frame * 16) % 64;
    p.set(x, y, 1).set(x, (y + 1) % 64, 1).set(x, (y + 2) % 64, 2);
  }
  return p.toSprite(`${name}_${frame}`);
}

/* ------------------------------------------------------------------ */
/* Assembly                                                             */
/* ------------------------------------------------------------------ */

const MOON = moonSprite('bd_moon', 15);
const BIG_MOON = moonSprite('bd_moon_big', 22);
const HALO = haloSprite('bd_halo', 34);
const BIG_HALO = haloSprite('bd_halo_big', 48);
const STARS = starField('bd_stars', 120, 11);

export const BACKDROPS: Record<Theme, BackLayer[]> = {
  suburb: [
    skyBand('bd_sub_sky0', 'black', 'navy', 16, 96),
    skyBand('bd_sub_sky1', 'navy', 'indigo', 96, 176),
    skyBand('bd_sub_sky2', 'indigo', 'purple', 176, 208),
    { frames: STARS, pal: pal('lightGrey', 'mist', 'white'), y: 16, factor: 0.02, fps: 1.5 },
    { frames: [HALO], pal: pal('navy', 'indigo', 'indigo'), y: 16, factor: 0, x: 170 },
    { frames: [MOON], pal: pal('moon', 'sand', 'yellow'), y: 34, factor: 0, x: 188 },
    { frames: [clouds('bd_sub_clouds', 4)], pal: pal('navy', 'indigo', 'periwinkle'), y: 50, factor: 0.06, drift: 3 },
    { frames: [farRooftops('bd_sub_far', 9, 70)], pal: pal('navy', 'indigo', 'amber'), y: 120, factor: 0.15 },
    { frames: [suburbTrees('bd_sub_trees', 21)], pal: pal('black', 'darkGreen', 'midGreen'), y: 98, factor: 0.3 },
    { frames: [suburbHouses('bd_sub_houses')], pal: pal('black', 'darkGrey', 'yellow'), y: 104, factor: 0.45 },
    { frames: [hedges('bd_sub_hedge', 5)], pal: pal('black', 'darkGreen', 'grey'), y: 178, factor: 0.7 },
  ],
  graveyard: [
    skyBand('bd_gy_sky0', 'black', 'indigo', 16, 120),
    skyBand('bd_gy_sky1', 'indigo', 'plum', 120, 208),
    { frames: STARS, pal: pal('darkGrey', 'lavender', 'white'), y: 16, factor: 0.02, fps: 1.2 },
    { frames: [BIG_HALO], pal: pal('indigo', 'purple', 'purple'), y: 4, factor: 0, x: 140 },
    { frames: [BIG_MOON], pal: pal('moon', 'sand', 'yellow'), y: 30, factor: 0, x: 166 },
    { frames: [farRooftops('bd_gy_far', 31, 80, true, 0.04)], pal: pal('black', 'navy', 'amber'), y: 128, factor: 0.12 },
    { frames: [deadTrees('bd_gy_trees', 8)], pal: pal('black', 'darkGrey', 'darkGrey'), y: 58, factor: 0.3 },
    { frames: [0, 1, 2, 3].map((f) => fog('bd_gy_fog', 3, f)), pal: pal('purple', 'lavender', 'lavender'), y: 170, factor: 0.45, drift: 6, fps: 2 },
    { frames: [ironFence('bd_gy_fence')], pal: pal('black', 'darkGrey', 'grey'), y: 162, factor: 0.65 },
  ],
  mansion: [
    { frames: [wallpaper('bd_mn_paper')], pal: pal('darkRed', 'darkBrown', 'maroon'), y: 26, factor: 0.5 },
    { frames: [moulding('bd_mn_moulding')], pal: pal('black', 'darkBrown', 'brown'), y: 16, factor: 0.5 },
    { frames: [glow('bd_mn_glow', 22)], pal: pal('maroon', 'maroon', 'maroon'), y: 50, factor: 0.5, every: 128, offset: 102 },
    { frames: [mansionWindow('bd_mn_window')], pal: pal('darkBrown', 'navy', 'periwinkle'), y: 34, factor: 0.5, every: 256, offset: 30 },
    { frames: [curtain('bd_mn_curtain_l', false)], pal: pal('darkRed', 'crimson', 'red'), y: 28, factor: 0.5, every: 256, offset: 16 },
    { frames: [curtain('bd_mn_curtain_r', true)], pal: pal('darkRed', 'crimson', 'red'), y: 28, factor: 0.5, every: 256, offset: 66 },
    { frames: [portrait('bd_mn_portrait')], pal: pal('darkBrown', 'black', 'rust'), y: 52, factor: 0.5, every: 256, offset: 162 },
    { frames: [0, 1].map((f) => candle('bd_mn_candle', f)), pal: pal('rust', 'cream', 'yellow'), y: 62, factor: 0.5, every: 128, offset: 117, fps: 5 },
    { frames: [wainscot('bd_mn_wainscot')], pal: pal('black', 'darkBrown', 'brown'), y: 128, factor: 0.5 },
  ],
  sewer: [
    { frames: [sewerWall('bd_sw_wall', 14)], pal: pal('black', 'drainBlue', 'navy'), y: 16, factor: 0.3 },
    { frames: [pipes('bd_sw_pipes')], pal: pal('black', 'darkGrey', 'grey'), y: 24, factor: 0.55 },
    { frames: [0, 1, 2].map((f) => slime('bd_sw_slime', f)), pal: pal('black', 'bogGreen', 'olive'), y: 196, factor: 0.3, fps: 3 },
  ],
  drain: [
    { frames: [culvert('bd_dr_culvert')], pal: pal('black', 'drainBlue', 'teal'), y: 16, factor: 0.12 },
    { frames: [lightShafts('bd_dr_shafts')], pal: pal('black', 'teal', 'iceBlue'), y: 16, factor: 0.35 },
    { frames: [0, 1, 2, 3].map((f) => rain('bd_dr_rain', f)), pal: pal('teal', 'skyBlue', 'skyBlue'), y: 16, factor: 0.35, fps: 12, every: 64 },
  ],
  hub: [],
};

export function allBackdropSprites(): Sprite[] {
  const seen = new Set<string>();
  const out: Sprite[] = [];
  for (const layers of Object.values(BACKDROPS))
    for (const l of layers)
      for (const f of l.frames)
        if (!seen.has(f.name)) {
          seen.add(f.name);
          out.push(f);
        }
  return out;
}

export function allBackdropPalettes(): { name: string; pal: SpritePalette }[] {
  const out: { name: string; pal: SpritePalette }[] = [];
  for (const [theme, layers] of Object.entries(BACKDROPS)) layers.forEach((l, i) => out.push({ name: `${theme}:${i}:${l.frames[0].name}`, pal: l.pal }));
  return out;
}
