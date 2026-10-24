/**
 * Auto-tiles (#40). Every solid tile picks its look from its neighbours:
 * a surface lip where there is air above, corners and edge shading where
 * there is air to the side, a shadow where there is air below, and one of
 * four fill variants so long runs don't repeat. All generated with PixelArt
 * in the theme's 3-colour tile palette (1 dark, 2 mid, 3 light).
 */
import { PixelArt, rng } from '../../engine/pixelart';
import type { Sprite } from '../../engine/sprites';
import { pal, type SpritePalette } from '../palette';
import type { Theme } from './tiles';

export const AIR_U = 1;
export const AIR_L = 2;
export const AIR_R = 4;
export const AIR_D = 8;
export const VARIANTS = 4;
const T = 16;

type Painter = (p: PixelArt, v: number, mask: number) => void;

/* ---------------- fills ---------------- */

/** Running-bond bricks; tiles seamlessly because every tile paints the same grid. */
function bricks(p: PixelArt, bw: number, bh: number, mortar: number, body: number, hi: number, v: number, hiDensity = 0.5): void {
  const r = rng(v * 101 + bw);
  p.rect(0, 0, T, T, mortar);
  for (let y = 0; y < T; y += bh) {
    const ox = (y / bh) % 2 ? bw / 2 : 0;
    for (let x = -bw; x < T + bw; x += bw) {
      const bx = x + ox;
      p.rect(bx + 1, y + 1, bw - 1, bh - 1, body);
      if (hi && r() < hiDensity) p.hline(bx + 1, y + 1, bw - 2, hi);
    }
  }
}

const FILLS: Record<Theme, Painter> = {
  suburb: (p, v) => {
    // packed dirt with strata and pebbles
    p.rect(0, 0, T, T, 2);
    const r = rng(17 + v * 13);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (r() < 0.07) p.set(x, y, 1);
    for (let i = 0; i < 2 + v; i++) {
      const x = Math.floor(r() * 13);
      const y = Math.floor(r() * 13);
      p.rect(x, y, 3, 2, 1).set(x + 1, y, 2);
    }
    if (v === 3) p.line(2, 4, 7, 9, 1).line(7, 9, 12, 8, 1); // a root
  },
  graveyard: (p, v) => {
    // rubble stone: irregular blocks, one tile in four has a buried skull
    p.rect(0, 0, T, T, 1);
    const blocks: [number, number, number, number][] =
      v % 2 ? [[1, 1, 8, 6], [10, 1, 5, 6], [1, 8, 5, 7], [7, 8, 8, 7]] : [[1, 1, 5, 7], [7, 1, 8, 5], [1, 9, 9, 6], [7, 7, 8, 1], [11, 9, 4, 6]];
    for (const [x, y, w, h] of blocks) {
      p.rect(x, y, w, h, 2);
      p.hline(x, y, w - 1, 3);
      p.vline(x, y, h - 1, 3);
    }
    if (v === 2) p.stamp(['.333.', '31313', '33333', '.3.3.'], 6, 6);
    if (v === 3) p.stamp(['3..3', '.33.', '.33.', '3..3'], 3, 10);
  },
  mansion: (p, v) => {
    bricks(p, 8, 4, 1, 2, 3, v, 0.35);
  },
  sewer: (p, v) => {
    bricks(p, 8, 4, 1, 2, 0, v);
    const r = rng(5 + v * 7);
    // the odd damp brick
    if (v >= 2) {
      const x = Math.floor(r() * 10);
      const y = Math.floor(r() * 3) * 4;
      p.hline(x + 1, y + 1, 4, 3);
    }
  },
  drain: (p, v) => {
    // poured concrete slabs with seams, bolts and water stains
    p.rect(0, 0, T, T, 2);
    p.hline(0, 0, T, 1).vline(0, 0, T, 1);
    p.set(3, 3, 3).set(12, 3, 3).set(3, 12, 3).set(12, 12, 3);
    const r = rng(3 + v * 11);
    for (let i = 0; i < 2; i++) {
      const x = 2 + Math.floor(r() * 12);
      for (let y = 1; y < 6 + r() * 9; y++) if ((y + x) % 2) p.set(x, y, 1);
    }
    if (v === 1) p.line(5, 7, 10, 10, 1);
  },
  hub: (p, v) => {
    // wooden boards
    p.rect(0, 0, T, T, 2);
    for (const y of [0, 5, 10, 15]) p.hline(0, y, T, 1);
    const seam = (v * 5) % 16;
    p.vline(seam, 1, 4, 1).vline((seam + 8) % 16, 6, 4, 1).vline((seam + 3) % 16, 11, 4, 1);
    for (const y of [1, 6, 11]) p.hline(0, y, T, 3);
  },
};

/* ---------------- surface lips (air above) ---------------- */

const TOPS: Record<Theme, Painter> = {
  suburb: (p, v, m) => {
    // grass: tufts poke above the edge, blades, a dark fringe hanging into the dirt
    const r = rng(41 + v * 9);
    p.rect(0, 0, T, 5, 0);
    p.rect(0, 2, T, 3, 3);
    for (let x = 0; x < T; x++) {
      if (r() < 0.55) p.set(x, 1, 3);
      if (r() < 0.2) p.set(x, 0, 3);
      if ((x + v) % 3 === 0) p.set(x, 3, 1);
      p.set(x, 5, x % 2 ? 1 : 3);
      if (r() < 0.35) p.set(x, 6, 3);
    }
    if (m & AIR_L) p.rect(0, 0, 2, 2, 0).set(0, 2, 0);
    if (m & AIR_R) p.rect(14, 0, 2, 2, 0).set(15, 2, 0);
  },
  graveyard: (p, v, m) => {
    // worn slab with a bright lip and a few weeds
    p.rect(0, 0, T, 4, 2);
    p.hline(0, 0, T, 3);
    p.hline(0, 4, T, 1);
    for (let x = 2 + v; x < T; x += 5) p.set(x, 2, 1);
    if (v === 1) p.set(4, 0, 0).set(5, 0, 0);
    if (m & AIR_L) p.set(0, 0, 0);
    if (m & AIR_R) p.set(15, 0, 0);
  },
  mansion: (p, v, m) => {
    // polished floorboards over the brick foundation
    p.rect(0, 0, T, 6, 2);
    p.hline(0, 0, T, 3);
    p.hline(0, 5, T, 1);
    const seam = (v * 6 + 3) % 16;
    p.vline(seam, 1, 4, 1);
    p.set((seam + 2) % 16, 2, 3).set((seam + 10) % 16, 3, 3);
    p.hline(0, 6, T, 3);
    p.hline(0, 7, T, 1);
    if (m & AIR_L) p.set(0, 0, 1);
    if (m & AIR_R) p.set(15, 0, 1);
  },
  sewer: (p, v, m) => {
    // slick coping stones with slime dripping over the edge
    p.rect(0, 0, T, 4, 2);
    p.hline(0, 0, T, 3);
    p.hline(0, 4, T, 1);
    const r = rng(23 + v * 5);
    for (let x = 0; x < T; x++) {
      if (r() < 0.3) {
        const len = 1 + Math.floor(r() * 4);
        p.vline(x, 4, len, 3);
      }
    }
    if (m & AIR_L) p.set(0, 0, 0);
    if (m & AIR_R) p.set(15, 0, 0);
  },
  drain: (p, v, m) => {
    // steel edge with hazard notches
    p.rect(0, 0, T, 4, 1);
    p.hline(0, 0, T, 3);
    p.hline(0, 1, T, 2);
    for (let x = (v % 2) * 2; x < T; x += 4) p.rect(x, 2, 2, 1, 3);
    if (m & AIR_L) p.set(0, 0, 2);
    if (m & AIR_R) p.set(15, 0, 2);
  },
  hub: (p, _v, m) => {
    p.hline(0, 0, T, 3);
    if (m & AIR_L) p.set(0, 0, 1);
    if (m & AIR_R) p.set(15, 0, 1);
  },
};

/* ---------------- assembly ---------------- */

function solidTile(theme: Theme, mask: number, v: number): PixelArt {
  const p = new PixelArt(T, T);
  FILLS[theme](p, v, mask);
  // side edges: dark outline with a highlight just inside on the lit (left) side
  if (mask & AIR_L) {
    p.vline(0, 0, T, 1);
    for (let y = 0; y < T; y += 2) p.set(1, y, theme === 'suburb' ? 1 : 3);
  }
  if (mask & AIR_R) {
    p.vline(15, 0, T, 1);
    for (let y = 1; y < T; y += 2) p.set(14, y, 1);
  }
  if (mask & AIR_D) {
    p.hline(0, 15, T, 1);
    for (let x = 0; x < T; x += 2) p.set(x, 14, 1);
  }
  if (mask & AIR_U) TOPS[theme](p, v, mask);
  return p;
}

function crackedTile(theme: Theme, mask: number, v: number): PixelArt {
  const p = solidTile(theme, mask & ~AIR_U, v);
  // bold fracture lines with a lit edge: obviously breakable
  const lines: [number, number, number, number][] = [
    [7, 0, 5, 5],
    [5, 5, 9, 9],
    [9, 9, 6, 15],
    [9, 9, 14, 11],
    [5, 5, 1, 7],
  ];
  for (const [a, b, c, d] of lines) {
    p.line(a, b, c, d, 1);
    p.line(a + 1, b, c + 1, d, 3);
  }
  p.rect(6, 6, 2, 2, 1);
  return p;
}

function pillarTile(theme: Theme, mask: number): PixelArt {
  const p = new PixelArt(T, T);
  p.rect(2, 0, 12, T, 2);
  p.vline(2, 0, T, 1).vline(13, 0, T, 1);
  p.vline(4, 0, T, 3).vline(7, 0, T, 1).vline(10, 0, T, 1).vline(12, 0, T, 1);
  if (mask & AIR_U) {
    p.rect(0, 0, T, 4, 2).hline(0, 0, T, 3).hline(0, 3, T, 1).vline(0, 0, 4, 1).vline(15, 0, 4, 1);
  }
  if (mask & AIR_D) {
    p.rect(0, 12, T, 4, 2).hline(0, 12, T, 3).hline(0, 15, T, 1).vline(0, 12, 4, 1).vline(15, 12, 4, 1);
  }
  void theme;
  return p;
}

type PlatformStyle = 'wood' | 'stone' | 'metal';
const PLATFORM_STYLE: Record<Theme, PlatformStyle> = { suburb: 'wood', graveyard: 'stone', mansion: 'wood', sewer: 'metal', drain: 'metal', hub: 'wood' };

function platformTile(style: PlatformStyle, mask: number, v: number): PixelArt {
  const p = new PixelArt(T, T);
  if (style === 'wood') {
    p.rect(0, 0, T, 5, 2).hline(0, 0, T, 3).hline(0, 4, T, 1);
    p.set((v * 5 + 2) % 16, 2, 1).set((v * 5 + 3) % 16, 2, 1).set((v * 7 + 9) % 16, 1, 1);
    if (mask & AIR_L) p.vline(0, 0, 5, 1).rect(2, 5, 2, 4, 1).set(3, 9, 1).line(2, 5, 6, 5, 1);
    if (mask & AIR_R) p.vline(15, 0, 5, 1).rect(12, 5, 2, 4, 1).set(12, 9, 1).line(9, 5, 13, 5, 1);
  } else if (style === 'stone') {
    p.rect(0, 0, T, 5, 2).hline(0, 0, T, 3).hline(0, 5, T, 1);
    for (let x = 0; x < T; x += 2) p.set(x, 4, 1);
    p.vline((v * 4 + 6) % 16, 1, 3, 1);
    if (mask & AIR_L) p.rect(0, 0, 1, 6, 1).tri(1, 6, 6, 6, 1, 10, 1);
    if (mask & AIR_R) p.rect(15, 0, 1, 6, 1).tri(9, 6, 14, 6, 14, 10, 1);
  } else {
    // grated catwalk
    p.rect(0, 0, T, 4, 2).hline(0, 0, T, 3).hline(0, 3, T, 1);
    for (let x = 1; x < T; x += 3) p.set(x, 1, 1).set(x, 2, 1);
    for (let x = 0; x < T; x += 4) p.line(x, 4, x + 3, 7, 1);
    p.hline(0, 7, T, 1);
    if (mask & AIR_L) p.vline(0, 0, 8, 1);
    if (mask & AIR_R) p.vline(15, 0, 8, 1);
  }
  return p;
}

function ladderTile(style: PlatformStyle, top: boolean): PixelArt {
  const p = new PixelArt(T, T);
  const rail = (x: number) => p.vline(x, 0, T, 1).vline(x + 1, 0, T, style === 'wood' ? 2 : 3).vline(x + 2, 0, T, 1);
  rail(1);
  rail(12);
  for (let y = 2; y < T; y += 5) {
    p.hline(4, y, 8, style === 'wood' ? 2 : 3);
    p.hline(4, y + 1, 8, 1);
  }
  if (top) {
    p.rect(1, 0, 3, 2, 3).rect(12, 0, 3, 2, 3);
  }
  return p;
}

function spikeTile(): PixelArt {
  const p = new PixelArt(T, T);
  for (let i = 0; i < 4; i++) {
    const x = i * 4;
    for (let y = 3; y < 12; y++) {
      const half = Math.floor((y - 3) / 4);
      for (let k = -half; k <= half + 1; k++) p.set(x + 1 + k, y, k <= 0 ? 3 : 2);
    }
    p.set(x + 1, 2, 3);
    p.vline(x + 3, 6, 6, 1);
  }
  p.rect(0, 12, T, 4, 1).hline(0, 12, T, 2);
  for (let x = 1; x < T; x += 5) p.set(x, 14, 3);
  return p;
}

function ventTile(): PixelArt {
  const p = new PixelArt(T, T);
  p.rect(0, 0, T, T, 1);
  p.rect(1, 1, 14, 14, 2);
  for (let y = 3; y < 14; y += 3) {
    p.hline(2, y, 12, 1);
    p.hline(2, y - 1, 12, 3);
  }
  p.set(1, 1, 3).set(14, 1, 3).set(1, 14, 3).set(14, 14, 3);
  return p;
}

function waterTile(surface: boolean, frame: number): PixelArt {
  const p = new PixelArt(T, T, 2);
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      if ((x * 3 + y * 5 + frame * 4) % 23 === 0) p.set(x, y, 3);
      if ((x + y * 2 + frame) % 11 === 0 && y > 6) p.set(x, y, 1);
    }
  if (surface) {
    p.rect(0, 0, T, 2, 0);
    for (let x = 0; x < T; x++) {
      const wy = 1 + Math.round(Math.sin((x + frame * 3) * 0.8));
      p.set(x, wy, 3);
      for (let y = 0; y < wy; y++) p.set(x, y, 0);
    }
  }
  return p;
}

/* ---------------- tables ---------------- */

export interface TileArt {
  sprite: Sprite;
  pal: SpritePalette;
}

export const SPIKE_PAL = pal('darkGrey', 'grey', 'white');
export const VENT_PAL = pal('black', 'darkGrey', 'grey');
const PLATFORM_PAL: Record<PlatformStyle, SpritePalette> = {
  wood: pal('black', 'brown', 'tan'),
  stone: pal('darkGrey', 'grey', 'lightGrey'),
  metal: pal('black', 'darkGrey', 'lightGrey'),
};
const WATER_PAL: Record<Theme, SpritePalette> = {
  suburb: pal('navy', 'blue', 'skyBlue'),
  graveyard: pal('navy', 'indigo', 'periwinkle'),
  mansion: pal('navy', 'blue', 'skyBlue'),
  sewer: pal('bogGreen', 'lime', 'yellow'),
  drain: pal('navy', 'periwinkle', 'iceBlue'),
  hub: pal('navy', 'blue', 'skyBlue'),
};

const THEMES_LIST: Theme[] = ['suburb', 'graveyard', 'mansion', 'sewer', 'drain', 'hub'];

interface Bank {
  solid: Sprite[][]; // [mask][variant]
  cracked: Sprite[][];
  pillar: Sprite[]; // [mask]
  platform: Sprite[][];
  ladder: [Sprite, Sprite];
  water: Sprite[][]; // [surface?1:0][frame]
}

const BANKS = {} as Record<Theme, Bank>;
for (const th of THEMES_LIST) {
  const style = PLATFORM_STYLE[th];
  const masks = [...Array(16).keys()];
  const vars = [...Array(VARIANTS).keys()];
  BANKS[th] = {
    solid: masks.map((m) => vars.map((v) => solidTile(th, m, v).toSprite(`at_${th}_s${m}_${v}`))),
    cracked: masks.map((m) => vars.map((v) => crackedTile(th, m, v).toSprite(`at_${th}_c${m}_${v}`))),
    pillar: masks.map((m) => pillarTile(th, m).toSprite(`at_${th}_p${m}`)),
    platform: masks.map((m) => vars.map((v) => platformTile(style, m, v).toSprite(`at_${th}_o${m}_${v}`))),
    ladder: [ladderTile(style, false).toSprite(`at_${th}_lad`), ladderTile(style, true).toSprite(`at_${th}_ladtop`)],
    water: [0, 1].map((sfc) => [0, 1, 2].map((f) => waterTile(sfc === 1, f).toSprite(`at_${th}_w${sfc}_${f}`))),
  };
}
const SPIKE = spikeTile().toSprite('at_spike');
const VENT = ventTile().toSprite('at_vent');

export function autoTile(kind: 'solid' | 'cracked' | 'pillar' | 'platform' | 'ladder' | 'spike' | 'vent' | 'water', theme: Theme, tilesPal: SpritePalette, mask: number, variant: number, frame: number): TileArt {
  const b = BANKS[theme];
  const v = variant % VARIANTS;
  switch (kind) {
    case 'solid':
      return { sprite: b.solid[mask][v], pal: tilesPal };
    case 'cracked':
      return { sprite: b.cracked[mask][v], pal: tilesPal };
    case 'pillar':
      return { sprite: b.pillar[mask], pal: tilesPal };
    case 'platform':
      return { sprite: b.platform[mask][v], pal: PLATFORM_PAL[PLATFORM_STYLE[theme]] };
    case 'ladder':
      return { sprite: b.ladder[mask & AIR_U ? 1 : 0], pal: PLATFORM_PAL[PLATFORM_STYLE[theme] === 'stone' ? 'wood' : PLATFORM_STYLE[theme]] };
    case 'spike':
      return { sprite: SPIKE, pal: SPIKE_PAL };
    case 'vent':
      return { sprite: VENT, pal: VENT_PAL };
    case 'water':
      return { sprite: b.water[mask & AIR_U ? 1 : 0][frame % 3], pal: WATER_PAL[theme] };
  }
}

/** Which neighbours of a tile are "open" for auto-tiling purposes. */
export function maskAt(kindAt: (tx: number, ty: number) => string, tx: number, ty: number, height: number): number {
  const k = kindAt(tx, ty);
  const same = (nx: number, ny: number): boolean => {
    if (ny >= height) return true; // never shade the bottom of the world
    const n = kindAt(nx, ny);
    if (k === 'solid' || k === 'cracked') return n === 'solid' || n === 'cracked';
    if (k === 'water') return n === 'water' || n === 'solid';
    return n === k;
  };
  let m = 0;
  if (!same(tx, ty - 1)) m |= AIR_U;
  if (!same(tx - 1, ty)) m |= AIR_L;
  if (!same(tx + 1, ty)) m |= AIR_R;
  if (!same(tx, ty + 1)) m |= AIR_D;
  return m;
}
