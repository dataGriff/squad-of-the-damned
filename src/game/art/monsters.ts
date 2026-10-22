/**
 * Monster sprite sheets and boss animations (#39), redrawn for the art pass.
 * Built with PixelArt shapes plus hand-placed detail. Indices: 1 = dark
 * outline/shade, 2 = body, 3 = highlight. Bosses face left; the renderer
 * flips them to face right.
 */
import { anim, type AnimDef, type Sprite } from '../../engine/sprites';
import { PixelArt } from '../../engine/pixelart';
import { pal, type SpritePalette } from '../palette';

const sp = (p: PixelArt, name: string): Sprite => p.toSprite(name);

/** Paint index `rim` on every opaque pixel that borders transparency (rim light / outline inside the shape). */
function rim(p: PixelArt, from: number, to: number): PixelArt {
  const src = p.px.slice();
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (src[y * p.w + x] !== from) continue;
      const open = (xx: number, yy: number) => xx < 0 || yy < 0 || xx >= p.w || yy >= p.h || src[yy * p.w + xx] === 0;
      if (open(x - 1, y) || open(x + 1, y) || open(x, y - 1) || open(x, y + 1)) p.set(x, y, to);
    }
  return p;
}

function mirrorX(p: PixelArt): PixelArt {
  const q = new PixelArt(p.w, p.h);
  q.blit(p, 0, 0, true);
  return q;
}

/* ================================================================== */
/* Fodder                                                               */
/* ================================================================== */

export const BAT_PAL = pal('black', 'purple', 'red');
function bat(frame: number): Sprite {
  const p = new PixelArt(16, 12);
  // body + ears + eyes
  p.ellipse(8, 6, 2.5, 3, 1);
  p.set(6, 2, 1).set(10, 2, 1).set(7, 3, 1).set(9, 3, 1);
  p.set(7, 5, 3).set(9, 5, 3);
  const wing = (dir: number) => {
    const ox = 8 + dir * 2;
    const tips = frame === 0 ? [[ox + dir * 6, 0], [ox + dir * 4, 7]] : frame === 1 ? [[ox + dir * 7, 4], [ox + dir * 4, 9]] : [[ox + dir * 6, 10], [ox + dir * 3, 10]];
    p.tri(ox, 4, tips[0][0], tips[0][1], tips[1][0], tips[1][1], 2);
    p.tri(ox, 4, tips[1][0], tips[1][1], ox, 8, 2);
    p.line(ox, 4, tips[0][0], tips[0][1], 1);
    p.line(ox, 5, tips[1][0], tips[1][1], 1);
  };
  wing(-1);
  wing(1);
  return sp(p, `bat_${frame}`);
}
export const BAT: AnimDef = anim([bat(0), bat(1), bat(2), bat(1)], 12);

export const RAT_PAL = pal('black', 'grey', 'pink');
function rat(frame: number): Sprite {
  const p = new PixelArt(18, 9);
  p.ellipse(9, 5, 6, 3, 2);
  p.ellipse(4, 5, 3, 2.2, 2); // head
  p.tri(0, 6, 3, 4, 3, 7, 2); // snout
  p.set(0, 6, 3).set(3, 2, 2).set(4, 2, 2).set(4, 3, 3); // nose, ear
  p.set(3, 4, 1); // eye
  rim(p, 2, 1);
  p.set(4, 3, 3);
  // belly highlight and fur
  for (let x = 6; x < 14; x += 2) p.set(x, 3, 1);
  // tail
  for (let x = 14; x < 18; x++) p.set(x, 5 - Math.round(Math.sin((x + frame * 2) / 1.5)), 3);
  // legs
  const legs = frame === 0 ? [5, 7, 11, 13] : [4, 8, 10, 14];
  for (const lx of legs) p.set(lx, 8, 1);
  return sp(p, `rat_${frame}`);
}
export const RAT: AnimDef = anim([rat(0), rat(1)], 10);

export const HAND_PAL = pal('black', 'olive', 'lime');
function hand(stage: number): Sprite {
  const p = new PixelArt(12, 14);
  // mound of earth
  p.ellipse(6, 13.5, 6, 2.5, 1);
  if (stage === 2) {
    p.set(4, 11, 2).set(6, 10, 2).set(8, 11, 2); // fingertips just breaking the soil
    return sp(p, `hand_${stage}`);
  }
  const top = stage === 0 ? 0 : 4;
  // forearm
  p.rect(4, top + 7, 4, 13 - top - 7, 2);
  p.vline(4, top + 7, 13 - top - 7, 3);
  // palm and fingers (clawed, spread)
  p.rect(3, top + 4, 6, 4, 2);
  for (const [fx, fh] of [[3, 3], [5, 4], [7, 4], [9, 2]]) p.rect(fx, top + 4 - fh, 1, fh, 2);
  p.set(1, top + 5, 2).set(2, top + 6, 2); // thumb
  rim(p, 2, 1);
  for (const fx of [3, 5, 7]) p.set(fx, top + 4 - (fx === 3 ? 3 : 4), 3);
  p.set(5, top + 6, 3).set(6, top + 9, 1);
  return sp(p, `hand_${stage}`);
}
export const HAND: AnimDef = anim([hand(0), hand(1), hand(2)], 6);

export const FROG_PAL = pal('black', 'olive', 'lime');
function frog(frame: number): Sprite {
  const p = new PixelArt(16, 11);
  const y0 = frame === 0 ? 1 : 3;
  p.ellipse(8, y0 + 5, 7, 4, 2);
  p.circle(4, y0 + 2, 2.2, 2);
  p.circle(12, y0 + 2, 2.2, 2);
  rim(p, 2, 1);
  p.set(4, y0 + 2, 3).set(12, y0 + 2, 3).set(4, y0 + 1, 1).set(12, y0 + 1, 1);
  p.hline(5, y0 + 6, 6, 1); // mouth
  for (const [x, y] of [[6, y0 + 4], [10, y0 + 5], [8, y0 + 3]]) p.set(x, y, 3);
  // legs: tucked or springing
  if (frame === 0) {
    p.rect(1, y0 + 8, 3, 2, 2).rect(12, y0 + 8, 3, 2, 2).set(0, 10, 1).set(15, 10, 1);
  } else {
    p.line(2, y0 + 7, 0, 10, 2).line(13, y0 + 7, 15, 10, 2);
  }
  return sp(p, `frog_${frame}`);
}
export const FROG: AnimDef = anim([frog(0), frog(1)], 6);

/* ================================================================== */
/* Night 1: the Count (24×32)                                           */
/* ================================================================== */

export const VAMPIRE_PAL = pal('black', 'red', 'cream');

const COUNT_FACE = [
  '..111111..',
  '.11111111.',
  '1111111111',
  '1133113311',
  '1333113331',
  '1311331131',
  '1323333231',
  '1333333331',
  '.13111131.',
  '.13311331.',
  '..133331..',
  '...1111...',
];
const COUNT_FACE_STUN = COUNT_FACE.map((r, i) => (i === 6 ? '1313333131' : i === 8 ? '.13311331.' : i === 9 ? '.13111131.' : r));

function count(pose: 'idle' | 'breathe' | 'cape' | 'raise' | 'stun'): Sprite {
  const p = new PixelArt(24, 32);
  const lift = pose === 'breathe' ? 1 : 0;
  if (pose === 'cape' || pose === 'raise') {
    // wings of the cape spread wide (or half-raised), red lining facing us, scalloped hem
    const half = pose === 'raise';
    for (const side of [-1, 1]) {
      const sx = side < 0 ? 9 : 14;
      const ex = side < 0 ? (half ? 4 : 0) : half ? 19 : 23;
      p.tri(sx, 11, ex, half ? 6 : 9, ex, half ? 24 : 27, 2);
      p.tri(sx, 11, ex, half ? 24 : 27, sx, 29, 2);
      for (let k = 0; k < 4; k++) {
        const hx = side < 0 ? 1 + k * 2 : 22 - k * 2;
        p.circle(hx, 27 + (k % 2), 1.2, 0);
      }
      for (const ty of [14, 19, 24]) p.line(sx, 11, ex, ty, 1);
      p.line(sx, 11, ex, 9, 1);
    }
  } else {
    // closed cape: black with a red rim (the lining catches the light)
    p.tri(12, 9, 1, 31, 23, 31, 1);
    p.rect(4, 12, 16, 20, 1);
    p.ellipse(12, 14, 9, 4, 1);
    for (let x = 1; x < 23; x += 3) p.set(x, 31, 0);
    rim(p, 1, 2);
  }
  // high collar
  for (const side of [-1, 1]) {
    for (let y = 1; y < 11; y++) {
      const w = Math.floor((11 - y) / 3) + 1;
      for (let k = 0; k < w; k++) {
        const x = side < 0 ? 5 - k - Math.floor(y / 4) + 1 : 18 + k + Math.floor(y / 4) - 1;
        p.set(x, y + 1, 2);
      }
    }
    p.line(side < 0 ? 5 : 18, 3, side < 0 ? 6 : 17, 11, 1);
  }
  // suit front, shirt and medallion
  p.rect(9, 12, 6, 17, 1);
  p.rect(10, 12, 4, 5, 3);
  p.rect(11, 15, 2, 2, 2);
  p.vline(9, 12, 16, 2).vline(14, 12, 16, 2);
  p.rect(10, 26, 1, 5, 1).rect(13, 26, 1, 5, 1);
  // pale clawed hands at the opening
  if (pose !== 'cape') p.rect(8, 21, 1, 2, 3).rect(15, 21, 1, 2, 3);
  else if (pose === 'cape') p.rect(1, 10, 2, 1, 3).rect(21, 10, 2, 1, 3);
  else p.rect(4, 7, 2, 1, 3).rect(18, 7, 2, 1, 3);
  // head
  p.stamp(pose === 'stun' ? COUNT_FACE_STUN : COUNT_FACE, 7, 0 + lift);
  return sp(p, `vamp_${pose}`);
}
export const VAMPIRE: Record<string, AnimDef> = {
  idle: anim([count('idle'), count('breathe')], 2),
  cape: anim([count('cape')], 1),
  raise: anim([count('raise')], 1),
  stun: anim([count('stun')], 1),
  hit: anim([count('stun')], 1),
};

/* ================================================================== */
/* Night 2: the Stitched Giant (32×52)                                  */
/* ================================================================== */

export const GIANT_PAL = pal('black', 'darkGrey', 'lime');

const GIANT_HEAD = [
  '..1111111111..',
  '.111111111111.',
  '.111111111111.',
  '.131313131311.',
  '.333333333331.',
  '.313131313131.',
  '.333333333331.',
  '.311131111131.',
  '.313131313131.',
  '.333331133331.',
  '.333331133331.',
  '.333333333331.',
  '.311111111131.',
  '.331313131331.',
  '..3333333331..',
  '...11111111...',
];

function giant(pose: 'idle' | 'stepA' | 'stepB' | 'throw' | 'burn'): Sprite {
  const p = new PixelArt(32, 52);
  // legs + boots
  const legShift = pose === 'stepA' ? 2 : pose === 'stepB' ? -2 : 0;
  p.rect(8 + legShift, 38, 7, 9, 1).rect(17 - legShift, 38, 7, 9, 1);
  p.vline(9 + legShift, 38, 9, 2).vline(18 - legShift, 38, 9, 2);
  p.rect(6 + legShift, 46, 10, 6, 1).rect(16 - legShift, 46, 10, 6, 1);
  p.hline(6 + legShift, 46, 10, 2).hline(16 - legShift, 46, 10, 2);
  p.hline(6 + legShift, 51, 10, 2).hline(16 - legShift, 51, 10, 2);
  // coat body
  p.rect(6, 19, 20, 20, 2);
  p.ellipse(16, 20, 13, 3, 2);
  p.rect(6, 36, 20, 3, 2);
  // lapels open over a dark shirt, buttons, a stitched patch
  p.tri(12, 19, 20, 19, 16, 29, 1);
  p.vline(16, 30, 8, 1);
  p.set(17, 31, 3).set(17, 35, 3);
  p.rect(20, 30, 4, 4, 1).set(21, 31, 2).set(22, 32, 2);
  // arms
  const arm = (side: number, raised: boolean) => {
    const x = side < 0 ? 2 : 26;
    if (raised) {
      p.rect(x, 4, 4, 18, 2);
      p.rect(x - 1, 0, 6, 5, 3);
      p.vline(x, 4, 18, 1);
      for (let fx = x; fx < x + 5; fx += 2) p.set(fx, 4, 1);
    } else {
      p.rect(x, 19, 4, 17, 2);
      p.vline(side < 0 ? x : x + 3, 19, 17, 1);
      p.hline(x, 27, 4, 1);
      p.rect(x - 1, 35, 6, 5, 3);
      for (let fx = x; fx < x + 5; fx += 2) p.set(fx, 39, 1);
      p.hline(x - 1, 36, 6, 1); // wrist stitches
    }
  };
  arm(-1, pose === 'burn');
  arm(1, pose === 'throw' || pose === 'burn');
  rim(p, 2, 1);
  // head and neck bolts
  p.rect(13, 16, 6, 4, 3).vline(18, 16, 4, 1);
  p.stamp(GIANT_HEAD, 9, 1);
  p.rect(7, 13, 2, 3, 2).rect(23, 13, 2, 3, 2).set(7, 13, 1).set(24, 15, 1);
  if (pose === 'burn') p.stamp(['31113', '13331'], 13, 13); // mouth agape
  return sp(p, `giant_${pose}`);
}
export const GIANT: Record<string, AnimDef> = {
  idle: anim([giant('idle')], 1),
  walk: anim([giant('stepA'), giant('idle'), giant('stepB'), giant('idle')], 4),
  throw: anim([giant('throw')], 1),
  burn: anim([giant('burn'), giant('idle')], 8),
};

/* ================================================================== */
/* Night 3: the Wolfman (32×32)                                         */
/* ================================================================== */

export const WOLF_PAL = pal('black', 'brown', 'tan');

function wolf(pose: 'idle' | 'breathe' | 'lunge' | 'howl' | 'stun'): Sprite {
  const p = new PixelArt(32, 32);
  if (pose === 'lunge') {
    // stretched out, claws first
    p.ellipse(17, 16, 11, 5, 2);
    p.ellipse(25, 13, 6, 5, 2);
    p.ellipse(8, 12, 5, 4, 2); // head
    p.tri(0, 13, 6, 10, 6, 16, 2); // snout
    p.tri(8, 8, 9, 3, 11, 9, 2); // ear
    p.line(10, 18, 1, 22, 2).line(11, 19, 2, 23, 2); // front arm
    p.line(23, 19, 30, 26, 2).line(24, 20, 31, 27, 2); // back leg
    p.line(18, 20, 14, 27, 2).line(19, 20, 15, 27, 2);
    rim(p, 2, 1);
    p.ellipse(15, 18, 6, 2, 3); // chest fur
    p.set(0, 21, 3).set(1, 23, 3).set(3, 24, 3); // claws
    p.set(6, 11, 3).set(6, 10, 1); // eye
    p.hline(1, 15, 4, 1).set(2, 15, 3).set(4, 15, 3); // jaws
    for (let x = 14; x < 28; x += 3) p.set(x, 11, 1);
    return sp(p, 'wolf_lunge');
  }
  const bob = pose === 'breathe' ? 1 : 0;
  // legs (digitigrade)
  p.rect(13, 22, 5, 5, 2).rect(20, 22, 5, 5, 2);
  p.line(15, 27, 12, 30, 2).line(16, 27, 13, 30, 2);
  p.line(22, 27, 22, 30, 2).line(23, 27, 23, 30, 2);
  p.rect(9, 30, 6, 2, 2).rect(20, 30, 6, 2, 2);
  // hunched torso and shaggy back
  p.ellipse(18, 16 + bob, 8, 8, 2);
  p.ellipse(21, 12 + bob, 6, 6, 2);
  for (let x = 16; x < 28; x += 2) p.set(x, 5 + bob + ((x / 2) % 2), 2);
  // tail
  p.ellipse(28, 20, 3, 2, 2);
  p.set(31, 19, 2);
  // head (raised for the howl)
  if (pose === 'howl') {
    p.ellipse(11, 7, 5, 4, 2);
    p.tri(4, 0, 8, 6, 12, 3, 2); // snout pointing up-left
    p.tri(13, 1, 14, -3, 16, 4, 2);
  } else {
    p.ellipse(10, 9 + bob, 5, 4, 2);
    p.tri(1, 10 + bob, 7, 7 + bob, 7, 13 + bob, 2);
    p.tri(10, 5 + bob, 11, 0 + bob, 13, 6 + bob, 2);
    p.tri(13, 5 + bob, 15, 1 + bob, 15, 7 + bob, 2);
  }
  // long front arm with claws
  p.line(12, 14 + bob, 8, 23, 2).line(13, 15 + bob, 9, 24, 2).line(14, 15 + bob, 10, 24, 2);
  rim(p, 2, 1);
  // shaggy tan chest fur: a jagged V of tufts
  for (let y = 12; y < 22; y++) {
    const half = Math.max(0, 3 - Math.floor((y - 12) / 3));
    for (let x = 15 - half; x <= 15 + half; x++) if (p.get(x, y + bob) === 2) p.set(x, y + bob, 3);
    if (y % 2 === 0 && p.get(15 - half - 1, y + bob) === 2) p.set(15 - half - 1, y + bob, 3);
  }
  for (let y = 13; y < 21; y += 3) p.set(15, y + bob, 2);
  p.set(7, 25, 3).set(9, 25, 3).set(11, 25, 3);
  p.set(9, 31, 3).set(11, 31, 3).set(25, 31, 3);
  if (pose === 'howl') {
    p.set(10, 5, 3).set(10, 4, 1); // eye shut tight
    p.line(5, 2, 8, 6, 1);
    p.set(6, 2, 3).set(7, 4, 3); // teeth
  } else {
    p.set(9, 8 + bob, pose === 'stun' ? 1 : 3).set(8, 8 + bob, 1);
    if (pose === 'stun') p.set(8, 7 + bob, 1).set(10, 9 + bob, 1);
    p.hline(2, 11 + bob, 5, 1);
    p.set(3, 12 + bob, 3).set(5, 12 + bob, 3);
    p.set(1, 9 + bob, 1); // nose
    if (pose === 'stun') p.rect(3, 12 + bob, 2, 2, 2); // tongue lolling
  }
  return sp(p, `wolf_${pose}`);
}
export const WOLFMAN: Record<string, AnimDef> = {
  idle: anim([wolf('idle'), wolf('breathe')], 2),
  lunge: anim([wolf('lunge')], 1),
  howl: anim([wolf('howl')], 1),
  stun: anim([wolf('stun')], 1),
};

/* ================================================================== */
/* Night 4: the Mummy (24×32)                                           */
/* ================================================================== */

export const MUMMY_PAL = pal('black', 'tan', 'cream');

/** Wrap a shape in diagonal bandages: cream body, tan wrap lines. */
function bandage(p: PixelArt, slope: number, gap = 3): void {
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (p.get(x, y) !== 3) continue;
      if ((((y + Math.floor(x * slope)) % gap) + gap) % gap === 0) p.set(x, y, 2);
    }
}

function mummy(pose: 'idle' | 'shuffle' | 'grapple' | 'wet'): Sprite {
  const p = new PixelArt(24, 32);
  const step = pose === 'shuffle' ? 1 : 0;
  // legs
  p.rect(8 - step, 22, 4, 9, 3).rect(13 + step, 22, 4, 9, 3);
  p.rect(7 - step, 30, 5, 2, 3).rect(13 + step, 30, 5, 2, 3);
  // torso
  p.rect(7, 11, 10, 12, 3);
  // head
  p.ellipse(12, 6, 4.5, 5, 3);
  // arms reaching forward (to the left)
  const reach = pose === 'grapple' ? 0 : 2;
  p.rect(reach, 12, 9 - reach, 3, 3);
  p.rect(reach + 1, 16, 8 - reach, 3, 3);
  // trailing loose bandage
  for (let y = 14; y < 27; y++) p.set(18 + Math.round(Math.sin(y / 2) * 1.5), y, 3).set(19 + Math.round(Math.sin(y / 2) * 1.5), y, 3);
  bandage(p, 0.5);
  rim(p, 3, 1);
  rim(p, 2, 1);
  // dark eye slit with glowing eyes
  p.rect(9, 5, 7, 2, 1);
  p.set(10, 5, 3).set(14, 5, 3);
  // dangling strips from the arms
  p.vline(reach + 1, 15, 3, 2).vline(reach + 3, 19, 4, 2);
  // fingers
  p.set(reach, 12, 3).set(reach, 14, 3).set(reach + 1, 16, 3).set(reach + 1, 18, 3);
  if (pose === 'wet') {
    // soggy: everything a shade darker and drooping
    p.swap(2, 1);
    p.swap(3, 2);
    p.set(10, 5, 3).set(14, 5, 3);
    for (let x = 6; x < 18; x += 3) p.set(x, 23, 2).set(x, 24, 2);
  }
  return sp(p, `mummy_${pose}`);
}
export const MUMMY: Record<string, AnimDef> = {
  idle: anim([mummy('idle'), mummy('shuffle')], 2),
  grapple: anim([mummy('grapple')], 1),
  wet: anim([mummy('wet')], 1),
};

/* ================================================================== */
/* Night 5: the Gill Creature (32×32)                                   */
/* ================================================================== */

export const GILL_PAL = pal('black', 'teal', 'cyan');

function gill(pose: 'idle' | 'sway' | 'attack' | 'gasp'): Sprite {
  const p = new PixelArt(32, 32);
  const sway = pose === 'sway' ? 1 : 0;
  // legs with fin flaps and webbed feet
  p.rect(11, 23, 4, 7, 2).rect(17, 23, 4, 7, 2);
  p.rect(9, 30, 7, 2, 2).rect(17, 30, 7, 2, 2);
  p.tri(15, 24, 17, 24, 15, 28, 2);
  // body
  p.ellipse(16, 17, 7, 8, 2);
  // spine fins down the back
  for (let y = 6; y < 20; y += 5) p.tri(21, y, 27, y + 2, 21, y + 5, 2);
  // head with crest
  p.ellipse(13, 7, 6, 5, 2);
  p.tri(8, 3, 12, -2, 16, 3, 2);
  p.tri(14, 2, 19, -1, 19, 5, 2);
  p.ellipse(8, 10, 3, 2, 2); // lips/jaw
  // arms
  if (pose === 'attack') {
    p.line(10, 13, 4, 2, 2).line(11, 13, 5, 2, 2).line(12, 14, 6, 3, 2);
    p.line(19, 13, 22, 2, 2).line(20, 13, 23, 2, 2);
  } else {
    p.line(10, 13, 5 - sway, 21, 2).line(11, 13, 6 - sway, 22, 2).line(12, 14, 7 - sway, 22, 2);
    p.tri(6, 16, 4, 19, 8, 18, 2); // forearm fin
  }
  rim(p, 2, 1);
  // pale segmented belly plates
  for (let y = 12; y < 24; y++) for (let x = 13; x < 19; x++) if (p.get(x, y) === 2) p.set(x, y, y % 3 === 0 ? 1 : 3);
  // scales: sparse highlights in a diamond grid
  for (let y = 5; y < 24; y += 3) for (let x = 7 + (y % 2 ? 2 : 0); x < 26; x += 4) if (p.get(x, y) === 2 && p.get(x, y - 1) === 2) p.set(x, y, 3);
  // fin rays
  for (let y = 7; y < 20; y += 5) p.line(22, y + 1, 25, y + 2, 1);
  // crest rays
  p.line(12, 0, 12, 3, 3).line(17, 1, 17, 4, 3);
  // eye, gills, mouth
  const eyeBig = pose === 'gasp';
  p.circle(10, 6, eyeBig ? 2 : 1.5, 3);
  p.set(9, 6, 1);
  for (const gx of [15, 17]) p.vline(gx, 8, 3, 1);
  if (pose === 'gasp' || pose === 'attack') {
    p.ellipse(7, 11, 2.2, 2, 1);
    p.set(6, 10, 3).set(8, 10, 3);
  } else {
    p.hline(5, 10, 5, 1);
    p.set(6, 11, 3);
  }
  // webbed claws
  if (pose === 'attack') p.set(3, 1, 3).set(5, 0, 3).set(22, 0, 3).set(24, 1, 3);
  else p.set(4 - sway, 22, 3).set(6 - sway, 23, 3).set(8 - sway, 23, 3);
  return sp(p, `gill_${pose}`);
}
export const GILL: Record<string, AnimDef> = {
  idle: anim([gill('idle'), gill('sway')], 2),
  attack: anim([gill('attack')], 1),
  gasp: anim([gill('gasp')], 1),
};

/* ================================================================== */
/* Tables                                                               */
/* ================================================================== */

export const BOSS_PALETTES: Record<string, SpritePalette> = {
  vampire: VAMPIRE_PAL,
  giant: GIANT_PAL,
  wolfman: WOLF_PAL,
  mummy: MUMMY_PAL,
  gill: GILL_PAL,
};
export const BOSS_ANIMS: Record<string, Record<string, AnimDef>> = { vampire: VAMPIRE, giant: GIANT, wolfman: WOLFMAN, mummy: MUMMY, gill: GILL };

/** Manual hint art lookup. */
export const CREATURE_ART: Record<string, { sprite: Sprite; pal: SpritePalette }> = {
  vampire: { sprite: VAMPIRE.cape.frames[0], pal: VAMPIRE_PAL },
  giant: { sprite: GIANT.idle.frames[0], pal: GIANT_PAL },
  wolfman: { sprite: WOLFMAN.howl.frames[0], pal: WOLF_PAL },
  mummy: { sprite: MUMMY.idle.frames[0], pal: MUMMY_PAL },
  gill: { sprite: GILL.idle.frames[0], pal: GILL_PAL },
  bat: { sprite: BAT.frames[0], pal: BAT_PAL },
  hand: { sprite: HAND.frames[0], pal: HAND_PAL },
  frog: { sprite: FROG.frames[0], pal: FROG_PAL },
  rat: { sprite: RAT.frames[0], pal: RAT_PAL },
};

void mirrorX;

/* ================================================================== */
/* Animation pass (#53): wind-ups, hit reactions, defeat scenes         */
/* ================================================================== */

/** Crouch a figure: rows above `fromY` move down by `by` (the lowest `by` rows of the body fold away). */
function squat(src: Sprite, fromY: number, by: number, name: string): Sprite {
  const p = PixelArt.from(src);
  const q = new PixelArt(p.w, p.h);
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const v = p.get(x, y);
      if (!v) continue;
      if (y >= fromY + by) q.set(x, y, v);
      else if (y < fromY) q.set(x, y + by, v);
    }
  return q.toSprite(name);
}

/** Shift rows above `upTo` sideways by dx (a lean). */
function lean(src: Sprite, upTo: number, dx: number, name: string): Sprite {
  const p = PixelArt.from(src);
  const q = new PixelArt(p.w, p.h);
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const v = p.get(x, y);
      if (v) q.set(y < upTo ? x + dx : x, y, v);
    }
  return q.toSprite(name);
}

function flipV(src: Sprite, name: string): Sprite {
  const p = PixelArt.from(src);
  const q = new PixelArt(p.w, p.h);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) q.set(x, p.h - 1 - y, p.get(x, y));
  return q.toSprite(name);
}

/** Lay a figure on its back at the bottom of the same canvas. */
function laidDown(src: Sprite, name: string, turns = 3): Sprite {
  const p = PixelArt.from(src);
  const side = Math.max(p.w, p.h);
  const r = p.centredIn(side).rotate90(turns);
  const b = r.bounds();
  const q = new PixelArt(p.w, p.h);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const v = r.get(b.x + x, b.y + y);
    if (v) q.set(Math.floor((p.w - b.w) / 2) + x, p.h - b.h + y, v);
  }
  return q.toSprite(name);
}

// --- the Giant: heave the boulder overhead, then sit down at the end ---
const GIANT_HEAVE = (() => {
  // taller canvas: the boulder rides above his head between his raised fists
  const body = PixelArt.from(GIANT.burn.frames[0]);
  const p = new PixelArt(32, 62);
  p.blit(body, 0, 10);
  p.circle(16, 6, 7, 1);
  p.circle(16, 6, 6, 2);
  p.set(12, 3, 3).set(13, 2, 3).set(14, 2, 3).set(19, 9, 1).set(15, 8, 1).set(20, 4, 1);
  return p.toSprite('giant_heave');
})();
const GIANT_SIT = (() => {
  const src = PixelArt.from(GIANT.idle.frames[0]);
  const p = new PixelArt(src.w, src.h);
  for (let y = 0; y < 38; y++) for (let x = 0; x < src.w; x++) {
    const v = src.get(x, y);
    if (v) p.set(x, y + 10, v);
  }
  // legs stretched out in front (to the left), big boots up
  p.rect(0, 44, 14, 6, 1).hline(0, 44, 14, 2);
  p.rect(0, 40, 4, 10, 1).vline(1, 40, 10, 2);
  // head bowed: eyes closed
  for (let x = 11; x < 21; x++) if (p.get(x, 18) === 1) p.set(x, 18, 3);
  return p.toSprite('giant_sit');
})();
GIANT.heave = anim([GIANT_HEAVE], 1);
GIANT.hit = anim([GIANT.burn.frames[0]], 1);
GIANT.sit = anim([GIANT_SIT], 1);

// --- the Wolfman: crouch before the lunge, and Mr Grey underneath ---
WOLFMAN.crouch = anim([squat(WOLFMAN.idle.frames[0], 22, 3, 'wolf_crouch')], 1);
WOLFMAN.hit = anim([WOLFMAN.stun.frames[0]], 1);
const MR_GREY = (() => {
  const p = new PixelArt(32, 32);
  // sitting on the ground, dazed, cap askew, satchel spilled
  p.rect(6, 26, 14, 4, 1); // legs out front
  p.rect(4, 28, 4, 4, 1);
  p.rect(13, 14, 9, 13, 2); // uniform jacket
  p.vline(17, 15, 11, 1);
  p.set(18, 17, 3).set(18, 21, 3); // brass buttons
  p.limb(14, 16, 9, 22, 2, 2).rect(8, 22, 2, 2, 3); // arm propped
  p.limb(21, 16, 20, 7, 2, 2).rect(19, 5, 3, 3, 3); // hand on head
  p.ellipse(16, 9, 4, 4.5, 3); // face
  p.rect(12, 3, 9, 3, 2).rect(10, 5, 4, 1, 1); // cap with brim
  p.set(14, 9, 1).set(15, 12, 1).set(16, 12, 1); // eye, mouth
  p.rect(22, 22, 8, 7, 2).hline(22, 22, 8, 1); // satchel
  p.set(25, 30, 3).set(28, 30, 3).set(27, 29, 3); // letters
  rim(p, 2, 1);
  rim(p, 3, 1);
  p.ellipse(16, 9, 3, 3.5, 3);
  p.set(14, 9, 1).set(15, 12, 1);
  for (const [x, y] of [[9, 2], [24, 3], [22, 0]]) p.set(x, y, 3); // dizzy stars
  return p.toSprite('wolf_mrgrey');
})();
WOLFMAN.human = anim([MR_GREY], 1);

// --- the Mummy: pull back before the grapple, unravel at the end ---
MUMMY.windup = anim([lean(MUMMY.idle.frames[0], 22, 3, 'mummy_windup')], 1);
MUMMY.hit = anim(
  [
    (() => {
      const p = PixelArt.from(MUMMY.idle.frames[0]);
      p.rect(9, 5, 7, 2, 1); // eyes squeezed shut
      return lean(p.toSprite('mummy_hit_src'), 22, 1, 'mummy_hit');
    })(),
  ],
  1,
);
const UNRAVEL: Sprite[] = [0, 1, 2, 3, 4, 5].map((k) => {
  const src = PixelArt.from(MUMMY.idle.frames[0]);
  const p = new PixelArt(src.w, src.h);
  const cut = k * 6; // body gone above this row
  for (let y = cut; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const v = src.get(x, y);
    if (v) p.set(x, y, v);
  }
  // the loose strip peeling off and fluttering down to the pile
  if (k < 5) for (let y = Math.max(0, cut - 6); y < 30; y++) p.set(13 + Math.round(Math.sin(y / 2 + k) * 3), y, y % 3 ? 3 : 2);
  // pile of bandages growing at the feet
  p.ellipse(12, 31, 3 + k * 1.6, 1 + k * 0.5, 3);
  for (let x = 6; x < 20; x += 3) if (p.get(x, 31)) p.set(x, 31, 2);
  if (k === 5) p.set(11, 29, 1).set(13, 29, 1); // two tiny eyes in the heap
  return p.toSprite(`mummy_unravel_${k}`);
});
MUMMY.unravel = anim(UNRAVEL, 4, false);

// --- the Gill Creature: coil before leaping, flop on its back at the end ---
GILL.coil = anim([squat(GILL.idle.frames[0], 22, 3, 'gill_coil')], 1);
GILL.hit = anim([GILL.gasp.frames[0]], 1);
GILL.flop = anim([laidDown(GILL.gasp.frames[0], 'gill_flop_0', 1), laidDown(GILL.idle.frames[0], 'gill_flop_1', 1)], 3);

// --- fodder deaths ---
export const BAT_DEAD = flipV(BAT.frames[1], 'bat_dead');
export const RAT_DEAD = flipV(RAT.frames[0], 'rat_dead');
export const FROG_SQUASH = (() => {
  const p = new PixelArt(16, 11);
  p.ellipse(8, 9, 8, 2, 2);
  p.set(3, 8, 3).set(12, 8, 3).hline(5, 9, 6, 1);
  rim(p, 2, 1);
  return p.toSprite('frog_squash');
})();
