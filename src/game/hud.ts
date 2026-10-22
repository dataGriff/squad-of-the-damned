/**
 * HUD (#45, framed for #58): a bevelled panel with squad portraits (gold
 * frame for the active kid), heart icons for the shared HP, silver, and the
 * midnight clock or the B-button ability hint.
 */
import type { Renderer } from '../engine/render';
import { SCREEN_W } from '../engine/constants';
import { KID_PORTRAITS } from './art/kids';
import { KIDS, KID_ORDER, type Squad } from './squad';
import { SILVER, SILVER_PAL } from './art/items';
import { BUTTON_B, BUTTON_PAL, CLOCK, CLOCK_PAL, HEART_EMPTY, HEART_EMPTY_PAL, HEART_FULL, HEART_PAL } from './art/icons';

const LOCKED: readonly [null, string, string, string] = [null, '#3c3c3c', '#3c3c3c', '#3c3c3c'];
const INACTIVE: readonly [null, string, string, string] = [null, '#3c3c3c', '#7c7c7c', '#bcbcbc'];

/** A one-pixel bevel: light on the top-left, dark on the bottom-right. */
function bevel(r: Renderer, x: number, y: number, w: number, h: number, light: string, dark: string): void {
  r.rect(x, y, w, 1, light);
  r.rect(x, y, 1, h, light);
  r.rect(x, y + h - 1, w, 1, dark);
  r.rect(x + w - 1, y, 1, h, dark);
}

export function drawHud(r: Renderer, squad: Squad, timer: number | null, pagePopup: string | null, popupT: number): void {
  // panel
  r.rect(0, 0, SCREEN_W, 17, '#000000');
  r.rect(0, 16, SCREEN_W, 1, '#3c3c3c');
  // portraits in bevelled frames
  KID_ORDER.forEach((id, i) => {
    const x = 2 + i * 19;
    const active = squad.active === id;
    const unlocked = squad.unlocked.includes(id);
    r.rect(x, 1, 18, 15, '#000000');
    if (active) bevel(r, x, 1, 18, 15, '#f8d878', '#ac7c00');
    else bevel(r, x, 1, 18, 15, '#7c7c7c', '#3c3c3c');
    const s = KID_PORTRAITS[id];
    r.ctx.save();
    r.ctx.beginPath();
    r.ctx.rect(x + 1, 2, 16, 13);
    r.ctx.clip();
    r.sprite(s, !unlocked ? LOCKED : active ? KIDS[id].palette : INACTIVE, x + 9 - Math.floor(s.w / 2), 3);
    r.ctx.restore();
  });
  // shared hearts
  for (let i = 0; i < squad.maxHp; i++) {
    const full = i < squad.hp;
    r.sprite(full ? HEART_FULL : HEART_EMPTY, full ? HEART_PAL : HEART_EMPTY_PAL, 82 + i * 8, 5);
  }
  // silver ammo
  r.sprite(SILVER.frames[0], SILVER_PAL, 134, 5);
  r.heading(`${squad.silver}`.padStart(2, '0'), 146, 4, '#fcfcfc');
  // the midnight clock, or the B-button hint for the active kid
  if (timer !== null) {
    const m = Math.floor(timer / 60);
    const s = Math.floor(timer % 60);
    const text = `${11 - m}:${(59 - s).toString().padStart(2, '0')}`;
    // the clock pulses red as midnight closes in (#54)
    const late = timer > 60 ? 0 : timer > 30 ? 1 : 2;
    const pulse = late === 0 ? false : Math.floor(performance.now() / (late === 1 ? 500 : 200)) % 2 === 0;
    const x = SCREEN_W - 8 * text.length - 4;
    r.sprite(CLOCK, CLOCK_PAL, x - 10, 5);
    r.heading(text, x, 4, late === 0 ? '#f8f8b8' : pulse ? '#e40058' : late === 2 ? '#fcfcfc' : '#f8f8b8');
  } else {
    const label = ABILITY_HINT[squad.active];
    const x = SCREEN_W - 8 * label.length - 4;
    r.sprite(BUTTON_B, BUTTON_PAL, x - 10, 5);
    r.text(label, x, 5, '#bcbcbc');
  }
  if (pagePopup && popupT > 0) {
    r.box(20, 198, SCREEN_W - 40, 30, '#f8d8c8', '#fcfcfc', '#503000');
    r.headingCentered('MANUAL PAGE FOUND!', 203, '#2c1600');
    r.textCentered(pagePopup, 215, '#503000');
  }
}

const ABILITY_HINT: Record<string, string> = { sling: 'SHOOT', garlic: 'BOMB', big: 'PUNCH', little: 'JUMP' };
