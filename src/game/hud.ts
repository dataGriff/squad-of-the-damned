/** HUD (#45): squad portraits with the active kid highlighted, shared hearts, silver, night clock. */
import type { Renderer } from '../engine/render';
import { SCREEN_W } from '../engine/constants';
import { KID_PORTRAITS } from './art/kids';
import { KIDS, KID_ORDER, type Squad } from './squad';
import { SILVER, SILVER_PAL } from './art/items';

export function drawHud(r: Renderer, squad: Squad, timer: number | null, pagePopup: string | null, popupT: number): void {
  // top bar
  r.rect(0, 0, SCREEN_W, 16, '#000000');
  // portraits
  let x = 2;
  for (const id of KID_ORDER) {
    const unlocked = squad.unlocked.includes(id);
    const active = squad.active === id;
    if (active) r.rect(x - 1, 1, 18, 14, '#f8d878');
    else r.rect(x - 1, 1, 18, 14, '#3c3c3c');
    r.rect(x, 2, 16, 12, '#000000');
    if (unlocked) {
      const s = KID_PORTRAITS[id];
      const pal = active ? KIDS[id].palette : ([null, '#7c7c7c', '#7c7c7c', '#bcbcbc'] as const);
      r.ctx.save();
      r.ctx.beginPath();
      r.ctx.rect(x, 2, 16, 12);
      r.ctx.clip();
      r.sprite(s, pal, x + 8 - s.w / 2, 4);
      r.ctx.restore();
    }
    x += 20;
  }
  // hearts
  let hx = 86;
  for (let i = 0; i < squad.maxHp; i++) {
    r.text(i < squad.hp ? '♥' : '♡', hx, 4, i < squad.hp ? '#e40058' : '#7c7c7c');
    hx += 8;
  }
  // silver ammo
  r.sprite(SILVER.frames[0], SILVER_PAL, 142, 4);
  r.text(`${squad.silver}`.padStart(2, '0'), 154, 4, '#fcfcfc');
  // timer / clock
  if (timer !== null) {
    const m = Math.floor(timer / 60);
    const s = Math.floor(timer % 60);
    const text = `${11 - m}:${(59 - s).toString().padStart(2, '0')}`;
    r.text(text, SCREEN_W - 8 * text.length - 4, 4, timer < 15 ? '#e40058' : '#f8f8b8');
  } else {
    r.text('B:' + ABILITY_HINT[squad.active], SCREEN_W - 8 * (2 + ABILITY_HINT[squad.active].length) - 2, 4, '#7c7c7c');
  }
  if (pagePopup && popupT > 0) {
    r.rect(24, 200, SCREEN_W - 48, 26, '#000000');
    r.rect(25, 201, SCREEN_W - 50, 24, '#f8d8c8');
    r.textCentered('MANUAL PAGE FOUND!', 204, '#2c1600');
    r.textCentered(pagePopup, 214, '#503000');
  }
}

const ABILITY_HINT: Record<string, string> = { sling: 'SHOOT', garlic: 'BOMB', big: 'PUNCH', little: 'JUMP' };
