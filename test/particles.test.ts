import { describe, expect, it } from 'vitest';
import { Particles, PARTICLE_FRAMES } from '../src/engine/particles';

describe('Sprite particles (#58)', () => {
  it('dust, bursts and sparkles become puffs, chips and sparks', () => {
    const p = new Particles();
    p.dust(0, 0);
    p.burst(0, 0, '#fcfcfc', 4);
    p.sparkle(0, 0);
    const kinds = new Set(p.list.map((x) => x.kind));
    expect(kinds).toEqual(new Set(['puff', 'chip', 'spark']));
    for (const x of p.list) expect(p.frameOf(x)).toBeTruthy();
  });
  it('puffs grow and fade through their frames over their life', () => {
    const p = new Particles();
    p.emit({ x: 0, y: 0, vx: 0, vy: 0, life: 1, colour: '#fcfcfc', size: 1, gravity: 0, kind: 'puff' });
    const q = p.list[0];
    expect(p.frameOf(q)).toBe(PARTICLE_FRAMES.puff[0]);
    p.update(0.9);
    expect(p.frameOf(q)).toBe(PARTICLE_FRAMES.puff[2]);
  });
  it('plain particles still draw as squares', () => {
    const p = new Particles();
    p.emit({ x: 0, y: 0, vx: 0, vy: 0, life: 1, colour: '#fcfcfc', size: 1, gravity: 0 });
    expect(p.frameOf(p.list[0])).toBeNull();
  });
});
