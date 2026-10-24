import { describe, expect, it } from 'vitest';
import { STYLES, measure, missingGlyphs, wrap, wrapTo, type StyleName } from '../src/game/design/type';
import { CHAPTERS } from '../src/game/story';
import { MANUAL_PAGES } from '../src/game/manual';
import { NIGHTS } from '../src/game/levels/nights';
import { KIDS } from '../src/game/squad';

describe('type system (#60)', () => {
  it('measures every face at its cell width', () => {
    expect(measure('body', 'ABC')).toBe(24);
    expect(measure('heading', 'ABC')).toBe(24);
    // big faces are measured by ink: two full cells plus a 5px glyph, plus the outline
    expect(measure('subtitle', 'ABC')).toBe((2 * 8 + 5) * 2 + 2);
    expect(measure('title', 'ABC')).toBe((2 * 8 + 5) * 3 + 2);
  });

  it('wraps by words and by pixel width', () => {
    expect(wrap('THE QUICK BROWN FOX', 9)).toEqual(['THE QUICK', 'BROWN FOX']);
    expect(wrapTo('body', 'THE QUICK BROWN FOX', 72)).toEqual(['THE QUICK', 'BROWN FOX']);
    expect(wrap('', 10)).toEqual([]);
  });

  it('every style uses a face it can draw and a token or palette colour', () => {
    for (const [name, s] of Object.entries(STYLES)) {
      expect(['thin', 'bold', 'big2', 'big3'], name).toContain(s.face);
      expect(s.lineHeight, name).toBeGreaterThanOrEqual(8);
    }
  });

  it('flags characters a face cannot draw', () => {
    expect(missingGlyphs('body', 'HELLO')).toEqual([]);
    expect(missingGlyphs('body', 'HELLO~')).toEqual(['~']);
    // bold falls back to the thin face for symbols
    expect(missingGlyphs('heading', 'A ► B')).toEqual([]);
  });

  it('all game text can be drawn in the style it is shown in', () => {
    const uses: [StyleName, string][] = [
      ...Object.values(CHAPTERS).flatMap((c) => c.panels.map((p) => ['body', p.text] as [StyleName, string])),
      ...MANUAL_PAGES.flatMap((p) => [
        ['paperHeading', p.creature],
        ['paperBody', p.lore.join(' ')],
        ['paperBody', `${p.weaknessText} ${p.hint}`],
      ] as [StyleName, string][]),
      ...NIGHTS.flatMap((n) => [
        ['heading', n.title],
        ['body', n.short],
      ] as [StyleName, string][]),
      ...Object.values(KIDS).flatMap((k) => [
        ['heading', k.name],
        ['bodySoft', k.blurb],
      ] as [StyleName, string][]),
    ];
    const bad = uses.flatMap(([style, text]) => missingGlyphs(style, text).map((ch) => `'${ch}' in ${style}: ${text}`));
    expect(bad).toEqual([]);
  });
});
