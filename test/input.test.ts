import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS, InputState, rebindKey } from '../src/engine/input';

describe('Input abstraction (#6)', () => {
  it('merges sources and reports pressed/released edges', () => {
    const s = new InputState();
    const kb = s.addSource();
    const pad = s.addSource();
    kb.add('jump');
    s.tick();
    expect(s.pressed('jump')).toBe(true);
    s.tick();
    expect(s.pressed('jump')).toBe(false);
    expect(s.isDown('jump')).toBe(true);
    kb.delete('jump');
    pad.add('jump');
    s.tick();
    expect(s.isDown('jump')).toBe(true);
    pad.delete('jump');
    s.tick();
    expect(s.released('jump')).toBe(true);
  });
  it('only real sources count as activity (the demo autopilot does not)', () => {
    const s = new InputState();
    const demo = s.addSource();
    demo.add('right');
    s.tick();
    expect(s.hadActivity).toBe(false);
    s.pulse('jump');
    s.tick();
    expect(s.hadActivity).toBe(true);
    s.tick();
    expect(s.hadActivity).toBe(false);
  });
  it('a tap between ticks still registers for one tick', () => {
    const s = new InputState();
    s.addSource();
    s.pulse('menu');
    s.tick();
    expect(s.pressed('menu')).toBe(true);
    s.tick();
    expect(s.isDown('menu')).toBe(false);
  });
  it('rebinding replaces the keys for one action only', () => {
    const b = rebindKey(DEFAULT_BINDINGS, 'jump', 'KeyJ');
    expect(b.keys.jump).toEqual(['KeyJ']);
    expect(b.keys.left).toEqual(DEFAULT_BINDINGS.keys.left);
  });
});
