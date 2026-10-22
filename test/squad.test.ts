import { describe, expect, it } from 'vitest';
import { KIDS, KID_ORDER, MAX_HP, Squad } from '../src/game/squad';

describe('Squad roster (#13, #14)', () => {
  it('has four kids with one ability each and distinct abilities', () => {
    expect(KID_ORDER.length).toBe(4);
    const abilities = new Set(KID_ORDER.map((k) => KIDS[k].ability));
    expect(abilities.size).toBe(4);
  });
  it('shares one HP pool across swaps', () => {
    const s = new Squad();
    s.damage(2);
    s.swap();
    expect(s.hp).toBe(MAX_HP - 2);
  });
  it('swaps in roster order with a freeze-frame and blocks swapping during it', () => {
    const s = new Squad();
    expect(s.active).toBe('sling');
    expect(s.swap()).toBe(true);
    expect(s.active).toBe('garlic');
    expect(s.swapFreeze).toBeGreaterThan(0);
    expect(s.swap()).toBe(false);
    for (let i = 0; i < 10; i++) s.tick();
    expect(s.swap()).toBe(true);
    expect(s.active).toBe('big');
  });
  it('only cycles through unlocked kids', () => {
    const s = new Squad(['sling', 'little']);
    s.swap();
    expect(s.active).toBe('little');
    for (let i = 0; i < 10; i++) s.tick();
    s.swap();
    expect(s.active).toBe('sling');
  });
  it('reports death when HP reaches zero', () => {
    const s = new Squad();
    expect(s.damage(MAX_HP)).toBe(true);
  });
});

describe('Swap fit rule (#14)', () => {
  it('swapTo moves directly to any unlocked kid', () => {
    const s = new Squad();
    expect(s.swapTo('little')).toBe(true);
    expect(s.active).toBe('little');
    expect(s.swapTo('little')).toBe(false);
  });
});
