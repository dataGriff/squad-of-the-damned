import { describe, expect, it } from 'vitest';
import { CYCLE_COLOURS, MASTER_PALETTE, cycled, pal, rotated } from '../src/game/palette';
import { Storm } from '../src/game/backdrop';
import { BACKDROPS } from '../src/game/art/backdrops';
import '../src/game/art/tiles';
import '../src/game/objects';

describe('Palette cycling (#54)', () => {
  it('cycled swaps one entry for a master colour and leaves the others alone', () => {
    const base = pal('navy', 'blue', 'skyBlue');
    const a = cycled(base, 3, ['skyBlue', 'white'], 0, 1);
    const b = cycled(base, 3, ['skyBlue', 'white'], 1, 1);
    expect(a[3]).toBe(MASTER_PALETTE.skyBlue);
    expect(b[3]).toBe(MASTER_PALETTE.white);
    expect(b[1]).toBe(base[1]);
    expect(b[2]).toBe(base[2]);
  });
  it('rotated returns to the start after three steps', () => {
    const base = pal('navy', 'purple', 'violet');
    expect(rotated(base, 1)).not.toEqual(base);
    expect(rotated(base, 3)).toEqual(base);
  });
  it('every colour used in a cycle is a master palette colour', () => {
    const lists = [...CYCLE_COLOURS, ...Object.values(BACKDROPS).flatMap((ls) => ls.flatMap((l) => (l.cycle ? [l.cycle.colours] : [])))];
    expect(lists.length).toBeGreaterThan(5);
    for (const list of lists) for (const name of list) expect(MASTER_PALETTE[name as keyof typeof MASTER_PALETTE], name).toBeTruthy();
  });
});

describe('Lightning (#54)', () => {
  const seq = () => {
    let i = 0;
    return () => [0.0, 0.5, 0.5, 0.5, 0.5][i++ % 5];
  };
  it('strikes, strobes white a few frames, then thunders a moment later', () => {
    const s = new Storm(5, 11, seq());
    let struck = -1;
    let thunder = -1;
    const states: string[] = [];
    for (let f = 0; f < 60 * 4; f++) {
      const r = s.update(1 / 60);
      if (r.strike && struck < 0) struck = f;
      if (r.thunder && thunder < 0) thunder = f;
      if (struck >= 0 && f - struck < 40) states.push(s.state(false));
    }
    expect(struck).toBeGreaterThan(0);
    expect(thunder).toBeGreaterThan(struck);
    expect(states.filter((x) => x === 'strike').length).toBeGreaterThanOrEqual(5);
    expect(states).toContain('none'); // it strobes, not a solid flash
  });
  it('reduced flash never strobes: one soft pulse instead', () => {
    const s = new Storm(5, 11, seq());
    const states = new Set<string>();
    for (let f = 0; f < 60 * 4; f++) {
      s.update(1 / 60);
      states.add(s.state(true));
    }
    expect(states.has('strike')).toBe(false);
    expect(states.has('pulse')).toBe(true);
  });
});
