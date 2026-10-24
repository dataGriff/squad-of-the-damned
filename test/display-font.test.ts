import { describe, expect, it } from 'vitest';
import { DISPLAY_CHARS, displayGlyph } from '../src/engine/display-font';

describe('Display font (#58)', () => {
  it('covers A-Z, 0-9 and common punctuation in a 7x7 cell', () => {
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?:-/') {
      const g = displayGlyph(ch);
      expect(g, ch).toBeTruthy();
      expect(g!.length).toBe(7);
      for (const row of g!) expect(row.length).toBe(7);
    }
  });
  it('every letter has heavy 2-pixel strokes somewhere (it is the bold face)', () => {
    for (const ch of DISPLAY_CHARS.filter((c) => /[A-Z]/.test(c))) expect(displayGlyph(ch)!.some((r) => r.includes('##')), ch).toBe(true);
  });
  it('glyphs are distinct', () => {
    const seen = new Map<string, string>();
    for (const ch of DISPLAY_CHARS) {
      const key = displayGlyph(ch)!.join('');
      expect(seen.get(key), `${ch} duplicates ${seen.get(key)}`).toBeUndefined();
      seen.set(key, ch);
    }
  });
});
