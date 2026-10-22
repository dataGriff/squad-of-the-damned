/**
 * Story screens (#57): chapters of big-picture panels with typewriter text,
 * shown before and after each night. Panel art is composed from the game's
 * own 4-colour sprites, pixel-doubled or more, inside a framed picture box.
 */
import type { Renderer } from '../engine/render';
import type { Sprite } from '../engine/sprites';
import type { SpritePalette } from './palette';
import { rotated } from './palette';
import { drawBackdrop } from './backdrop';
import type { Theme } from './art/tiles';
import { BAT, BAT_PAL, GIANT, GIANT_PAL, MUMMY, MUMMY_PAL, VAMPIRE, VAMPIRE_PAL, WOLFMAN, WOLF_PAL } from './art/monsters';
import { PORTAL, PORTAL_PAL } from './art/items';
import { KID_PORTRAITS, KID_SHEETS } from './art/kids';
import { KIDS, KID_ORDER } from './squad';
import { BROKEN_RIM, MUSEUM } from './art/landmarks';
import { BIG_MOON } from './art/backdrops';
import { OAK_CANOPY, OAK_CANOPY_PAL, TREEHOUSE, TREEHOUSE_PAL } from './art/scenery';
import { pal } from './palette';
import { SHADOW_PAL } from './art/common';
import type { Colour } from './design/tokens';

/** The picture box every panel draws into. */
/** Palettes only the story panels use, registered with the art (#63). */
const MUSEUM_LIT = pal('black', 'amber', 'tan');
const RIM_LIT = pal('black', 'drainBlue', 'teal');
const MOON_BIG = pal('moon', 'sand', 'yellow');
export const STORY_ART: { sprite: Sprite; pal: SpritePalette }[] = [
  { sprite: MUSEUM, pal: MUSEUM_LIT },
  { sprite: BROKEN_RIM, pal: RIM_LIT },
  { sprite: BIG_MOON, pal: MOON_BIG },
];

export const BOX = { x: 16, y: 20, w: 224, h: 112 };

export interface Panel {
  text: string;
  art: (r: Renderer, t: number) => void;
}
export interface Chapter {
  id: string;
  panels: Panel[];
}


/** A theme's backdrop, scrolled vertically by `dy` so the interesting part sits in the box. */
function scene(theme: Theme, dy: number, camX = 0) {
  return (r: Renderer, t: number) => {
    r.ctx.save();
    r.ctx.translate(0, -dy);
    drawBackdrop(r, theme, camX + t * 6, t);
    r.ctx.restore();
  };
}
const big = (r: Renderer, s: Sprite, p: SpritePalette, x: number, y: number, k: number, flip = false) => r.spriteScaled(s, p, x, y, k, flip);
const ground = (r: Renderer, colour: Colour = 'black') => r.rect(BOX.x, BOX.y + BOX.h - 10, BOX.w, 10, colour);

function bats(r: Renderer, t: number, n: number, spread = 1) {
  for (let i = 0; i < n; i++) {
    const x = BOX.x + ((i * 53 + t * (30 + (i % 4) * 12)) % (BOX.w + 40)) - 20;
    const y = BOX.y + 12 + ((i * 29) % 60) * spread + Math.sin(t * 3 + i) * 4;
    r.sprite(BAT.frames[Math.floor(t * 12 + i) % BAT.frames.length], BAT_PAL, x, y);
  }
}

export const CHAPTERS: Record<string, Chapter> = {
  intro: {
    id: 'intro',
    panels: [
      {
        text: 'ELM ST. A MOVING VAN ARRIVES AT MIDNIGHT. NOBODY SEES THE NEW FAMILY GET OUT.',
        art: (r, t) => {
          scene('suburb', 70)(r, t);
          bats(r, t, 3);
        },
      },
      {
        text: 'THEY NEVER COME OUT BY DAY.',
        art: (r, t) => {
          r.rect(BOX.x, BOX.y, BOX.w, BOX.h, 'black');
          r.dither(BOX.x + 60, BOX.y, 104, BOX.h, 'darkBrown');
          big(r, VAMPIRE.idle.frames[Math.floor(t * 2) % 2], VAMPIRE_PAL, 80, BOX.y + 8, 4);
        },
      },
      {
        text: 'UP IN THE TREEHOUSE, FOUR KIDS HAVE BEEN WATCHING. AND TAKING NOTES.',
        art: (r, t) => {
          scene('suburb', 0)(r, t);
          r.sprite(OAK_CANOPY, OAK_CANOPY_PAL, -16, BOX.y - 4);
          r.sprite(TREEHOUSE, TREEHOUSE_PAL, 60, BOX.y + 30);
        },
      },
      {
        text: 'CASEY. MO. BRUNO. PIP. THE SQUAD. TONIGHT THEY GO IN.',
        art: (r) => {
          r.rect(BOX.x, BOX.y, BOX.w, BOX.h, 'black');
          KID_ORDER.forEach((id, i) => {
            const x = BOX.x + 12 + i * 54;
            r.dither(x - 4, BOX.y + 8, 56, 72, 'darkGrey', i % 2);
            const pt = KID_PORTRAITS[id];
            big(r, pt, KIDS[id].palette, x + 24 - pt.w * 2, BOX.y + 14, 4);
            r.text(KIDS[id].name, x + 24 - KIDS[id].name.length * 4, BOX.y + 90, 'yellow');
          });
        },
      },
    ],
  },
  'after-night1': {
    id: 'after-night1',
    panels: [{ text: 'THE COUNT SCATTERS INTO A HUNDRED BATS. ELM ST IS QUIET. FOR NOW.', art: (r, t) => (scene('suburb', 30)(r, t), bats(r, t, 14, 0.8)) }],
  },
  'before-night2': {
    id: 'before-night2',
    panels: [
      {
        text: 'THE OLD GRAVEYARD. SOMETHING VERY BIG HAS BEEN DIGGING.',
        art: (r, t) => {
          scene('graveyard', 60)(r, t);
          big(r, GIANT.walk.frames[Math.floor(t * 3) % 4], SHADOW_PAL, 140, BOX.y + 4, 2);
        },
      },
    ],
  },
  'after-night2': {
    id: 'after-night2',
    panels: [
      {
        text: 'THE GIANT SITS DOWN. HE ONLY EVER WANTED A FRIEND. NOW HE HAS FOUR.',
        art: (r, t) => {
          scene('graveyard', 80)(r, t);
          ground(r);
          r.sprite(GIANT.sit.frames[0], GIANT_PAL, 70, BOX.y + BOX.h - 10 - 52);
          KID_ORDER.forEach((id, i) => {
            const s = KID_SHEETS[id].anims.idle.frames[Math.floor(t * 4 + i * 3) % 8];
            r.sprite(s, KIDS[id].palette, 118 + i * 22, BOX.y + BOX.h - 10 - s.h, true);
          });
        },
      },
    ],
  },
  'before-night3': {
    id: 'before-night3',
    panels: [
      {
        text: 'FULL MOON OVER MAPLE DRIVE. MR GREY THE POSTMAN NEVER FINISHED HIS ROUND.',
        art: (r, t) => {
          scene('suburb', 80)(r, t);
          big(r, BIG_MOON, MOON_BIG, 106, BOX.y + 4, 2);
          r.rect(BOX.x, BOX.y + BOX.h - 22, BOX.w, 22, 'black');
          big(r, WOLFMAN.howl.frames[0], SHADOW_PAL, 112, BOX.y + BOX.h - 22 - 62, 2);
        },
      },
    ],
  },
  'after-night3': {
    id: 'after-night3',
    panels: [
      {
        text: 'MR GREY WAKES UP IN A HEDGE. HE HAS NO IDEA WHY HIS UNIFORM IS TORN.',
        art: (r, t) => {
          scene('suburb', 90)(r, t);
          big(r, WOLFMAN.human.frames[0], WOLF_PAL, 96, BOX.y + BOX.h - 64, 2);
        },
      },
    ],
  },
  'before-night4': {
    id: 'before-night4',
    panels: [
      {
        text: 'UNDER THE MUSEUM. ONE OF THE EXHIBITS HAS GONE FOR A WALK.',
        art: (r) => {
          r.rect(BOX.x, BOX.y, BOX.w, BOX.h, 'drainBlue');
          r.sprite(MUSEUM, MUSEUM_LIT, 78, BOX.y + 4);
          r.rect(118, BOX.y + 38, 22, 46, 'black'); // the sarcophagus is empty
          r.sprite(BROKEN_RIM, RIM_LIT, 78, BOX.y + 4);
        },
      },
    ],
  },
  'after-night4': {
    id: 'after-night4',
    panels: [
      {
        text: 'THE MUMMY IS BACK IN ITS CASE. THE GIFT SHOP NOW SELLS A PLUSH ONE.',
        art: (r) => {
          r.rect(BOX.x, BOX.y, BOX.w, BOX.h, 'drainBlue');
          r.sprite(MUSEUM, MUSEUM_LIT, 78, BOX.y + 4);
          r.sprite(BROKEN_RIM, RIM_LIT, 78, BOX.y + 4);
          r.sprite(MUMMY.idle.frames[0], MUMMY_PAL, 170, BOX.y + BOX.h - 34);
        },
      },
    ],
  },
  'before-night5': {
    id: 'before-night5',
    panels: [
      {
        text: 'THE STORM DRAIN. THE FROGS HAVE STOPPED SINGING.',
        art: (r, t) => {
          scene('drain', 40)(r, t);
          const blink = Math.floor(t * 2) % 5 === 0;
          if (!blink) for (const ex of [118, 132]) r.rect(ex, BOX.y + 58, 3, 2, 'cyan');
        },
      },
    ],
  },
  'after-night5': {
    id: 'after-night5',
    panels: [
      {
        text: 'THE DRAIN GOES QUIET. BUT EVERY TRAIL LEADS BACK TO ONE PLACE: THE GRAVEYARD.',
        art: (r, t) => {
          scene('graveyard', 70)(r, t);
          r.sprite(PORTAL.frames[Math.floor(t * 6) % 2], rotated(PORTAL_PAL, Math.floor(t * 8)), 112, BOX.y + BOX.h - 52);
        },
      },
    ],
  },
  finale: {
    id: 'finale',
    panels: [
      {
        text: '11:30 PM. A PORTAL IS OPENING AMONG THE GRAVES. EVERY MONSTER CAME THROUGH IT.',
        art: (r, t) => {
          scene('graveyard', 70)(r, t);
          big(r, PORTAL.frames[Math.floor(t * 6) % 2], rotated(PORTAL_PAL, Math.floor(t * 8)), 96, BOX.y + 8, 2);
        },
      },
      {
        text: 'THE GIANT HOLDS IT SHUT. THE SQUAD HAS UNTIL MIDNIGHT.',
        art: (r, t) => {
          scene('graveyard', 80)(r, t);
          ground(r);
          r.sprite(PORTAL.frames[Math.floor(t * 6) % 2], rotated(PORTAL_PAL, Math.floor(t * 8)), 136, BOX.y + BOX.h - 10 - 48);
          r.sprite(GIANT.burn.frames[0], GIANT_PAL, 96, BOX.y + BOX.h - 10 - 52);
        },
      },
    ],
  },
  ending: {
    id: 'ending',
    panels: [
      {
        text: 'THE PORTAL SNAPS SHUT AS THE CLOCK STRIKES TWELVE.',
        art: (r, t) => {
          scene('graveyard', 70)(r, t);
          const k = Math.max(0.05, 1 - (t % 3) / 2);
          r.ctx.save();
          r.ctx.translate(128, BOX.y + 60);
          r.ctx.scale(k, 1);
          r.ctx.drawImage(r.atlas.get(PORTAL.frames[0], rotated(PORTAL_PAL, Math.floor(t * 12))), -16, -24);
          r.ctx.restore();
          if (t % 3 > 2 && t % 3 < 2.2) r.dither(BOX.x, BOX.y, BOX.w, BOX.h, 'white');
        },
      },
      {
        text: 'ELM ST. THE GRAVEYARD. MAPLE DRIVE. THE MUSEUM. THE DRAIN. ALL QUIET.',
        art: (r, t) => {
          scene('suburb', 90)(r, t);
          KID_ORDER.forEach((id, i) => {
            const s = KID_SHEETS[id].anims.run.frames[Math.floor(t * 14 + i * 2) % 8];
            r.sprite(s, KIDS[id].palette, BOX.x + ((t * 40 + i * 26) % (BOX.w + 30)) - 20, BOX.y + BOX.h - 2 - s.h);
          });
        },
      },
      {
        text: 'SCHOOL STARTS IN EIGHT HOURS.',
        art: (r, t) => {
          scene('suburb', 0)(r, t);
          r.sprite(OAK_CANOPY, OAK_CANOPY_PAL, -16, BOX.y - 4);
          r.sprite(TREEHOUSE, TREEHOUSE_PAL, 60, BOX.y + 30);
        },
      },
    ],
  },
};

/** The order chapters happen in, for "story so far". */
export const CHAPTER_ORDER = ['intro', 'after-night1', 'before-night2', 'after-night2', 'before-night3', 'after-night3', 'before-night4', 'after-night4', 'before-night5', 'after-night5', 'finale', 'ending'];

/** Chapter shown before a night (null = the finale). */
export function beforeChapter(night: number | null): string | null {
  if (night === null) return 'finale';
  if (night === 1) return 'intro';
  return CHAPTERS[`before-night${night}`] ? `before-night${night}` : null;
}
/** Chapter shown after a night is cleared (null = the finale). */
export function afterChapter(night: number | null): string | null {
  if (night === null) return 'ending';
  return CHAPTERS[`after-night${night}`] ? `after-night${night}` : null;
}

/** Chapters already seen, in story order, for replay from the treehouse. */
export function storySoFar(seen: string[]): Chapter[] {
  return CHAPTER_ORDER.filter((id) => seen.includes(id)).map((id) => CHAPTERS[id]);
}
