import { describe, expect, it } from 'vitest';
import { InputState, DEFAULT_BINDINGS, type Action } from '../src/engine/input';
import { Menu } from '../src/game/ui/menu';
import { Dialog } from '../src/game/ui/dialog';
import { keyName, promptWidth } from '../src/game/ui/prompt';
import { SAFE, contains } from '../src/game/design/layout';

describe('UI kit (#62)', () => {
  it('menu navigation wraps and skips disabled items', () => {
    const input = new InputState();
    const src = input.addSource();
    const picked: number[] = [];
    const m = new Menu([{ label: 'A', disabled: true }, 'B', { label: 'C', disabled: true }, 'D'], (i) => picked.push(i));
    expect(m.index).toBe(1);
    const step = (a: Action) => {
      src.add(a);
      input.tick();
      m.update(input);
      src.delete(a);
      input.tick();
      m.update(input);
    };
    step('down');
    expect(m.index).toBe(3);
    step('down');
    expect(m.index).toBe(1);
    step('up');
    expect(m.index).toBe(3);
    step('jump');
    expect(picked).toEqual([3]);
  });

  it('a disabled item cannot be picked and left/right adjust values', () => {
    const input = new InputState();
    const src = input.addSource();
    const picked: number[] = [];
    const adjusted: [number, number][] = [];
    const m = new Menu([{ label: 'ONLY', disabled: true }], (i) => picked.push(i));
    m.onAdjust = (i, dx) => adjusted.push([i, dx]);
    src.add('jump');
    input.tick();
    m.update(input);
    src.clear();
    src.add('right');
    input.tick();
    m.update(input);
    expect(picked).toEqual([]);
    expect(adjusted).toEqual([[0, 1]]);
  });

  it('dialogs size to their text and stay inside the safe area', () => {
    for (const msg of ['OK?', 'ERASE SAVE AND START OVER?', 'A MUCH LONGER QUESTION THAT HAS TO WRAP ONTO SEVERAL LINES BEFORE IT FITS IN THE BOX']) {
      const l = new Dialog(msg, ['NO', 'YES'], () => {}).layout();
      expect(contains(SAFE, l.panel), msg).toBe(true);
      expect(l.menuY).toBeGreaterThan(l.textY + (l.lines.length - 1) * 10);
      expect(l.menuY + 20).toBeLessThanOrEqual(l.panel.y + l.panel.h);
      for (const line of l.lines) expect(line.length * 8, line).toBeLessThanOrEqual(l.panel.w - 16);
    }
  });

  it('prompts follow the device', () => {
    const kb = { device: 'keyboard' as const, bindings: DEFAULT_BINDINGS };
    const pad = { device: 'gamepad' as const, bindings: DEFAULT_BINDINGS };
    expect(keyName('KeyX')).toBe('X');
    expect(keyName('ArrowLeft')).toBe('◄');
    expect(keyName('Enter')).toBe('ENTER');
    // keyboard: a cap around the bound key; pad: the 7px B button
    expect(promptWidth(kb, 'action', '')).toBe(8 + 3);
    expect(promptWidth(pad, 'action', '')).toBe(7);
    expect(promptWidth(pad, 'action', 'SHOOT')).toBe(7 + 4 + 40);
    expect(promptWidth(kb, 'pause', '')).toBe(5 * 8 + 3);
  });
});
