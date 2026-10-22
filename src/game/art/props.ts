/**
 * Foreground dressing art (#55): small props that stand on floors and ledges,
 * and near silhouettes that pass in front of the player at a faster parallax.
 */
import { PixelArt, rng } from '../../engine/pixelart';
import type { Sprite } from '../../engine/sprites';
import { pal, type SpritePalette } from '../palette';
import type { Theme } from './tiles';
import type { BackLayer } from './backdrops';

export interface Prop {
  sprite: Sprite;
  pal: SpritePalette;
}

const P = (w: number, h: number) => new PixelArt(w, h);
const done = (p: PixelArt, name: string) => p.toSprite(`prop_${name}`);

/* ---------- suburb ---------- */
const MAILBOX = (() => {
  const p = P(12, 18);
  p.rect(5, 8, 2, 10, 1);
  p.rect(1, 2, 10, 7, 2).ellipse(6, 3, 5, 2, 2);
  p.hline(1, 8, 10, 1).vline(1, 2, 7, 1).vline(10, 2, 7, 1).hline(2, 1, 8, 1);
  p.rect(10, 0, 2, 5, 3).set(11, 0, 2).set(10, 1, 2); // flag up
  p.hline(3, 5, 5, 3);
  return done(p, 'mailbox');
})();
const BIN = (() => {
  const p = P(12, 15);
  p.rect(1, 3, 10, 12, 2).hline(0, 2, 12, 3).hline(4, 0, 4, 3).hline(0, 3, 12, 1);
  for (const x of [3, 6, 9]) p.vline(x, 5, 9, 1);
  p.vline(2, 4, 10, 3);
  return done(p, 'bin');
})();
const HYDRANT = (() => {
  const p = P(10, 12);
  p.rect(3, 2, 4, 9, 2).ellipse(5, 2, 2.5, 2, 2).rect(1, 5, 8, 2, 2).rect(2, 10, 6, 2, 1);
  p.vline(4, 2, 8, 3).set(5, 0, 3);
  return done(p, 'hydrant');
})();
const GNOME = (() => {
  const p = P(8, 12);
  p.tri(1, 5, 4, -1, 7, 5, 2);
  p.rect(2, 5, 4, 3, 3).set(3, 6, 1).set(5, 6, 1);
  p.tri(1, 7, 4, 11, 7, 7, 3); // beard
  p.rect(1, 9, 6, 3, 2).hline(1, 11, 6, 1);
  return done(p, 'gnome');
})();

/* ---------- graveyard ---------- */
const HEADSTONE = (() => {
  const p = P(12, 15);
  p.rect(1, 4, 10, 11, 2).ellipse(6, 4, 5, 4, 2);
  p.vline(1, 3, 12, 3).hline(3, 1, 6, 3);
  p.hline(3, 7, 6, 1).hline(4, 9, 4, 1).hline(3, 11, 6, 1);
  p.set(9, 5, 1).set(8, 6, 1); // crack
  return done(p, 'headstone');
})();
const URN = (() => {
  const p = P(8, 12);
  p.rect(1, 10, 6, 2, 2).rect(3, 8, 2, 2, 2).ellipse(4, 5, 3.5, 3, 2).rect(2, 1, 4, 2, 2);
  p.vline(1, 4, 3, 3).set(2, 1, 3).hline(1, 10, 6, 3);
  return done(p, 'urn');
})();
const SKULLS = (() => {
  const p = P(14, 9);
  const skull = (x: number, y: number) => {
    p.ellipse(x + 2, y + 2, 2.5, 2.5, 3).rect(x + 1, y + 4, 3, 1, 3);
    p.set(x + 1, y + 2, 1).set(x + 3, y + 2, 1);
  };
  skull(1, 4);
  skull(8, 4);
  skull(4, 0);
  p.line(0, 8, 13, 7, 2);
  return done(p, 'skulls');
})();
const GRAVE_CANDLE = (() => {
  const p = P(8, 12);
  p.rect(0, 9, 8, 3, 1).hline(0, 9, 8, 2);
  p.rect(3, 4, 2, 5, 2).set(3, 4, 3);
  p.stamp(['.3.', '333', '.3.'], 2, 0);
  return done(p, 'grave_candle');
})();

/* ---------- mansion ---------- */
const ARMOUR = (() => {
  const p = P(14, 32);
  p.rect(4, 26, 6, 2, 2).rect(3, 30, 8, 2, 1); // feet and plinth
  p.rect(4, 17, 2, 10, 2).rect(8, 17, 2, 10, 2); // legs
  p.rect(3, 9, 8, 9, 2).hline(3, 13, 8, 1); // breastplate
  p.ellipse(7, 5, 3, 4, 2).hline(5, 5, 5, 1).vline(7, 1, 3, 3); // helm and visor
  p.rect(1, 10, 2, 8, 2).rect(11, 10, 2, 8, 2); // arms
  p.vline(13, 0, 30, 1).set(13, 0, 3).tri(12, 0, 13, -3, 14, 0, 3); // halberd
  for (let y = 2; y < 28; y += 3) p.set(4, y, 3);
  return done(p, 'armour');
})();
const VASE = (() => {
  const p = P(10, 22);
  p.rect(2, 14, 6, 8, 1).hline(1, 14, 8, 2).rect(4, 16, 2, 6, 2); // pedestal
  p.ellipse(5, 8, 4, 5, 3).rect(3, 1, 4, 3, 3).hline(2, 1, 6, 3);
  p.hline(2, 8, 6, 2).hline(3, 6, 4, 2).set(5, 10, 2).set(4, 11, 2);
  return done(p, 'vase');
})();
const CLOCK = (() => {
  const p = P(12, 30);
  p.rect(1, 6, 10, 24, 2).ellipse(6, 6, 5, 5, 2);
  p.circle(6, 6, 3, 3).set(6, 5, 1).set(7, 6, 1);
  p.rect(4, 13, 4, 12, 1).vline(6, 13, 9, 3).circle(6, 22, 1.4, 3); // pendulum window
  p.vline(1, 2, 28, 3).hline(0, 29, 12, 1);
  return done(p, 'clock');
})();
const FERN = (() => {
  const p = P(14, 14);
  p.rect(4, 9, 6, 5, 1).hline(3, 9, 8, 1);
  for (const [x1, y1] of [[0, 3], [2, 0], [6, 0], [11, 1], [13, 4], [7, 2]]) p.line(7, 9, x1, y1, 2);
  for (const [x, y] of [[1, 3], [3, 1], [11, 2], [12, 4]]) p.set(x, y, 3);
  return done(p, 'fern');
})();

/* ---------- sewer ---------- */
const BARREL = (() => {
  const p = P(12, 14);
  p.rect(1, 1, 10, 13, 2).ellipse(6, 1, 5, 1.5, 3);
  for (const y of [3, 10]) p.hline(1, y, 10, 1);
  p.vline(3, 2, 11, 3);
  p.rect(5, 6, 2, 2, 3); // a toxic splotch
  return done(p, 'barrel');
})();
const BONES = (() => {
  const p = P(14, 6);
  p.line(1, 4, 12, 2, 2).set(0, 4, 2).set(1, 5, 2).set(12, 1, 2).set(13, 2, 2);
  p.ellipse(4, 3, 2, 2, 2).set(3, 3, 1).set(5, 3, 1);
  p.hline(7, 5, 6, 3);
  return done(p, 'bones');
})();
const MUSHROOMS = (() => {
  const p = P(12, 10);
  const shroom = (x: number, h: number, r: number) => {
    p.vline(x, 10 - h, h, 2);
    p.ellipse(x, 10 - h, r, r * 0.7, 3);
    p.set(x - 1, 10 - h, 2);
  };
  shroom(3, 6, 2.5);
  shroom(8, 4, 2);
  shroom(10, 2, 1.4);
  return done(p, 'mushrooms');
})();
const PIPE_STUB = (() => {
  const p = P(12, 12);
  p.rect(3, 3, 6, 9, 2).rect(1, 0, 10, 4, 2).vline(4, 4, 8, 3).hline(1, 1, 10, 3).hline(1, 3, 10, 1);
  return done(p, 'pipe_stub');
})();

/* ---------- storm drain ---------- */
const RUBBLE = (() => {
  const p = P(16, 9);
  for (const [x, y, w, h] of [[1, 4, 6, 5], [6, 2, 6, 7], [11, 5, 5, 4], [4, 6, 4, 3]]) {
    p.rect(x, y, w, h, 2).hline(x, y, w, 3).vline(x + w - 1, y, h, 1);
  }
  p.line(8, 0, 10, 3, 1); // rebar
  return done(p, 'rubble');
})();
const TYRE = (() => {
  const p = P(12, 12);
  p.circle(6, 6, 6, 1).circle(6, 6, 5, 2).circle(6, 6, 2.5, 0);
  for (let a = 0; a < 8; a++) p.set(6 + Math.round(Math.cos(a) * 4), 6 + Math.round(Math.sin(a) * 4), 3);
  return done(p, 'tyre');
})();
const CONE = (() => {
  const p = P(10, 13);
  p.tri(2, 11, 5, 0, 8, 11, 2);
  p.hline(3, 4, 4, 3).hline(2, 8, 6, 3);
  p.rect(0, 11, 10, 2, 1);
  return done(p, 'cone');
})();
const TROLLEY = (() => {
  const p = P(16, 13);
  p.rect(2, 1, 12, 7, 0);
  for (let x = 2; x < 15; x += 2) p.vline(x, 1, 7, 2);
  for (let y = 1; y < 9; y += 2) p.hline(2, y, 13, 2);
  p.line(14, 1, 16, -1, 3).hline(1, 8, 14, 3);
  p.circle(4, 11, 1.5, 1).circle(12, 11, 1.5, 1);
  return done(p, 'trolley');
})();

export const PROPS: Record<Theme, Prop[]> = {
  suburb: [
    { sprite: MAILBOX, pal: pal('black', 'red', 'lightGrey') },
    { sprite: BIN, pal: pal('black', 'darkGrey', 'grey') },
    { sprite: HYDRANT, pal: pal('black', 'red', 'pink') },
    { sprite: GNOME, pal: pal('black', 'red', 'cream') },
  ],
  graveyard: [
    { sprite: HEADSTONE, pal: pal('black', 'grey', 'lightGrey') },
    { sprite: URN, pal: pal('black', 'darkGrey', 'grey') },
    { sprite: SKULLS, pal: pal('black', 'grey', 'cream') },
    { sprite: GRAVE_CANDLE, pal: pal('darkGrey', 'cream', 'yellow') },
  ],
  mansion: [
    { sprite: ARMOUR, pal: pal('black', 'grey', 'lightGrey') },
    { sprite: VASE, pal: pal('black', 'blue', 'white') },
    { sprite: CLOCK, pal: pal('black', 'brown', 'tan') },
    { sprite: FERN, pal: pal('black', 'darkGreen', 'midGreen') },
  ],
  sewer: [
    { sprite: BARREL, pal: pal('black', 'brown', 'lime') },
    { sprite: BONES, pal: pal('black', 'cream', 'lightGrey') },
    { sprite: MUSHROOMS, pal: pal('black', 'olive', 'lime') },
    { sprite: PIPE_STUB, pal: pal('black', 'darkGrey', 'grey') },
  ],
  drain: [
    { sprite: RUBBLE, pal: pal('black', 'darkGrey', 'grey') },
    { sprite: TYRE, pal: pal('black', 'darkGrey', 'grey') },
    { sprite: CONE, pal: pal('black', 'orange', 'white') },
    { sprite: TROLLEY, pal: pal('black', 'grey', 'lightGrey') },
  ],
  hub: [],
};

/* ---------- near silhouettes in front of the player ---------- */

const FW = 256;

function grassTufts(name: string, seed: number): Sprite {
  const p = P(FW, 16);
  const r = rng(seed);
  for (let i = 0; i < 9; i++) {
    const cx = Math.floor(r() * FW);
    for (let b = 0; b < 7; b++) {
      const x = cx + b * 2 - 6;
      const h = 6 + Math.floor(r() * 10);
      p.line(x, 16, x + Math.round((r() - 0.5) * 4), 16 - h, r() < 0.5 ? 1 : 2);
    }
  }
  return p.toSprite(name);
}

function hangingBranch(name: string, seed: number, leaves: boolean): Sprite {
  const p = P(FW, 30);
  const r = rng(seed);
  const x0 = 20 + Math.floor(r() * 60);
  p.limb(x0 - 30, 0, x0 + 40, 10, 3, 1);
  for (let i = 0; i < 6; i++) {
    const bx = x0 - 20 + i * 12;
    p.line(bx, 4 + i, bx + Math.round((r() - 0.5) * 10), 14 + Math.floor(r() * 14), 1);
    if (leaves) p.ellipse(bx + 2, 16 + Math.floor(r() * 8), 5, 4, 2);
  }
  if (leaves) for (let y = 0; y < 30; y++) for (let x = 0; x < FW; x++) if (p.get(x, y) === 2 && (x + y) % 3 === 0) p.set(x, y, 1);
  return p.toSprite(name);
}

function chains(name: string): Sprite {
  const p = P(FW, 34);
  for (const [x, len] of [[30, 22], [44, 30], [180, 18]]) {
    for (let y = 0; y < len; y += 3) {
      p.set(x, y, 2).set(x, y + 1, 2);
      p.set(x - 1, y + 1, 1).set(x + 1, y + 1, 1);
    }
    p.circle(x, len + 2, 2, 1).set(x, len + 2, 0);
  }
  // a dripping pipe across the top
  p.rect(90, 0, 70, 4, 1).hline(90, 3, 70, 2).vline(152, 4, 3, 2).set(152, 9, 2);
  return p.toSprite(name);
}

function valance(name: string): Sprite {
  // the bottom edge of heavy drapes swagged across the ceiling, with tassels
  const p = P(FW, 22);
  for (let x = 0; x < FW; x++) {
    const sag = Math.round(Math.abs(Math.sin((x / FW) * Math.PI * 2)) * 10);
    p.vline(x, 0, 6 + sag, 2);
    p.set(x, 6 + sag, 1);
  }
  for (const x of [0, 64, 128, 192]) {
    p.vline(x, 6, 10, 1);
    p.rect(x - 1, 16, 3, 4, 3);
  }
  return p.toSprite(name);
}

function balusters(name: string): Sprite {
  const p = P(FW, 26);
  p.rect(0, 0, FW, 3, 2).hline(0, 0, FW, 3);
  for (let x = 2; x < FW; x += 8) {
    p.rect(x, 3, 3, 20, 1);
    p.ellipse(x + 1, 9, 2, 2, 1);
    p.ellipse(x + 1, 17, 2, 3, 1);
  }
  p.rect(0, 22, FW, 4, 1);
  return p.toSprite(name);
}

function reeds(name: string, seed: number): Sprite {
  const p = P(FW, 18);
  const r = rng(seed);
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(r() * FW);
    const h = 8 + Math.floor(r() * 10);
    p.vline(x, 18 - h, h, 1);
    if (r() < 0.6) p.rect(x - 1, 18 - h, 3, 4, 2);
  }
  return p.toSprite(name);
}

function grateBars(name: string): Sprite {
  const p = P(FW, 26);
  p.rect(120, 0, 70, 6, 1);
  for (let x = 122; x < 190; x += 5) p.vline(x, 6, 18, 1).set(x, 24, 2);
  p.hline(120, 14, 70, 1);
  p.set(140, 25, 2).set(165, 25, 2);
  return p.toSprite(name);
}

export const FOREGROUND: Record<Theme, BackLayer[]> = {
  suburb: [
    { frames: [hangingBranch('fg_sub_branch', 3, true)], pal: pal('black', 'darkGreen', 'darkGreen'), y: 17, factor: 1.3, every: 512, offset: 40 },
    { frames: [grassTufts('fg_sub_grass', 6)], pal: pal('black', 'darkGreen', 'darkGreen'), y: 224, factor: 1.3 },
  ],
  graveyard: [
    { frames: [hangingBranch('fg_gy_branch', 9, false)], pal: pal('black', 'black', 'black'), y: 17, factor: 1.3, every: 448, offset: 120 },
    { frames: [grassTufts('fg_gy_weeds', 2)], pal: pal('black', 'darkGrey', 'darkGrey'), y: 224, factor: 1.3 },
  ],
  mansion: [
    { frames: [valance('fg_mn_valance')], pal: pal('black', 'darkRed', 'tan'), y: 17, factor: 1.15 },
    { frames: [balusters('fg_mn_banister')], pal: pal('black', 'darkBrown', 'brown'), y: 214, factor: 1.35, every: 640, offset: 300 },
  ],
  sewer: [
    { frames: [chains('fg_sw_chains')], pal: pal('black', 'darkGrey', 'darkGrey'), y: 17, factor: 1.3, every: 384 },
    { frames: [reeds('fg_sw_reeds', 4)], pal: pal('black', 'bogGreen', 'bogGreen'), y: 222, factor: 1.3 },
  ],
  drain: [
    { frames: [grateBars('fg_dr_grate')], pal: pal('black', 'drainBlue', 'drainBlue'), y: 17, factor: 1.3, every: 512 },
    { frames: [reeds('fg_dr_debris', 11)], pal: pal('black', 'drainBlue', 'drainBlue'), y: 222, factor: 1.3 },
  ],
  hub: [],
};

export function allPropSprites(): Sprite[] {
  return [...Object.values(PROPS).flat().map((p) => p.sprite), ...Object.values(FOREGROUND).flatMap((ls) => ls.flatMap((l) => l.frames))];
}
