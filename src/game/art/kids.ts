/**
 * Kid sprite sheets ×4 (#38): idle / run / jump / hurt / ability / crouch.
 * Frames are composed from head + torso + leg parts so each kid stays within
 * 4 colours: 1 = outline/dark (hair, pants, shoes), 2 = clothes, 3 = skin.
 */
import { anim, defineSprite, type AnimDef, type Sprite } from '../../engine/sprites';
import type { KidId } from '../squad';

type Rows = string[];

const join = (...parts: Rows[]): Rows => parts.flat();

/* ---------- 16-wide "mid" kid parts (Casey, Mo) ---------- */

const HEAD_CASEY: Rows = [
  '......1111......',
  '.....122221.....',
  '....12222221....',
  '....11111111....',
  '....13333331....',
  '....13133131....',
  '....13333331....',
  '.....133331.....',
];
const HEAD_CASEY_HURT: Rows = [...HEAD_CASEY.slice(0, 5), '....11313111....', ...HEAD_CASEY.slice(6)];

const HEAD_MO: Rows = [
  '.....111111.....',
  '....11111111....',
  '....11111111....',
  '....11333311....',
  '....13333331....',
  '....13133131....',
  '....13333331....',
  '.....133331.....',
];
const HEAD_MO_HURT: Rows = [...HEAD_MO.slice(0, 5), '....11313111....', ...HEAD_MO.slice(6)];

const TORSO_MID: Rows = [
  '....12222221....',
  '...1222222221...',
  '..13122222213...',
  '..13122222213...',
  '..1.122222221...',
  '....12222221....',
  '....11111111....',
];
const TORSO_MID_RUN_A: Rows = [
  '....12222221....',
  '...1222222221...',
  '..1312222221....',
  '..1312222221.3..',
  '....12222221.1..',
  '....12222221....',
  '....11111111....',
];
const TORSO_MID_RUN_B: Rows = [
  '....12222221....',
  '...1222222221...',
  '....1222222131..',
  '..3.1222222131..',
  '..1.12222221....',
  '....12222221....',
  '....11111111....',
];
/** Arm forward: slingshot pulled / bomb thrown. */
const TORSO_MID_ABILITY: Rows = [
  '....12222221....',
  '...1222222221...',
  '..1.1222222133..',
  '..1.12222221333.',
  '..13122222211...',
  '....12222221....',
  '....11111111....',
];
const TORSO_MID_HURT: Rows = [
  '..3.12222221.3..',
  '..1.1222222211..',
  '..1.12222221....',
  '..1312222221....',
  '....12222221....',
  '....12222221....',
  '....11111111....',
];

const LEGS_STAND: Rows = [
  '....111..111....',
  '....111..111....',
  '....133..331....',
  '....133..331....',
  '....111..111....',
  '...1111..1111...',
  '................',
];
const LEGS_RUN_1: Rows = [
  '...111....111...',
  '..111......111..',
  '..133......331..',
  '.133........331.',
  '.111........111.',
  '1111........1111',
  '................',
];
const LEGS_RUN_2: Rows = [
  '....111..111....',
  '....111..111....',
  '....133.331.....',
  '....133.331.....',
  '....111.111.....',
  '...1111.1111....',
  '................',
];
const LEGS_RUN_3: Rows = [
  '....111.111.....',
  '...111...111....',
  '...133...331....',
  '..133.....331...',
  '..111.....111...',
  '.1111.....1111..',
  '................',
];
const LEGS_RUN_4: Rows = [
  '....111..111....',
  '....111..111....',
  '.....133.331....',
  '.....133.331....',
  '.....111.111....',
  '....1111.1111...',
  '................',
];
const LEGS_JUMP: Rows = [
  '...111....111...',
  '..1331....1331..',
  '..111......111..',
  '................',
  '................',
  '................',
  '................',
];

/* ---------- 16-wide big kid (Bruno), 24 tall ---------- */
const HEAD_BRUNO: Rows = [
  '....11111111....',
  '...1111111111...',
  '...1133333311...',
  '...1333333331...',
  '...1313333131...',
  '...1333333331...',
  '...1333333331...',
  '....13333331....',
];
const HEAD_BRUNO_HURT: Rows = [...HEAD_BRUNO.slice(0, 4), '...1131331311...', ...HEAD_BRUNO.slice(5)];
const TORSO_BIG: Rows = [
  '..1222222222221.',
  '.12222222222221.',
  '.13122222222131.',
  '.13122222222131.',
  '.13122222222131.',
  '.11122222222111.',
  '..1222222222221.',
  '..111111111111..',
];
const TORSO_BIG_PUNCH: Rows = [
  '..1222222222221.',
  '.12222222222221.',
  '.1312222222221..',
  '.131222222221333',
  '.131222222221333',
  '.111222222221...',
  '..1222222222221.',
  '..111111111111..',
];
const TORSO_BIG_PUSH: Rows = [
  '..1222222222221.',
  '.12222222222221.',
  '.1.1222222221333',
  '.1.12222222213..',
  '.131222222221333',
  '.111222222221...',
  '..1222222222221.',
  '..111111111111..',
];
const TORSO_BIG_HURT: Rows = [
  '.3.122222222213.',
  '.1.1222222222.1.',
  '.1.122222222211.',
  '.1312222222221..',
  '.131222222222...',
  '.111222222221...',
  '..1222222222221.',
  '..111111111111..',
];
const LEGS_BIG_STAND: Rows = [
  '...1111..1111...',
  '...1111..1111...',
  '...1331..1331...',
  '...1331..1331...',
  '...1111..1111...',
  '..11111..11111..',
  '................',
  '................',
];
const LEGS_BIG_RUN_1: Rows = [
  '..1111....1111..',
  '.1111......1111.',
  '.1331......1331.',
  '1331........1331',
  '1111........1111',
  '1111........1111',
  '................',
  '................',
];
const LEGS_BIG_RUN_2: Rows = [
  '...1111..1111...',
  '...1111.1111....',
  '...1331.1331....',
  '...1331.1331....',
  '...1111.1111....',
  '..11111.11111...',
  '................',
  '................',
];
const LEGS_BIG_JUMP: Rows = [
  '..1111....1111..',
  '.13311....13311.',
  '.1111......1111.',
  '................',
  '................',
  '................',
  '................',
  '................',
];

/* ---------- 12-wide little kid (Pip), 14 tall ---------- */
const HEAD_PIP: Rows = [
  '....1111....',
  '...111111...',
  '..13333331..',
  '..13133131..',
  '..13333331..',
  '...133331...',
];
const HEAD_PIP_HURT: Rows = [...HEAD_PIP.slice(0, 3), '..11313111..', ...HEAD_PIP.slice(4)];
const TORSO_PIP: Rows = ['...122221...', '..31222213..', '..11222211..', '...111111...'];
const TORSO_PIP_RUN: Rows = ['...122221...', '..1122223...', '...1222211..', '...111111...'];
const TORSO_PIP_HURT: Rows = ['.3.122221.3.', '.1112222111.', '...122221...', '...111111...'];
const TORSO_PIP_ABILITY: Rows = ['...122221...', '..11222213..', '...12222133.', '...111111...'];
const LEGS_PIP_STAND: Rows = ['...11..11...', '...13..31...', '...11..11...', '..111..111..'];
const LEGS_PIP_RUN_1: Rows = ['..11....11..', '.13......31.', '.11......11.', '111......111'];
const LEGS_PIP_RUN_2: Rows = ['...11.11....', '...13.31....', '...11.11....', '..111.111...'];
const LEGS_PIP_JUMP: Rows = ['..11....11..', '.131....131.', '.11......11.', '............'];

/* ---------- crouch frames ---------- */
const CROUCH_MID: Rows = [
  '......1111......',
  '.....122221.....',
  '....12222221....',
  '....11111111....',
  '....13333331....',
  '....13133131....',
  '...1133333311...',
  '..13122222213...',
  '..11122222211...',
  '...1222222221...',
  '..1111111111....',
  '..133....331....',
  '..111....111....',
  '.1111...1111....',
];
const CROUCH_MO: Rows = [...HEAD_MO.slice(0, 6), ...CROUCH_MID.slice(6)];
const CROUCH_BIG: Rows = [
  '....11111111....',
  '...1111111111...',
  '...1133333311...',
  '...1313333131...',
  '...1333333331...',
  '..113333333311..',
  '.13122222222131.',
  '.13122222222131.',
  '.11122222222111.',
  '..122222222221..',
  '..111111111111..',
  '..1331....1331..',
  '..1111....1111..',
  '.11111....11111.',
  '................',
  '................',
];
const CROUCH_PIP: Rows = [
  '....1111....',
  '...111111...',
  '..13333331..',
  '..13133131..',
  '..13333331..',
  '.3112222113.',
  '.1112222111.',
  '...111111...',
  '..13....31..',
  '.111....111.',
];

export interface KidSheet {
  anims: Record<string, AnimDef>;
  /** sprite width / height */
  w: number;
  h: number;
}

function sheet(id: string, frames: Record<string, Rows[]>, fps: Record<string, number>, loops: Record<string, boolean>): Record<string, AnimDef> {
  const out: Record<string, AnimDef> = {};
  for (const [name, list] of Object.entries(frames)) {
    const sprites: Sprite[] = list.map((rows, i) => defineSprite(`${id}_${name}_${i}`, rows));
    out[name] = anim(sprites, fps[name] ?? 8, loops[name] ?? true);
  }
  return out;
}

function midKid(id: string, head: Rows, headHurt: Rows, crouch: Rows): KidSheet {
  const frames = {
    idle: [join(head, TORSO_MID, LEGS_STAND), join(head, TORSO_MID, LEGS_STAND.map((r, i) => (i === 0 ? '....111..111....' : r)))],
    run: [
      join(head, TORSO_MID_RUN_A, LEGS_RUN_1),
      join(head, TORSO_MID, LEGS_RUN_2),
      join(head, TORSO_MID_RUN_B, LEGS_RUN_3),
      join(head, TORSO_MID, LEGS_RUN_4),
    ],
    jump: [join(head, TORSO_MID_RUN_A, LEGS_JUMP)],
    fall: [join(head, TORSO_MID_RUN_B, LEGS_JUMP)],
    hurt: [join(headHurt, TORSO_MID_HURT, LEGS_JUMP)],
    ability: [join(head, TORSO_MID_ABILITY, LEGS_STAND), join(head, TORSO_MID_RUN_A, LEGS_STAND)],
    crouch: [crouch],
    climb: [join(head, TORSO_MID_HURT, LEGS_RUN_2), join(head, TORSO_MID_HURT, LEGS_RUN_4)],
  };
  return { anims: sheet(id, frames, { idle: 2, run: 10, ability: 10, climb: 6 }, { hurt: false, ability: false, jump: false }), w: 16, h: 22 };
}

function bigKid(): KidSheet {
  const head = HEAD_BRUNO;
  const frames = {
    idle: [join(head, TORSO_BIG, LEGS_BIG_STAND), join(head, TORSO_BIG, LEGS_BIG_STAND)],
    run: [join(head, TORSO_BIG, LEGS_BIG_RUN_1), join(head, TORSO_BIG, LEGS_BIG_STAND), join(head, TORSO_BIG, LEGS_BIG_RUN_2), join(head, TORSO_BIG, LEGS_BIG_STAND)],
    jump: [join(head, TORSO_BIG, LEGS_BIG_JUMP)],
    fall: [join(head, TORSO_BIG, LEGS_BIG_JUMP)],
    hurt: [join(HEAD_BRUNO_HURT, TORSO_BIG_HURT, LEGS_BIG_JUMP)],
    ability: [join(head, TORSO_BIG_PUNCH, LEGS_BIG_STAND), join(head, TORSO_BIG, LEGS_BIG_STAND)],
    push: [join(head, TORSO_BIG_PUSH, LEGS_BIG_RUN_1), join(head, TORSO_BIG_PUSH, LEGS_BIG_RUN_2)],
    crouch: [CROUCH_BIG],
    climb: [join(head, TORSO_BIG_HURT, LEGS_BIG_RUN_1), join(head, TORSO_BIG_HURT, LEGS_BIG_RUN_2)],
  };
  return { anims: sheet('big', frames, { idle: 2, run: 8, ability: 10, push: 6, climb: 6 }, { hurt: false, ability: false, jump: false }), w: 16, h: 24 };
}

function littleKid(): KidSheet {
  const head = HEAD_PIP;
  const frames = {
    idle: [join(head, TORSO_PIP, LEGS_PIP_STAND), join(head, TORSO_PIP, LEGS_PIP_STAND)],
    run: [join(head, TORSO_PIP_RUN, LEGS_PIP_RUN_1), join(head, TORSO_PIP, LEGS_PIP_STAND), join(head, TORSO_PIP_RUN, LEGS_PIP_RUN_2), join(head, TORSO_PIP, LEGS_PIP_STAND)],
    jump: [join(head, TORSO_PIP_RUN, LEGS_PIP_JUMP)],
    fall: [join(head, TORSO_PIP, LEGS_PIP_JUMP)],
    hurt: [join(HEAD_PIP_HURT, TORSO_PIP_HURT, LEGS_PIP_JUMP)],
    ability: [join(head, TORSO_PIP_ABILITY, LEGS_PIP_JUMP), join(head, TORSO_PIP_RUN, LEGS_PIP_JUMP)],
    crouch: [CROUCH_PIP],
    climb: [join(head, TORSO_PIP_HURT, LEGS_PIP_RUN_1), join(head, TORSO_PIP_HURT, LEGS_PIP_RUN_2)],
  };
  return { anims: sheet('little', frames, { idle: 2, run: 12, ability: 12, climb: 6 }, { hurt: false, ability: false, jump: false }), w: 12, h: 14 };
}

export const KID_SHEETS: Record<KidId, KidSheet> = {
  sling: midKid('sling', HEAD_CASEY, HEAD_CASEY_HURT, CROUCH_MID),
  garlic: midKid('garlic', HEAD_MO, HEAD_MO_HURT, CROUCH_MO),
  big: bigKid(),
  little: littleKid(),
};

/** Portrait sprites for the HUD (#45): just the head rows. */
export const KID_PORTRAITS: Record<KidId, Sprite> = {
  sling: defineSprite('portrait_sling', HEAD_CASEY),
  garlic: defineSprite('portrait_garlic', HEAD_MO),
  big: defineSprite('portrait_big', HEAD_BRUNO),
  little: defineSprite('portrait_little', HEAD_PIP.map((r) => `..${r}..`)),
};

/** Every kid sprite, for the palette check. */
export function allKidSprites(): Sprite[] {
  const out: Sprite[] = [];
  for (const s of Object.values(KID_SHEETS)) for (const a of Object.values(s.anims)) out.push(...a.frames);
  out.push(...Object.values(KID_PORTRAITS));
  return out;
}
