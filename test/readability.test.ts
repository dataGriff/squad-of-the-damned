import { describe, expect, it } from 'vitest';
import { BACKDROP_MAX, READABLE_SHARE, dominantColours, lumContrast, readableResults, sceneryResults, spriteResults, textResults, appearances } from '../src/game/design/readability';
import { MASTER_PALETTE } from '../src/game/palette';

describe('readability (#64)', () => {
  it('contrast is the WCAG ratio', () => {
    expect(lumContrast(MASTER_PALETTE.black, MASTER_PALETTE.black)).toBeCloseTo(1);
    expect(lumContrast(MASTER_PALETTE.white, MASTER_PALETTE.black)).toBeGreaterThan(19);
  });

  it('every text style clears its minimum on every surface it is used on', () => {
    expect(textResults().filter((t) => t.ratio < t.min)).toEqual([]);
  });

  it('finds the dominant colours of a night', () => {
    const mansion = dominantColours('mansion');
    expect(mansion.length).toBeGreaterThan(1);
    expect(mansion.reduce((a, c) => a + c.share, 0)).toBeLessThanOrEqual(1);
  });

  it('knows where gameplay art appears', () => {
    const where = appearances();
    expect([...where.get('boss:vampire')!]).toEqual(['mansion']);
    expect(where.get('kid:sling')!.size).toBe(5);
    expect(where.get('enemy:hand')!.has('graveyard')).toBe(true);
  });

  it('gameplay sprites stand out and backdrops stay quieter', () => {
    const sprites = spriteResults();
    expect(readableResults(sprites).filter((r) => r.readable < READABLE_SHARE)).toEqual([]);
    expect(sceneryResults(sprites).filter((s) => s.backdrop >= BACKDROP_MAX)).toEqual([]);
  });
});
