import { describe, expect, it } from 'vitest';
import { Fader, darker, hexRgb } from '../src/engine/fade';
import { MASTER_PALETTE } from '../src/game/palette';

const PAL = Object.values(MASTER_PALETTE).map(hexRgb);
const lum = (c: number[]) => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;

describe('NES palette fade', () => {
  it('each step lands on a darker palette colour', () => {
    for (const c of PAL) {
      if (lum(c) === 0) continue;
      const d = darker(c, PAL);
      expect(lum(d)).toBeLessThan(lum(c));
      expect(PAL.some((p) => p[0] === d[0] && p[1] === d[1] && p[2] === d[2])).toBe(true);
    }
  });
  it('three steps take white to (near) black and black stays black', () => {
    const f = new Fader();
    f.setPalette(Object.values(MASTER_PALETTE));
    expect(lum(hexRgb('#' + f.map(0xfcfcfc, 3).toString(16).padStart(6, '0')))).toBeLessThan(80);
    expect(f.map(0x000000, 3)).toBe(0);
  });
  it('level counts down from full to none over the duration', () => {
    const f = new Fader();
    f.start(0.3);
    expect(f.level).toBe(3);
    f.tick(0.15);
    expect(f.level).toBe(2);
    f.tick(0.2);
    expect(f.level).toBe(0);
  });
  it('apply rewrites RGBA pixels in place and leaves alpha alone', () => {
    const f = new Fader();
    f.setPalette(Object.values(MASTER_PALETTE));
    const px = new Uint8ClampedArray([252, 252, 252, 255]);
    f.apply(px, 1);
    expect(px[0]).toBeLessThan(252);
    expect(px[3]).toBe(255);
  });
});
