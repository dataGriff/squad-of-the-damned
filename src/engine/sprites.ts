/**
 * Sprite atlas + animation system (#4).
 * Sprites are authored as pixel strings: '.' is transparent, '1'..'3' index the
 * 4-colour sprite palette. The atlas rasterises each (sprite, palette, flip)
 * combination once into an offscreen canvas.
 */
import type { SpritePalette } from '../game/palette';

export interface Sprite {
  name: string;
  w: number;
  h: number;
  /** Row-major palette indices 0..3 */
  px: Uint8Array;
}

export function defineSprite(name: string, rows: string[]): Sprite {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const px = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x] ?? '.';
      let v = 0;
      if (c === '1' || c === '2' || c === '3') v = c.charCodeAt(0) - 48;
      else if (c !== '.' && c !== ' ') throw new Error(`Sprite ${name}: bad pixel '${c}' at ${x},${y}`);
      px[y * w + x] = v;
    }
  }
  return { name, w, h, px };
}

/** Distinct palette indices used by a sprite (for the palette check). */
export function spriteColourCount(s: Sprite): number {
  const set = new Set<number>();
  for (const v of s.px) set.add(v);
  return set.size;
}

export function flipSprite(s: Sprite): Sprite {
  const px = new Uint8Array(s.w * s.h);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) px[y * s.w + (s.w - 1 - x)] = s.px[y * s.w + x];
  return { name: s.name + '_flip', w: s.w, h: s.h, px };
}

export interface AnimDef {
  frames: Sprite[];
  fps: number;
  loop: boolean;
}

export function anim(frames: Sprite[], fps = 8, loop = true): AnimDef {
  return { frames, fps, loop };
}

/** Per-entity animation state. */
export class Animator {
  current = '';
  frame = 0;
  time = 0;
  done = false;
  constructor(public anims: Record<string, AnimDef>, initial?: string) {
    if (initial) this.play(initial);
  }
  play(name: string, restart = false): void {
    if (this.current === name && !restart) return;
    if (!this.anims[name]) throw new Error(`No animation '${name}'`);
    this.current = name;
    this.frame = 0;
    this.time = 0;
    this.done = false;
  }
  update(dt: number): void {
    const a = this.anims[this.current];
    if (!a || a.frames.length <= 1) return;
    this.time += dt;
    const per = 1 / a.fps;
    while (this.time >= per) {
      this.time -= per;
      if (this.frame + 1 >= a.frames.length) {
        if (a.loop) this.frame = 0;
        else this.done = true;
      } else this.frame++;
    }
  }
  get sprite(): Sprite {
    const a = this.anims[this.current];
    return a.frames[Math.min(this.frame, a.frames.length - 1)];
  }
}

/** Rasterises sprites with palettes to canvases, cached. Browser-only. */
export class Atlas {
  private cache = new Map<string, HTMLCanvasElement>();
  /** Called on every lookup when set: capture mode records which palettes sprites are drawn in (#63). */
  onGet: ((sprite: Sprite, palette: SpritePalette) => void) | null = null;
  get(sprite: Sprite, palette: SpritePalette, flip = false): HTMLCanvasElement {
    this.onGet?.(sprite, palette);
    const key = `${sprite.name}|${palette.join(',')}|${flip ? 1 : 0}`;
    let c = this.cache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = sprite.w;
    c.height = sprite.h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(sprite.w, sprite.h);
    const rgb = palette.map((p) => (p ? hexRgb(p) : null));
    for (let y = 0; y < sprite.h; y++) {
      for (let x = 0; x < sprite.w; x++) {
        const v = sprite.px[y * sprite.w + x];
        const col = rgb[v];
        if (!col) continue;
        const sx = flip ? sprite.w - 1 - x : x;
        const i = (y * sprite.w + sx) * 4;
        img.data[i] = col[0];
        img.data[i + 1] = col[1];
        img.data[i + 2] = col[2];
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.cache.set(key, c);
    return c;
  }
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
