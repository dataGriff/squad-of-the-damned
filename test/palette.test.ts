import { describe, expect, it } from 'vitest';
import { allSprites } from '../src/game/art';
import { checkPalette, checkSprites } from '../src/game/paletteCheck';
import { KIDS } from '../src/game/squad';
import { BOSS_PALETTES } from '../src/game/art/monsters';
import { THEMES } from '../src/game/art/tiles';
import { KID_SHEETS } from '../src/game/art/kids';

describe('4-colour palette constraint (#37, #38, #39, #40)', () => {
  it('every sprite uses at most 4 colours with unique names', () => {
    expect(checkSprites(allSprites())).toEqual([]);
  });
  it('all sprite palettes come from the master palette', () => {
    for (const k of Object.values(KIDS)) expect(checkPalette(k.palette)).toEqual([]);
    for (const p of Object.values(BOSS_PALETTES)) expect(checkPalette(p)).toEqual([]);
    for (const t of Object.values(THEMES)) {
      expect(checkPalette(t.tiles)).toEqual([]);
      expect(checkPalette(t.deco)).toEqual([]);
    }
  });
  it('each kid has idle / run / jump / hurt / ability animations', () => {
    for (const sheet of Object.values(KID_SHEETS)) for (const a of ['idle', 'run', 'jump', 'hurt', 'ability', 'crouch']) expect(sheet.anims[a]).toBeTruthy();
  });
});
