import { describe, expect, it } from 'vitest';
import { BossMachine, type BossPhase } from '../src/game/bosses/machine';

interface Ctx { log: string[] }

function phases(): BossPhase<Ctx>[] {
  return [
    {
      name: 'one',
      until: 0.5,
      initial: 'idle',
      states: {
        idle: { update: (_c, m) => (m.stateTime > 1 ? 'attack' : undefined) },
        attack: { telegraph: 0.5, update: (c, m) => { if (!m.telegraphing) { c.log.push('hit'); return 'recover'; } } },
        recover: { vulnerable: true, update: (_c, m) => (m.stateTime > 0.5 ? 'idle' : undefined) },
      },
    },
    { name: 'two', until: 0, initial: 'rage', onEnter: (c) => c.log.push('phase2'), states: { rage: { update: () => undefined } } },
  ];
}

describe('Boss state machine (#22)', () => {
  it('runs telegraph before the attack lands and opens a vulnerability window', () => {
    const ctx: Ctx = { log: [] };
    const m = new BossMachine(phases(), 10, ctx);
    for (let i = 0; i < 61; i++) m.update(1 / 60);
    expect(m.state).toBe('attack');
    expect(m.telegraphing).toBe(true);
    expect(m.vulnerable).toBe(false);
    for (let i = 0; i < 31; i++) m.update(1 / 60);
    expect(ctx.log).toContain('hit');
    expect(m.state).toBe('recover');
    expect(m.vulnerable).toBe(true);
  });
  it('switches phase on HP thresholds', () => {
    const ctx: Ctx = { log: [] };
    const m = new BossMachine(phases(), 10, ctx);
    expect(m.damage(4)).toBe(false);
    expect(m.phase.name).toBe('one');
    expect(m.damage(2)).toBe(true);
    expect(m.phase.name).toBe('two');
    expect(ctx.log).toContain('phase2');
    expect(m.state).toBe('rage');
  });
  it('pauses while stunned and reports death at zero HP', () => {
    const m = new BossMachine(phases(), 10, { log: [] });
    m.stun(1);
    for (let i = 0; i < 30; i++) m.update(1 / 60);
    expect(m.stateTime).toBe(0);
    m.damage(10);
    expect(m.dead).toBe(true);
  });
  it('forced vulnerability overrides state', () => {
    const m = new BossMachine(phases(), 10, { log: [] });
    m.forcedVulnerable = true;
    expect(m.vulnerable).toBe(true);
  });
});
