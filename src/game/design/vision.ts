/**
 * Colour vision (#47, shared with the readability check in #64). Simulates
 * protanopia, deuteranopia and tritanopia (Machado et al. 2009 matrices) and
 * measures how far apart two colours look.
 */
import { hexToRgb, luminance } from '../palette';
import type { SpritePalette } from '../palette';

export type RGB = [number, number, number];
export type Vision = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';

const SIM: Record<Exclude<Vision, 'normal'>, number[][]> = {
  protanopia: [[0.567, 0.433, 0], [0.558, 0.442, 0], [0, 0.242, 0.758]],
  deuteranopia: [[0.625, 0.375, 0], [0.7, 0.3, 0], [0, 0.3, 0.7]],
  tritanopia: [[0.95, 0.05, 0], [0, 0.433, 0.567], [0, 0.475, 0.525]],
};
export const VISIONS = Object.keys(SIM) as Exclude<Vision, 'normal'>[];

/** A hex colour as seen with a colour vision deficiency. */
export function simulate(hex: string, v: Vision): RGB {
  const [r, g, b] = hexToRgb(hex);
  if (v === 'normal') return [r, g, b];
  const m = SIM[v];
  return [m[0][0] * r + m[0][1] * g + m[0][2] * b, m[1][0] * r + m[1][1] * g + m[1][2] * b, m[2][0] * r + m[2][1] * g + m[2][2] * b];
}

function toHex(c: RGB): string {
  return '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

/** Relative luminance of an RGB triple. */
export function lum(c: RGB): number {
  return luminance(toHex(c));
}

/** WCAG contrast ratio between two luminances (1 = identical, 21 = black on white). */
export function contrast(l1: number, l2: number): number {
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export function dist(a: RGB, b: RGB): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export const MIN_LUM_GAP = 0.12;
export const MIN_RGB_DIST = 60;

/**
 * The colours of a sprite palette must stay distinguishable under each
 * deficiency: a minimum luminance gap OR a minimum RGB distance after
 * simulation. Entries that are deliberately the same colour are skipped.
 */
export function checkPaletteCB(name: string, p: SpritePalette): string[] {
  const problems: string[] = [];
  const cols = [p[1], p[2], p[3]] as string[];
  for (const v of VISIONS)
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++) {
        if (cols[i] === cols[j]) continue;
        const a = simulate(cols[i], v);
        const b = simulate(cols[j], v);
        const gap = Math.abs(lum(a) - lum(b));
        if (gap < MIN_LUM_GAP && dist(a, b) < MIN_RGB_DIST) problems.push(`${name}: ${cols[i]} vs ${cols[j]} indistinguishable under ${v} (lum gap ${gap.toFixed(2)}, dist ${dist(a, b).toFixed(0)})`);
      }
  return problems;
}
