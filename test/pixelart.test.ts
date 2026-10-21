import { describe, expect, it } from 'vitest';
import { PixelArt, hash2, rng } from '../src/engine/pixelart';
import { spriteColourCount } from '../src/engine/sprites';

describe('PixelArt helper', () => {
  it('draws only palette indices 0..3 and round-trips to a sprite', () => {
    const p = new PixelArt(16, 16).rect(0, 0, 16, 16, 1).circle(8, 8, 5, 2).checker(0, 0, 4, 4, 3);
    const s = p.toSprite('t');
    expect(s.w).toBe(16);
    expect(spriteColourCount(s)).toBeLessThanOrEqual(4);
    expect(Math.max(...s.px)).toBeLessThanOrEqual(3);
  });
  it('gradientV moves from colour a to colour b with an ordered dither', () => {
    const p = new PixelArt(8, 16).gradientV(0, 0, 8, 16, 1, 2);
    const row = (y: number) => [...p.px.subarray(y * 8, y * 8 + 8)];
    expect(row(0).every((v) => v === 1)).toBe(true);
    expect(row(15).every((v) => v === 2)).toBe(true);
    expect(row(8).some((v) => v === 1) && row(8).some((v) => v === 2)).toBe(true);
  });
  it('setWrap wraps horizontally so strips tile seamlessly', () => {
    const p = new PixelArt(8, 1).setWrap(-1, 0, 2).setWrap(9, 0, 3);
    expect(p.get(7, 0)).toBe(2);
    expect(p.get(1, 0)).toBe(3);
  });
  it('outline surrounds opaque pixels', () => {
    const p = new PixelArt(3, 3).set(1, 1, 2).outline(1);
    expect(p.get(1, 0)).toBe(1);
    expect(p.get(0, 0)).toBe(0);
  });
  it('rng and hash2 are deterministic', () => {
    expect(rng(5)()).toBe(rng(5)());
    expect(hash2(3, 4)).toBe(hash2(3, 4));
    expect(hash2(3, 4)).not.toBe(hash2(4, 3));
  });
});
