import { describe, expect, it } from 'vitest';
import { MANUAL_PAGES, pagesFound, weaknessMultiplier } from '../src/game/manual';

describe('Monster manual (#34, #36)', () => {
  it('has a page for every boss with a weakness and lore', () => {
    for (const id of ['vampire', 'giant', 'wolfman', 'mummy', 'gill']) {
      const p = MANUAL_PAGES.find((x) => x.id === id)!;
      expect(p.boss).toBe(true);
      expect(p.lore.length).toBeGreaterThan(0);
      expect(p.weakness).not.toBe('none');
    }
  });
  it('weakness does nothing until the page is found', () => {
    expect(weaknessMultiplier('wolfman', 'silver', () => false)).toBe(0);
    expect(weaknessMultiplier('wolfman', 'silver', () => true)).toBe(1);
  });
  it('non-weakness attacks never damage a boss', () => {
    expect(weaknessMultiplier('wolfman', 'garlic', () => true)).toBe(0);
  });
  it('counts pages found', () => {
    expect(pagesFound(['bat', 'nope'])).toEqual({ found: 1, total: MANUAL_PAGES.length });
  });
});

import { wrap } from '../src/game/scenes/ui';

describe('Manual page text layout (#35)', () => {
  it('word-wraps every page to the 13-character column without splitting words', () => {
    for (const p of MANUAL_PAGES) {
      const text = `${p.lore.join(' ')} ${p.weaknessText} ${p.hint}`;
      const lines = wrap(text, 13);
      for (const l of lines) expect(l.length <= 13 || !l.includes(' ')).toBe(true);
      expect(lines.join(' ')).toBe(text.split(/\s+/).join(' '));
      // the page has room for lore + weakness + hint
      expect(wrap(p.lore.join(' '), 13).length + wrap(`${p.weaknessText} ${p.hint}`, 13).length).toBeLessThanOrEqual(16);
    }
  });
});
