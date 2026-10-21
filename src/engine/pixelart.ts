/**
 * Procedural pixel-art canvas. Draws with palette *indices* 0..3 (0 = transparent),
 * so anything made here still obeys the 4-colour sprite rule and passes the
 * palette check. Used for backdrops, auto-tiles and effects.
 */
import { defineSprite, type Sprite } from './sprites';

/** 4×4 ordered-dither (Bayer) thresholds, 0..15. */
export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Deterministic PRNG so generated art is identical on every run. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable per-tile hash for picking variants. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class PixelArt {
  px: Uint8Array;
  constructor(public w: number, public h: number, fill = 0) {
    this.px = new Uint8Array(w * h).fill(fill);
  }
  static from(s: Sprite): PixelArt {
    const p = new PixelArt(s.w, s.h);
    p.px.set(s.px);
    return p;
  }
  clone(): PixelArt {
    const p = new PixelArt(this.w, this.h);
    p.px.set(this.px);
    return p;
  }
  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number): number {
    return this.inside(x, y) ? this.px[y * this.w + x] : 0;
  }
  set(x: number, y: number, c: number): this {
    x = Math.floor(x);
    y = Math.floor(y);
    if (this.inside(x, y)) this.px[y * this.w + x] = c;
    return this;
  }
  /** Set with horizontal wrap, for seamless repeating strips. */
  setWrap(x: number, y: number, c: number): this {
    x = ((Math.floor(x) % this.w) + this.w) % this.w;
    return this.set(x, y, c);
  }
  rect(x: number, y: number, w: number, h: number, c: number): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
    return this;
  }
  rectWrap(x: number, y: number, w: number, h: number, c: number): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.setWrap(xx, yy, c);
    return this;
  }
  hline(x: number, y: number, w: number, c: number): this {
    return this.rect(x, y, w, 1, c);
  }
  vline(x: number, y: number, h: number, c: number): this {
    return this.rect(x, y, 1, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number): this {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number, wrap = false): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) wrap ? this.setWrap(x, y, c) : this.set(x, y, c);
      }
    return this;
  }
  circle(cx: number, cy: number, r: number, c: number, wrap = false): this {
    return this.ellipse(cx, cy, r, r, c, wrap);
  }
  /** Fill a triangle (used for roofs, spires, spikes). */
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number, wrap = false): this {
    const minY = Math.floor(Math.min(y0, y1, y2));
    const maxY = Math.ceil(Math.max(y0, y1, y2));
    const minX = Math.floor(Math.min(x0, x1, x2));
    const maxX = Math.ceil(Math.max(x0, x1, x2));
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area;
        const w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) wrap ? this.setWrap(x, y, c) : this.set(x, y, c);
      }
    return this;
  }
  /** Checkerboard of `c` over a rect (50% dither). */
  checker(x: number, y: number, w: number, h: number, c: number, phase = 0): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (((xx + yy) & 1) === phase) this.set(xx, yy, c);
    return this;
  }
  /**
   * Ordered-dither vertical blend: top rows are `a`, bottom rows are `b`,
   * with a Bayer pattern in between. The classic NES/C64 sky gradient.
   */
  gradientV(x: number, y: number, w: number, h: number, a: number, b: number): this {
    for (let yy = 0; yy < h; yy++) {
      const t = h <= 1 ? 1 : yy / (h - 1);
      for (let xx = 0; xx < w; xx++) {
        const th = (BAYER4[(y + yy) & 3][(x + xx) & 3] + 0.5) / 16;
        this.set(x + xx, y + yy, t > th ? b : a);
      }
    }
    return this;
  }
  /** Dither `c` over a rect at a density 0..1 using the Bayer matrix (keeps other pixels). */
  ditherFill(x: number, y: number, w: number, h: number, c: number, density: number): this {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) if ((BAYER4[yy & 3][xx & 3] + 0.5) / 16 < density) this.set(xx, yy, c);
    return this;
  }
  /** Random speckles of `c` with probability p, deterministic per seed. */
  speckle(x: number, y: number, w: number, h: number, c: number, p: number, seed: number, onlyOn?: number): this {
    const r = rng(seed);
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) if (r() < p && (onlyOn === undefined || this.get(xx, yy) === onlyOn)) this.set(xx, yy, c);
    return this;
  }
  /** Overlay pixel strings ('.' transparent = leave as is, '0' = clear, '1'..'3' = colour). */
  stamp(rows: string[], x: number, y: number, flip = false): this {
    for (let yy = 0; yy < rows.length; yy++) {
      const row = rows[yy];
      for (let xx = 0; xx < row.length; xx++) {
        const ch = row[flip ? row.length - 1 - xx : xx];
        if (ch === '.' || ch === ' ') continue;
        this.set(x + xx, y + yy, ch === '0' ? 0 : ch.charCodeAt(0) - 48);
      }
    }
    return this;
  }
  /** Draw colour `c` into transparent pixels that touch an opaque one (4-neighbour). */
  outline(c: number): this {
    const src = this.px.slice();
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (src[y * this.w + x]) continue;
        const n = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < this.w && yy < this.h && src[yy * this.w + xx] !== 0;
        if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) this.px[y * this.w + x] = c;
      }
    return this;
  }
  /** Replace every pixel of colour a with b. */
  swap(a: number, b: number): this {
    for (let i = 0; i < this.px.length; i++) if (this.px[i] === a) this.px[i] = b;
    return this;
  }
  /** Copy another canvas in, skipping its transparent pixels. */
  blit(src: PixelArt, x: number, y: number, flip = false): this {
    for (let yy = 0; yy < src.h; yy++)
      for (let xx = 0; xx < src.w; xx++) {
        const v = src.px[yy * src.w + (flip ? src.w - 1 - xx : xx)];
        if (v) this.set(x + xx, y + yy, v);
      }
    return this;
  }
  toRows(): string[] {
    const rows: string[] = [];
    for (let y = 0; y < this.h; y++) {
      let r = '';
      for (let x = 0; x < this.w; x++) {
        const v = this.px[y * this.w + x];
        r += v === 0 ? '.' : String(v);
      }
      rows.push(r);
    }
    return rows;
  }
  toSprite(name: string): Sprite {
    return defineSprite(name, this.toRows());
  }
}
