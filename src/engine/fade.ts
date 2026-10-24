/**
 * NES-style palette fade. Real hardware faded by stepping each colour down a
 * row of the palette; we emulate that by mapping every colour to the nearest
 * palette entry at roughly half its brightness, once per fade step.
 */
export type RGB = [number, number, number];

export function hexRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function nearest(c: RGB, palette: RGB[]): RGB {
  let best = palette[0];
  let bd = Infinity;
  for (const p of palette) {
    const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

/** One fade step: the palette colour nearest to half brightness (never brighter, black stays black). */
export function darker(c: RGB, palette: RGB[]): RGB {
  const target: RGB = [c[0] * 0.5, c[1] * 0.5, c[2] * 0.5];
  const lum = (x: RGB) => x[0] * 0.299 + x[1] * 0.587 + x[2] * 0.114;
  const cands = palette.filter((p) => lum(p) < lum(c) || lum(c) === 0);
  return cands.length ? nearest(target, cands) : [0, 0, 0];
}

export class Fader {
  private palette: RGB[] = [];
  private cache = new Map<number, number>();
  t = 0;
  dur = 0;
  steps = 3;

  setPalette(hexes: string[]): void {
    this.palette = hexes.map(hexRgb);
    if (!this.palette.some((p) => p[0] + p[1] + p[2] === 0)) this.palette.push([0, 0, 0]);
    this.cache.clear();
  }

  start(seconds: number): void {
    this.t = this.dur = seconds;
  }

  /** Current fade level: 0 = none, `steps` = black. */
  get level(): number {
    return this.t > 0 && this.dur > 0 ? Math.ceil((this.t / this.dur) * this.steps) : 0;
  }

  /** Map a packed 0xRRGGBB colour down `level` steps. */
  map(rgb: number, level: number): number {
    const key = rgb * 4 + level;
    let out = this.cache.get(key);
    if (out !== undefined) return out;
    let c: RGB = [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255];
    for (let i = 0; i < level; i++) c = this.palette.length ? darker(c, this.palette) : [c[0] >> 1, c[1] >> 1, c[2] >> 1];
    out = (c[0] << 16) | (c[1] << 8) | c[2];
    this.cache.set(key, out);
    return out;
  }

  /** Apply the current level to an RGBA pixel buffer in place. */
  apply(data: Uint8ClampedArray, level = this.level): void {
    if (level <= 0) return;
    for (let i = 0; i < data.length; i += 4) {
      const m = this.map((data[i] << 16) | (data[i + 1] << 8) | data[i + 2], level);
      data[i] = (m >> 16) & 255;
      data[i + 1] = (m >> 8) & 255;
      data[i + 2] = m & 255;
    }
  }

  tick(dt: number): void {
    if (this.t > 0) this.t = Math.max(0, this.t - dt);
  }
}
