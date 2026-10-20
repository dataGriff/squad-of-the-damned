import { describe, expect, it } from 'vitest';
import { FixedLoop } from '../src/engine/loop';

describe('FixedLoop (#2)', () => {
  it('steps the simulation at exactly 60 Hz regardless of frame time', () => {
    let updates = 0;
    const loop = new FixedLoop({ update: () => updates++, render: () => {} });
    loop.advance(1 / 30); // one 30fps frame → 2 ticks
    expect(updates).toBe(2);
    loop.advance(1 / 144); // ~0.0069s → no tick yet, accumulates
    loop.advance(1 / 144);
    loop.advance(1 / 144); // 3 × 0.00694 = 0.0208 → 1 tick
    expect(updates).toBe(3);
  });
  it('passes an interpolation alpha in [0,1) to render', () => {
    const alphas: number[] = [];
    const loop = new FixedLoop({ update: () => {}, render: (a) => alphas.push(a) });
    loop.advance(1 / 60 + 1 / 120);
    expect(alphas[0]).toBeCloseTo(0.5, 2);
    expect(alphas.every((a) => a >= 0 && a < 1)).toBe(true);
  });
  it('clamps long frames so a backgrounded tab does not spiral', () => {
    let updates = 0;
    const loop = new FixedLoop({ update: () => updates++, render: () => {} });
    loop.advance(10);
    expect(updates).toBe(15); // 0.25s cap
  });
});
