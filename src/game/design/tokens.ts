/**
 * Colour tokens (#59): the roles colours play in the interface, each mapped
 * to a master palette entry. UI code asks for a role ("dim text", "dialog
 * fill") instead of a colour, so the look can change in one place.
 *
 * Every drawing call takes a `Colour`: a token, or a master palette name for
 * art (particles, story panels). Both resolve to one of the 2C02 colours in
 * MASTER_PALETTE; anything else is an error.
 */
import { MASTER_PALETTE, type PaletteName } from '../palette';

export const TOKENS = {
  /** Body text and the brightest UI line work. */
  text: 'white',
  /** Secondary text: hints, subtitles, unselected values. */
  textSoft: 'lightGrey',
  /** Unselected menu items, disabled text. */
  textDim: 'grey',
  /** Footers and the faintest UI text. */
  textFaint: 'darkGrey',
  /** Headings, the selected value, things to look at. */
  accent: 'yellow',
  /** The darker partner of accent, for bevels under gold. */
  accentShade: 'rust',
  /** Warnings, boss names, MIDNIGHT. */
  danger: 'red',
  dangerShade: 'crimson',
  /** Something good happened (stuns, silver). */
  good: 'mint',
  /** Screen background behind full-screen text. */
  screen: 'black',
  /** Default panel fill and outlines. */
  panel: 'black',
  /** Dialog fill: options, pause, confirm. */
  dialog: 'navy',
  /** Panel border: the lit edge. */
  border: 'white',
  /** Panel bevel: the shaded edge. */
  shade: 'grey',
  /** Dividers and the deepest shade. */
  edge: 'darkGrey',
  /** The manual and page-found popup: paper, its shading, and ink. */
  paper: 'cream',
  paperShade: 'sand',
  ink: 'darkBrown',
  inkSoft: 'brown',
  inkAccent: 'crimson',
} as const satisfies Record<string, PaletteName>;

export type Token = keyof typeof TOKENS;
/** One of the hex values in MASTER_PALETTE (what sprite palettes hold). */
export type MasterHex = (typeof MASTER_PALETTE)[PaletteName];
export type Colour = Token | PaletteName | MasterHex;

const MASTER_HEX = new Set<string>(Object.values(MASTER_PALETTE));

/** The hex value of a token, master palette name or master hex. Throws on anything else. */
export function hex(c: Colour): MasterHex {
  if (c in TOKENS) return MASTER_PALETTE[TOKENS[c as Token]];
  if (c in MASTER_PALETTE) return MASTER_PALETTE[c as PaletteName];
  if (MASTER_HEX.has(c)) return c as MasterHex;
  throw new Error(`Unknown colour '${c}': use a token from design/tokens.ts or a master palette name`);
}

/** True for a hex string that is a master palette entry. */
export function isMasterHex(h: string): boolean {
  return MASTER_HEX.has(h);
}

/** A 4-colour sprite palette of one colour (silhouettes, flashes, locked portraits). */
export function solid(c: Colour): readonly [null, string, string, string] {
  const h = hex(c);
  return [null, h, h, h];
}
