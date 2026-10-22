/**
 * Type system (#60): named text styles over the three faces, so a screen asks
 * for "a heading" or "a hint" rather than picking a face, colour and shadow.
 *
 *   thin   the 5×7 font in an 8px cell, for anything longer than a few words
 *   bold   the heavy 7×7 display face, for headings, banners and HUD numbers
 *   big2/3 the thin font pixel-doubled or tripled with an outline, for logos
 *
 * Every face is monospaced at 8px per character (× scale for big), so widths
 * are exact and wrapping can work in pixels.
 */
import type { Renderer } from '../../engine/render';
import { FONT_W, hasGlyph } from '../../engine/font';
import { displayGlyph } from '../../engine/display-font';
import type { Colour } from './tokens';

export type Face = 'thin' | 'bold' | 'big2' | 'big3';

export interface TextStyle {
  face: Face;
  colour: Colour;
  /** Drop shadow (thin, bold) or the lower half of big text. */
  shadow?: Colour;
  /** Baseline-to-baseline distance for paragraphs. */
  lineHeight: number;
}

export const STYLES = {
  /** The logo line. */
  title: { face: 'big3', colour: 'danger', shadow: 'dangerShade', lineHeight: 26 },
  /** The small logo line above the title. */
  subtitle: { face: 'big2', colour: 'white', shadow: 'lightGrey', lineHeight: 18 },
  /** Screen and panel headings. */
  heading: { face: 'bold', colour: 'accent', shadow: 'black', lineHeight: 11 },
  /** Bad news: MIDNIGHT!, THE SQUAD IS DOWN, boss names. */
  alert: { face: 'bold', colour: 'danger', shadow: 'black', lineHeight: 11 },
  /** Bold white: PRESS START, HUD numbers. */
  display: { face: 'bold', colour: 'text', shadow: 'black', lineHeight: 11 },
  /** Running text. */
  body: { face: 'thin', colour: 'text', lineHeight: 10 },
  /** Secondary text: subtitles, unselected values. */
  bodySoft: { face: 'thin', colour: 'textSoft', lineHeight: 10 },
  /** Instructions and unselected menu items. */
  hint: { face: 'thin', colour: 'textDim', lineHeight: 10 },
  /** Footers. */
  caption: { face: 'thin', colour: 'textFaint', lineHeight: 10 },
  /** Thin text with a drop shadow, for text over scenery. */
  label: { face: 'thin', colour: 'text', shadow: 'black', lineHeight: 10 },
  /** On paper (the manual, the page-found popup). */
  paperHeading: { face: 'bold', colour: 'ink', shadow: 'paperShade', lineHeight: 11 },
  paperAlert: { face: 'bold', colour: 'inkAccent', shadow: 'paperShade', lineHeight: 11 },
  paperBody: { face: 'thin', colour: 'ink', lineHeight: 10 },
  paperNote: { face: 'thin', colour: 'inkSoft', lineHeight: 10 },
  paperAccent: { face: 'thin', colour: 'inkAccent', lineHeight: 10 },
} as const satisfies Record<string, TextStyle>;

export type StyleName = keyof typeof STYLES;
export type Align = 'left' | 'center' | 'right';

export interface WriteOpts {
  /** How `x` is read: the left edge (default), the centre, or the right edge. */
  align?: Align;
  /** Override the style's colour (a selected menu item, a pulsing clock). */
  colour?: Colour;
}

function scaleOf(face: Face): number {
  return face === 'big3' ? 3 : face === 'big2' ? 2 : 1;
}

/** Width in pixels of `text` in a style. */
export function measure(style: StyleName, text: string): number {
  const face = STYLES[style].face;
  const s = scaleOf(face);
  // big text is measured by its ink (the outlined glyphs), not its character cells
  if (face === 'big2' || face === 'big3') return text.length ? ((text.length - 1) * FONT_W + 5) * s + 2 : 0;
  return text.length * FONT_W;
}

/** Height in pixels of one line of a style (its glyph cell). */
export function lineHeightOf(style: StyleName): number {
  return STYLES[style].lineHeight;
}

/** Draw one line of text in a style. Returns its width. */
export function write(r: Renderer, style: StyleName, text: string, x: number, y: number, opts: WriteOpts = {}): number {
  const st: TextStyle = STYLES[style];
  const w = measure(style, text);
  const align = opts.align ?? 'left';
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const colour = opts.colour ?? st.colour;
  if (st.face === 'thin') {
    if (st.shadow) r.textShadow(text, left, y, colour, st.shadow);
    else r.text(text, left, y, colour);
  } else if (st.face === 'bold') r.heading(text, left, y, colour, st.shadow);
  else r.bigText(text, Math.round(left), y, colour, st.shadow ?? colour, scaleOf(st.face));
  return w;
}

/** Word-wrap to lines of at most `cols` characters. Words longer than a line are kept whole. */
export function wrap(text: string, cols: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!line) line = word;
    else if (line.length + 1 + word.length <= cols) line += ' ' + word;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out;
}

/** Word-wrap to a width in pixels for a style. */
export function wrapTo(style: StyleName, text: string, width: number): string[] {
  return wrap(text, Math.max(1, Math.floor(width / (FONT_W * scaleOf(STYLES[style].face)))));
}

/**
 * Draw a wrapped paragraph inside `width` pixels. Returns the height used
 * (lines × line height), so callers can stack paragraphs.
 */
export function paragraph(r: Renderer, style: StyleName, text: string, x: number, y: number, width: number, opts: WriteOpts = {}): number {
  const lines = wrapTo(style, text, width);
  const lh = lineHeightOf(style);
  const ax = opts.align === 'center' ? x + width / 2 : opts.align === 'right' ? x + width : x;
  lines.forEach((l, i) => write(r, style, l, ax, y + i * lh, opts));
  return lines.length * lh;
}

/** Characters in `text` that a style's face cannot draw (bold falls back to thin for symbols). */
export function missingGlyphs(style: StyleName, text: string): string[] {
  const face = STYLES[style].face;
  const missing = new Set<string>();
  for (const ch of text) {
    if (ch === ' ') continue;
    const ok = face === 'bold' ? displayGlyph(ch) !== undefined || hasGlyph(ch) : hasGlyph(ch);
    if (!ok) missing.add(ch);
  }
  return [...missing];
}
