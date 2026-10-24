/**
 * HUD (#45, framed for #58, moved into the safe area for #61): a bevelled bar
 * with squad portraits (gold frame for the active kid), hearts for the shared
 * HP, silver, lives, and the midnight clock or a prompt for the kid's ability.
 */
import type { Renderer } from '../engine/render';
import { SCREEN_W } from '../engine/constants';
import { KID_PORTRAITS, PORTRAIT_DIM_PAL } from './art/kids';
import { SILHOUETTE_PAL } from './art/common';
import { KIDS, KID_ORDER, type Squad } from './squad';
import { SILVER, SILVER_PAL } from './art/items';
import { CLOCK, CLOCK_PAL, HEART_EMPTY, HEART_EMPTY_PAL, HEART_FULL, HEART_PAL, LIFE, LIFE_PAL } from './art/icons';
import { clock } from '../engine/clock';
import type { Colour } from './design/tokens';
import { SAFE } from './design/layout';
import { write } from './design/type';
import { panel } from './ui/panel';
import { prompt, type PromptContext } from './ui/prompt';


/** The HUD bar covers the top overscan band plus one row of content. */
export const HUD_H = SAFE.y + 18;
/** Top of the HUD's content row. */
const Y = SAFE.y;
const RIGHT = SAFE.x + SAFE.w;

/** A one-pixel bevel: light on the top-left, dark on the bottom-right. */
function bevel(r: Renderer, x: number, y: number, w: number, h: number, light: Colour, dark: Colour): void {
  r.rect(x, y, w, 1, light);
  r.rect(x, y, 1, h, light);
  r.rect(x, y + h - 1, w, 1, dark);
  r.rect(x + w - 1, y, 1, h, dark);
}

export interface HudState {
  squad: Squad;
  lives: number;
  /** Seconds into the finale, or null on a normal night. */
  timer: number | null;
  pagePopup: string | null;
  popupT: number;
  prompts: PromptContext;
}

export function drawHud(r: Renderer, h: HudState): void {
  const { squad } = h;
  // bar
  r.rect(0, 0, SCREEN_W, HUD_H, 'panel');
  r.rect(0, HUD_H - 1, SCREEN_W, 1, 'edge');
  // portraits in bevelled frames
  KID_ORDER.forEach((id, i) => {
    const x = SAFE.x + i * 19;
    const active = squad.active === id;
    const unlocked = squad.unlocked.includes(id);
    r.rect(x, Y, 18, 15, 'panel');
    if (active) bevel(r, x, Y, 18, 15, 'accent', 'accentShade');
    else bevel(r, x, Y, 18, 15, 'shade', 'edge');
    const s = KID_PORTRAITS[id];
    r.ctx.save();
    r.ctx.beginPath();
    r.ctx.rect(x + 1, Y + 1, 16, 13);
    r.ctx.clip();
    r.sprite(s, !unlocked ? SILHOUETTE_PAL : active ? KIDS[id].palette : PORTRAIT_DIM_PAL, x + 9 - Math.floor(s.w / 2), Y + 2);
    r.ctx.restore();
  });
  // shared hearts
  const row = Y + 4;
  for (let i = 0; i < squad.maxHp; i++) {
    const full = i < squad.hp;
    r.sprite(full ? HEART_FULL : HEART_EMPTY, full ? HEART_PAL : HEART_EMPTY_PAL, 88 + i * 8, row);
  }
  // silver ammo and lives
  r.sprite(SILVER.frames[0], SILVER_PAL, 138, row);
  write(r, 'display', `${squad.silver}`.padStart(2, '0'), 148, row - 1);
  r.sprite(LIFE, LIFE_PAL, 168, row);
  write(r, 'display', `${Math.max(0, h.lives)}`, 177, row - 1);
  // the midnight clock, or the button for the active kid's ability
  if (h.timer !== null) {
    const m = Math.floor(h.timer / 60);
    const s = Math.floor(h.timer % 60);
    const text = `${11 - m}:${(59 - s).toString().padStart(2, '0')}`;
    // the clock pulses red as midnight closes in (#54)
    const late = h.timer > 60 ? 0 : h.timer > 30 ? 1 : 2;
    const pulse = late === 0 ? false : Math.floor((clock.now() * 1000) / (late === 1 ? 500 : 200)) % 2 === 0;
    const w = write(r, 'display', text, RIGHT, row - 1, { align: 'right', colour: late === 0 ? 'moon' : pulse ? 'danger' : late === 2 ? 'text' : 'moon' });
    r.sprite(CLOCK, CLOCK_PAL, RIGHT - w - 10, row);
  } else prompt(r, h.prompts, 'action', ABILITY_HINT[squad.active], RIGHT, row, { align: 'right' });
  if (h.pagePopup && h.popupT > 0) {
    const inner = panel(r, { x: 20, y: 192, w: SCREEN_W - 40, h: 32 }, 'paper');
    write(r, 'paperHeading', 'MANUAL PAGE FOUND!', SCREEN_W / 2, inner.y - 1, { align: 'center' });
    write(r, 'paperNote', h.pagePopup, SCREEN_W / 2, inner.y + 11, { align: 'center' });
  }
}

const ABILITY_HINT: Record<string, string> = { sling: 'SHOOT', garlic: 'BOMB', big: 'PUNCH', little: 'JUMP' };
