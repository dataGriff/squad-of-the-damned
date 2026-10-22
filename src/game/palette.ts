/**
 * NES-style master palette (#37).
 * Every sprite palette is at most 4 entries: index 0 is transparent, 1–3 are colours
 * chosen from this master list. `paletteCheck` (scripts/palette-check.ts) enforces it.
 */
export const MASTER_PALETTE = {
  black: '#000000',
  white: '#fcfcfc',
  grey: '#7c7c7c',
  lightGrey: '#bcbcbc',
  darkGrey: '#3c3c3c',
  navy: '#0000a8',
  blue: '#0058f8',
  skyBlue: '#3cbcfc',
  iceBlue: '#a4e4fc',
  purple: '#6844fc',
  violet: '#9878f8',
  magenta: '#d800cc',
  pink: '#f878f8',
  red: '#e40058',
  brightRed: '#f83800',
  orange: '#e45c10',
  tan: '#f8b800',
  yellow: '#f8d878',
  cream: '#f8d8c8',
  brown: '#503000',
  darkBrown: '#2c1600',
  olive: '#007800',
  green: '#00b800',
  lime: '#b8f818',
  teal: '#008888',
  cyan: '#00e8d8',
  mint: '#b8f8d8',
  bogGreen: '#005800',
  drainBlue: '#004058',
  moon: '#f8f8b8',
  // added for the art pass: all are entries of the 2C02 NES palette
  indigo: '#4428bc',
  plum: '#940084',
  maroon: '#a81000',
  darkRed: '#881400',
  rust: '#ac7c00',
  sand: '#fce0a8',
  lavender: '#d8b8f8',
  midGreen: '#00a800',
  darkGreen: '#006800',
  periwinkle: '#6888fc',
  mist: '#b8b8f8',
  amber: '#fca044',
  crimson: '#a80020',
} as const satisfies Record<string, string>;

export type PaletteName = keyof typeof MASTER_PALETTE;

/** A 4-colour sprite palette: index 0 is always transparent. */
export type SpritePalette = readonly [null, string, string, string];

export function pal(a: PaletteName, b: PaletteName, c: PaletteName): SpritePalette {
  for (const k of [a, b, c]) {
    if (!(k in MASTER_PALETTE)) throw new Error(`Unknown master palette colour: ${k}`);
  }
  return [null, MASTER_PALETTE[a], MASTER_PALETTE[b], MASTER_PALETTE[c]];
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative luminance (sRGB → linear), used by the colour-blind check. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Palette cycling (#54): the NES trick of animating by changing a palette
 * entry rather than the pixels. Returns `base` with index `i` replaced by the
 * colour from `names` for time t.
 */
export function cycled(base: SpritePalette, i: 1 | 2 | 3, names: readonly PaletteName[], t: number, fps: number): SpritePalette {
  const name = names[Math.floor(t * fps) % names.length];
  const out = [...base] as [null, string, string, string];
  out[i] = MASTER_PALETTE[name];
  return out;
}

/** Rotate entries 1..3 by `steps` (a swirl when stepped over time). */
export function rotated(base: SpritePalette, steps: number): SpritePalette {
  const c = [base[1], base[2], base[3]];
  const k = ((steps % 3) + 3) % 3;
  return [null, c[k % 3], c[(k + 1) % 3], c[(k + 2) % 3]];
}

/** Every colour named in a cycle must be a master colour (checked by the palette test). */
export const CYCLE_COLOURS: PaletteName[][] = [];
export function cycleList(names: PaletteName[]): PaletteName[] {
  CYCLE_COLOURS.push(names);
  return names;
}
