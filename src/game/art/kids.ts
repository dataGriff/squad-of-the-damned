/**
 * Kid sprite sheets ×4 (#38, redrawn for #52). Each kid is a small rig: a
 * hand-drawn head plus limbs placed per pose, then an outline pass. That keeps
 * every frame consistent while allowing 8-frame runs and real ability poses.
 * Palette per kid: 1 = dark (outline, hair, trousers), 2 = clothes, 3 = skin.
 * Sprites face right; the renderer flips them.
 */
import { anim, type AnimDef, type Sprite } from '../../engine/sprites';
import { PixelArt } from '../../engine/pixelart';
import type { KidId } from '../squad';

type Pt = [number, number];
type HeadKind = 'normal' | 'blink' | 'hurt' | 'effort';

interface Rig {
  id: KidId;
  w: number;
  h: number;
  ground: number;
  cx: number;
  shoulderY: number;
  hipY: number;
  torsoW: number;
  legT: number;
  armT: number;
  /** Leg colour, shoe colour, sleeve style. */
  pants: number;
  shoes: number;
  sleeves: 'short' | 'long';
  heads: Record<HeadKind, string[]>;
  headDX: number;
  /** Extra clothing details drawn after the torso. */
  outfit?: (p: PixelArt, o: { x: number; y: number; hip: number; pose: Pose }) => void;
}

interface Pose {
  /** Upper-body vertical offset (+ down). */
  bob?: number;
  /** Upper-body horizontal offset (+ forward). */
  lean?: number;
  /** Lower the hips by this much (crouch, landing). */
  sink?: number;
  /** Torso height override. */
  torsoH?: number;
  /** Knee and foot, relative to each hip. */
  backLeg: [Pt, Pt];
  frontLeg: [Pt, Pt];
  /** Elbow and hand, relative to each shoulder. */
  backArm: [Pt, Pt];
  frontArm: [Pt, Pt];
  head?: HeadKind;
  /** Draw a held item at the front hand / back hand. */
  item?: 'slingAim' | 'sling' | 'garlic' | 'fist';
}

/* ------------------------------------------------------------------ */
/* Heads (facing right)                                                 */
/* ------------------------------------------------------------------ */

function headSet(base: string[], eye: Pt, mouth: Pt): Record<HeadKind, string[]> {
  const patch = (rows: string[], pts: [number, number, string][]) => {
    const out = rows.map((r) => r.split(''));
    for (const [x, y, c] of pts) if (out[y]) out[y][x] = c;
    return out.map((r) => r.join(''));
  };
  return {
    normal: base,
    blink: patch(base, [
      [eye[0], eye[1], '3'],
      [eye[0] - 1, eye[1] + 1, '1'],
      [eye[0], eye[1] + 1, '1'],
    ]),
    hurt: patch(base, [
      [eye[0], eye[1], '3'],
      [eye[0] - 1, eye[1] - 1, '1'],
      [eye[0], eye[1], '1'],
      [eye[0] - 1, eye[1] + 1, '1'],
      [mouth[0], mouth[1], '1'],
      [mouth[0] - 1, mouth[1], '1'],
      [mouth[0], mouth[1] + 1, '1'],
    ]),
    effort: patch(base, [
      [mouth[0], mouth[1], '1'],
      [mouth[0] - 1, mouth[1], '1'],
      [eye[0] - 1, eye[1] - 1, '1'],
    ]),
  };
}

// Casey: backwards red cap with the brim at the back
const CASEY_HEAD = headSet(
  ['...2222...', '..222222..', '.22222222.', '222111111.', '..1133333.', '..1333313.', '..13333333', '...333313.', '....3333..', '.....33...'],
  [7, 5],
  [7, 7],
);
// Mo: a mop of dark curls
const MO_HEAD = headSet(
  ['..1.1.1...', '.1111111..', '111111111.', '1111111111', '.111333311', '..1333313.', '..13333333', '...333313.', '....3333..', '.....33...'],
  [7, 5],
  [7, 7],
);
// Bruno: buzz cut, big jaw
const BRUNO_HEAD = headSet(
  ['...11111...', '..1111111..', '.111111111.', '.111111111.', '.113333333.', '.113133313.', '.1331333333', '.133333113.', '..33333333.', '...333333..', '....3333...'],
  [8, 5],
  [8, 7],
);
// Pip: yellow raincoat hood up
const PIP_HEAD = headSet(['..2222..', '.222222.', '22111122', '22333312', '2233313.', '22333333', '.2333313', '..2222..'], [5, 4], [5, 6]);

/* ------------------------------------------------------------------ */
/* The rig                                                              */
/* ------------------------------------------------------------------ */

function draw(rig: Rig, pose: Pose): PixelArt {
  const p = new PixelArt(rig.w, rig.h);
  const bob = pose.bob ?? 0;
  const lean = pose.lean ?? 0;
  const sink = pose.sink ?? 0;
  const hipY = rig.hipY + sink;
  const torsoH = pose.torsoH ?? rig.hipY - rig.shoulderY;
  const top = hipY - torsoH + bob;
  const tx = rig.cx - Math.floor(rig.torsoW / 2) + lean;
  const backHip: Pt = [rig.cx - 1, hipY];
  const frontHip: Pt = [rig.cx + 1, hipY];
  const backSh: Pt = [tx + 1, top + 1];
  const frontSh: Pt = [tx + rig.torsoW - 2, top + 1];

  const leg = (hip: Pt, [knee, foot]: [Pt, Pt], colour: number) => {
    const k: Pt = [hip[0] + knee[0], hip[1] + knee[1]];
    const f: Pt = [hip[0] + foot[0], Math.min(rig.ground - 1, hip[1] + foot[1])];
    p.limb(hip[0], hip[1], k[0], k[1], rig.legT, colour);
    p.limb(k[0], k[1], f[0], f[1], rig.legT, colour);
    // shoe pointing forward
    const sw = rig.legT + 1;
    p.rect(f[0] - Math.floor(rig.legT / 2), f[1], sw, 2, rig.shoes);
  };
  const arm = (sh: Pt, [elbow, hand]: [Pt, Pt], back: boolean) => {
    const e: Pt = [sh[0] + elbow[0], sh[1] + elbow[1]];
    const h: Pt = [sh[0] + hand[0], sh[1] + hand[1]];
    const sleeve = back ? 1 : 2;
    p.limb(sh[0], sh[1], e[0], e[1], rig.armT, sleeve);
    p.limb(e[0], e[1], h[0], h[1], rig.armT, rig.sleeves === 'long' ? sleeve : 3);
    p.rect(h[0] - 1, h[1] - 1, 2, 2, 3);
    return h;
  };

  // back limbs first, in shadow
  const backHand = arm(backSh, pose.backArm, true);
  leg(backHip, pose.backLeg, 1);
  // torso
  p.rect(tx, top, rig.torsoW, torsoH, 2);
  p.vline(tx, top + 1, torsoH - 1, 1); // back-edge shade
  leg(frontHip, pose.frontLeg, rig.pants);
  rig.outfit?.(p, { x: tx, y: top, hip: hipY, pose });
  // head
  const head = rig.heads[pose.head ?? 'normal'];
  const hx = rig.cx - Math.floor(head[0].length / 2) + rig.headDX + lean;
  const hy = top - head.length + 1;
  p.stamp(head, hx, hy);
  // front arm and held item
  const frontHand = arm(frontSh, pose.frontArm, false);
  if (pose.item === 'slingAim' || pose.item === 'sling') {
    const [x, y] = frontHand;
    p.set(x, y + 1, 1).set(x, y + 2, 1).set(x - 1, y - 1, 1).set(x + 1, y - 1, 1).set(x - 1, y - 2, 1).set(x + 1, y - 2, 1);
    if (pose.item === 'slingAim') {
      p.line(x - 1, y - 2, backHand[0], backHand[1], 3);
      p.line(x + 1, y - 2, backHand[0], backHand[1], 3);
    }
  } else if (pose.item === 'garlic') {
    const [x, y] = backHand;
    p.rect(x - 1, y - 2, 3, 3, 3).set(x, y - 3, 1);
  } else if (pose.item === 'fist') {
    const [x, y] = frontHand;
    p.rect(x - 1, y - 1, 3, 3, 3).set(x + 1, y, 1);
  }
  p.outlineOf(1, [2, 3]);
  return p;
}

/* ------------------------------------------------------------------ */
/* Poses                                                                */
/* ------------------------------------------------------------------ */

const STAND_LEG: [Pt, Pt] = [[0, 4], [0, 7]];

/** Scale a pose's limb offsets for bigger or smaller kids. */
function scaled(p: Pose, s: number): Pose {
  const sc = ([a, b]: [Pt, Pt]): [Pt, Pt] => [
    [Math.round(a[0] * s), Math.round(a[1] * s)],
    [Math.round(b[0] * s), Math.round(b[1] * s)],
  ];
  return { ...p, backLeg: sc(p.backLeg), frontLeg: sc(p.frontLeg), backArm: sc(p.backArm), frontArm: sc(p.frontArm), sink: p.sink !== undefined ? Math.round(p.sink * s) : undefined };
}

function idle(i: number): Pose {
  return {
    bob: i >= 2 && i <= 4 ? 1 : 0,
    backLeg: [[-1, 4], [-1, 7]],
    frontLeg: [[1, 4], [1, 7]],
    backArm: [[-1, 4], [-1, 7]],
    frontArm: [[0, 4], [1, 7]],
    head: i === 6 ? 'blink' : 'normal',
  };
}

function run(i: number): Pose {
  const ph = (i / 8) * Math.PI * 2;
  const legPose = (q: number): [Pt, Pt] => {
    const fx = Math.round(Math.sin(q) * 5);
    const lift = Math.cos(q) > 0 ? Math.round(Math.cos(q) * 3) : 0;
    return [[Math.round(fx / 2) + 1 + Math.round(lift / 2), 4 - lift], [fx, 7 - lift]];
  };
  const armPose = (q: number): [Pt, Pt] => {
    const s = Math.sin(q);
    return [[Math.round(-s * 2), 4], [Math.round(-s * 4) + 2, 6 - Math.round(Math.abs(s))]];
  };
  return {
    bob: Math.abs(Math.sin(ph)) > 0.7 ? 1 : 0,
    lean: 1,
    frontLeg: legPose(ph),
    backLeg: legPose(ph + Math.PI),
    frontArm: armPose(ph + Math.PI),
    backArm: armPose(ph),
  };
}

const POSES: Record<string, Pose[]> = {
  idle: [0, 1, 2, 3, 4, 5, 6, 7].map(idle),
  run: [0, 1, 2, 3, 4, 5, 6, 7].map(run),
  jump: [{ lean: 1, backLeg: [[-1, 4], [-2, 8]], frontLeg: [[3, 2], [2, 6]], backArm: [[-2, -2], [-3, -5]], frontArm: [[2, -2], [3, -5]] }],
  apex: [{ backLeg: [[0, 3], [-1, 6]], frontLeg: [[3, 2], [2, 5]], backArm: [[-3, 1], [-5, -1]], frontArm: [[3, 1], [5, -1]] }],
  fall: [
    { backLeg: [[-1, 4], [-2, 7]], frontLeg: [[1, 4], [2, 7]], backArm: [[-2, -3], [-3, -6]], frontArm: [[2, -3], [3, -6]] },
    { backLeg: [[-1, 4], [-1, 7]], frontLeg: [[1, 4], [1, 7]], backArm: [[-3, -2], [-4, -5]], frontArm: [[3, -2], [4, -5]] },
  ],
  land: [{ sink: 2, bob: 1, backLeg: [[1, 2], [-2, 5]], frontLeg: [[3, 2], [2, 5]], backArm: [[-2, 3], [-4, 5]], frontArm: [[2, 3], [4, 5]] }],
  hurt: [{ lean: -2, head: 'hurt', backLeg: [[-2, 4], [-3, 7]], frontLeg: [[2, 3], [3, 6]], backArm: [[-3, -2], [-5, -3]], frontArm: [[2, -3], [1, -6]] }],
  crouch: [{ sink: 5, torsoH: 5, bob: 0, backLeg: [[3, -1], [0, 2]], frontLeg: [[4, -1], [2, 2]], backArm: [[1, 3], [3, 4]], frontArm: [[2, 3], [4, 3]] }],
  crawl: [0, 1, 2, 3].map((i) => ({
    sink: 5,
    torsoH: 5,
    lean: 1,
    backLeg: [[3 + (i % 2), -1], [0 - (i === 1 ? 1 : 0), 2]] as [Pt, Pt],
    frontLeg: [[4 - (i % 2), -1], [2 + (i === 3 ? 1 : 0), 2]] as [Pt, Pt],
    backArm: [[1, 3], [3 + (i % 2), 4]] as [Pt, Pt],
    frontArm: [[2, 3], [5 - (i % 2), 3]] as [Pt, Pt],
  })),
  climb: [0, 1, 2, 3].map((i) => {
    const up = i < 2;
    return {
      backLeg: [[0, up ? 2 : 4], [0, up ? 5 : 7]] as [Pt, Pt],
      frontLeg: [[1, up ? 4 : 2], [1, up ? 7 : 5]] as [Pt, Pt],
      backArm: [[0, -3], [1, up ? -4 : -7]] as [Pt, Pt],
      frontArm: [[1, -3], [2, up ? -7 : -4]] as [Pt, Pt],
      head: i === 3 ? ('blink' as HeadKind) : ('normal' as HeadKind),
    };
  }),
};

/* Ability poses per kid */
const CASEY_AIM: Pose[] = [0, 1].map((i) => ({
  lean: -1,
  head: 'effort' as HeadKind,
  backLeg: [[-2, 4], [-3, 7]] as [Pt, Pt],
  frontLeg: [[2, 4], [3, 7]] as [Pt, Pt],
  backArm: [[-2, 1], [-4 - i, 0]] as [Pt, Pt],
  frontArm: [[3, 0], [6, -1]] as [Pt, Pt],
  item: 'slingAim' as const,
}));
const CASEY_SHOOT: Pose[] = [
  { lean: 1, backLeg: [[-2, 4], [-3, 7]], frontLeg: [[2, 4], [3, 7]], backArm: [[1, 1], [3, 0]], frontArm: [[3, 0], [6, -1]], item: 'sling' },
  { lean: 1, backLeg: [[-2, 4], [-3, 7]], frontLeg: [[2, 4], [3, 7]], backArm: [[0, 3], [1, 5]], frontArm: [[3, 1], [6, 1]], item: 'sling' },
  { backLeg: [[-1, 4], [-1, 7]], frontLeg: [[1, 4], [1, 7]], backArm: [[-1, 4], [-1, 7]], frontArm: [[2, 3], [4, 5]], item: 'sling' },
];
const MO_THROW: Pose[] = [
  { lean: -1, head: 'effort', backLeg: [[-2, 4], [-3, 7]], frontLeg: [[2, 4], [3, 7]], backArm: [[-2, -3], [-4, -6]], frontArm: [[2, 2], [4, 3]], item: 'garlic' },
  { lean: 1, head: 'effort', backLeg: [[-2, 4], [-3, 7]], frontLeg: [[2, 4], [3, 7]], backArm: [[2, -4], [5, -6]], frontArm: [[1, 3], [0, 5]] },
  { lean: 2, backLeg: [[-2, 4], [-3, 7]], frontLeg: [[2, 4], [3, 7]], backArm: [[3, 0], [6, 2]], frontArm: [[0, 4], [-1, 6]] },
];
const BRUNO_PUNCH: Pose[] = [
  { lean: -1, head: 'effort', backLeg: [[-2, 4], [-3, 7]], frontLeg: [[2, 4], [3, 7]], backArm: [[2, 2], [4, 1]], frontArm: [[-2, 2], [-3, 0]], item: 'fist' },
  { lean: 2, head: 'effort', backLeg: [[-2, 4], [-3, 7]], frontLeg: [[2, 4], [3, 7]], backArm: [[1, 3], [2, 5]], frontArm: [[4, 0], [8, 0]], item: 'fist' },
  { lean: 2, head: 'effort', backLeg: [[-2, 4], [-3, 7]], frontLeg: [[2, 4], [3, 7]], backArm: [[1, 3], [2, 5]], frontArm: [[4, 0], [8, 0]], item: 'fist' },
  { lean: 0, backLeg: [[-1, 4], [-1, 7]], frontLeg: [[1, 4], [1, 7]], backArm: [[-1, 4], [-1, 7]], frontArm: [[3, 2], [5, 2]], item: 'fist' },
];
const BRUNO_PUSH: Pose[] = [0, 1, 2, 3].map((i) => ({
  lean: 3,
  head: 'effort' as HeadKind,
  backLeg: [[-2, 4], [-4 + (i % 2), 7]] as [Pt, Pt],
  frontLeg: [[1, 4], [-1 - (i % 2), 7]] as [Pt, Pt],
  backArm: [[3, 1], [6, 1]] as [Pt, Pt],
  frontArm: [[3, 0], [6, 0]] as [Pt, Pt],
}));

/* ------------------------------------------------------------------ */
/* The four rigs                                                        */
/* ------------------------------------------------------------------ */

const RIGS: Record<KidId, Rig> = {
  sling: {
    id: 'sling',
    w: 20,
    h: 26,
    ground: 26,
    cx: 10,
    shoulderY: 10,
    hipY: 17,
    torsoW: 6,
    legT: 2,
    armT: 2,
    pants: 1,
    shoes: 2,
    sleeves: 'short',
    heads: CASEY_HEAD,
    headDX: 0,
    outfit: (p, o) => {
      p.hline(o.x, o.hip - 1, 6, 1); // belt
      p.set(o.x + 4, o.y + 2, 3).set(o.x + 3, o.y + 3, 3); // a star on the tee
    },
  },
  garlic: {
    id: 'garlic',
    w: 20,
    h: 26,
    ground: 26,
    cx: 10,
    shoulderY: 10,
    hipY: 17,
    torsoW: 6,
    legT: 2,
    armT: 2,
    pants: 1,
    shoes: 1,
    sleeves: 'long',
    heads: MO_HEAD,
    headDX: 0,
    outfit: (p, o) => {
      // hood bunched behind the neck, front pocket, a necklace of garlic bulbs
      p.rect(o.x - 1, o.y - 1, 3, 3, 2);
      p.hline(o.x + 1, o.y + 4, 4, 1);
      for (const dx of [1, 3, 5]) p.set(o.x + dx, o.y + 1, 3);
    },
  },
  big: {
    id: 'big',
    w: 24,
    h: 28,
    ground: 28,
    cx: 12,
    shoulderY: 11,
    hipY: 19,
    torsoW: 8,
    legT: 3,
    armT: 3,
    pants: 2,
    shoes: 1,
    sleeves: 'short',
    heads: BRUNO_HEAD,
    headDX: 0,
    outfit: (p, o) => {
      // dungarees: bare shoulders, straps, bib and a big pocket
      p.rect(o.x + 1, o.y, 6, 2, 3);
      p.vline(o.x + 2, o.y, 3, 1).vline(o.x + 6, o.y, 3, 1);
      p.rect(o.x + 2, o.y + 4, 4, 2, 1).set(o.x + 3, o.y + 4, 2);
    },
  },
  little: {
    id: 'little',
    w: 16,
    h: 16,
    ground: 16,
    cx: 8,
    shoulderY: 7,
    hipY: 11,
    torsoW: 5,
    legT: 2,
    armT: 2,
    pants: 1,
    shoes: 2,
    sleeves: 'long',
    heads: PIP_HEAD,
    headDX: 0,
    outfit: (p, o) => {
      // raincoat flares below the hips; toggles down the front
      p.rect(o.x - 1, o.hip, 7, 2, 2);
      p.set(o.x + 3, o.y + 1, 1).set(o.x + 3, o.y + 3, 1);
    },
  },
};

const SCALE: Record<KidId, number> = { sling: 1, garlic: 1, big: 1.15, little: 0.7 };

export interface KidSheet {
  anims: Record<string, AnimDef>;
  /** sprite width / height */
  w: number;
  h: number;
}

function build(id: KidId): KidSheet {
  const rig = RIGS[id];
  const s = SCALE[id];
  const frames = (name: string, poses: Pose[]): Sprite[] => poses.map((po, i) => draw(rig, scaled(po, s)).toSprite(`kid_${id}_${name}_${i}`));
  const a: Record<string, AnimDef> = {
    idle: anim(frames('idle', POSES.idle), 4),
    run: anim(frames('run', POSES.run), 14),
    jump: anim(frames('jump', POSES.jump), 1, false),
    apex: anim(frames('apex', POSES.apex), 1, false),
    fall: anim(frames('fall', POSES.fall), 8),
    land: anim(frames('land', POSES.land), 1, false),
    hurt: anim(frames('hurt', POSES.hurt), 1, false),
    crouch: anim(frames('crouch', POSES.crouch), 1),
    crawl: anim(frames('crawl', POSES.crawl), 8),
    climb: anim(frames('climb', POSES.climb), 8),
  };
  if (id === 'sling') {
    a.aim = anim(frames('aim', CASEY_AIM), 10);
    a.ability = anim(frames('shoot', CASEY_SHOOT), 14, false);
  } else if (id === 'garlic') {
    a.ability = anim(frames('throw', MO_THROW), 12, false);
  } else if (id === 'big') {
    a.ability = anim(frames('punch', BRUNO_PUNCH), 16, false);
    a.push = anim(frames('push', BRUNO_PUSH), 6);
  } else {
    // Pip's double jump: a tucked somersault, rotated a quarter turn per frame
    const tuck = draw(rig, scaled({ sink: 2, bob: 1, backLeg: [[2, 1], [0, 4]], frontLeg: [[3, 1], [1, 4]], backArm: [[2, 2], [3, 4]], frontArm: [[2, 2], [4, 3]] }, s));
    const ball = tuck.centredIn(12);
    const flips = [0, 1, 2, 3].map((t) => {
      const f = new PixelArt(rig.w, rig.h);
      f.blit(ball.rotate90(t), Math.floor((rig.w - 12) / 2), rig.h - 14);
      return f.toSprite(`kid_${id}_flip_${t}`);
    });
    a.flip = anim(flips, 16);
    a.ability = a.flip;
  }
  return { anims: a, w: rig.w, h: rig.h };
}

export const KID_SHEETS: Record<KidId, KidSheet> = {
  sling: build('sling'),
  garlic: build('garlic'),
  big: build('big'),
  little: build('little'),
};

/** Portrait sprites for the HUD (#45): just the head, outlined. */
function portrait(id: KidId): Sprite {
  const head = RIGS[id].heads.normal;
  const p = new PixelArt(head[0].length + 2, head.length + 2);
  p.stamp(head, 1, 1).outline(1);
  return p.toSprite(`portrait_${id}`);
}
export const KID_PORTRAITS: Record<KidId, Sprite> = {
  sling: portrait('sling'),
  garlic: portrait('garlic'),
  big: portrait('big'),
  little: portrait('little'),
};

/** Every kid sprite, for the palette check. */
export function allKidSprites(): Sprite[] {
  const seen = new Set<string>();
  const out: Sprite[] = [];
  for (const s of Object.values(KID_SHEETS))
    for (const a of Object.values(s.anims))
      for (const f of a.frames)
        if (!seen.has(f.name)) {
          seen.add(f.name);
          out.push(f);
        }
  out.push(...Object.values(KID_PORTRAITS));
  return out;
}

export { STAND_LEG };
