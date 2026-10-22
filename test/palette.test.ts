import { describe, expect, it } from 'vitest';
import { allSprites } from '../src/game/art';
import { checkPalette, checkSprites } from '../src/game/paletteCheck';
import { registeredPalettes } from '../src/game/art/registry';
import { KID_SHEETS } from '../src/game/art/kids';

describe('4-colour palette constraint (#37, #38, #39, #40)', () => {
  it('every sprite uses at most 4 colours with unique names', () => {
    expect(checkSprites(allSprites())).toEqual([]);
  });
  it('every palette in the art registry comes from the master palette', () => {
    for (const { pal, entries } of registeredPalettes()) expect(checkPalette(pal, entries[0].id)).toEqual([]);
  });
  it('each kid has idle / run / jump / hurt / ability animations', () => {
    for (const sheet of Object.values(KID_SHEETS)) for (const a of ['idle', 'run', 'jump', 'hurt', 'ability', 'crouch']) expect(sheet.anims[a]).toBeTruthy();
  });
});
