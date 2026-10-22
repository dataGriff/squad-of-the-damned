import { describe, expect, it } from 'vitest';
import { GRID, SAFE, centred, centreX, contains, inset, rows, snap, splitTop } from '../src/game/design/layout';

describe('layout (#61)', () => {
  it('the safe area is the screen inset by one grid unit', () => {
    expect(SAFE).toEqual({ x: 8, y: 8, w: 240, h: 224 });
    expect(GRID).toBe(8);
  });
  it('helpers place and test rects', () => {
    expect(snap(13)).toBe(16);
    expect(inset({ x: 0, y: 0, w: 100, h: 50 }, 8)).toEqual({ x: 8, y: 8, w: 84, h: 34 });
    expect(centreX(56)).toBe(100);
    expect(centred(40, 20, { x: 0, y: 0, w: 100, h: 100 })).toEqual({ x: 30, y: 40, w: 40, h: 20 });
    expect(rows(10, 3, 12)).toEqual([10, 22, 34]);
    expect(contains(SAFE, { x: 8, y: 8, w: 240, h: 224 })).toBe(true);
    expect(contains(SAFE, { x: 4, y: 100, w: 10, h: 8 })).toBe(false);
    expect(splitTop({ x: 0, y: 0, w: 10, h: 100 }, 20, 4)).toEqual([
      { x: 0, y: 0, w: 10, h: 20 },
      { x: 0, y: 24, w: 10, h: 76 },
    ]);
  });
});
