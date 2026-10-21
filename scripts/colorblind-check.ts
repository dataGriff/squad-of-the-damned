/**
 * Colour-blind safe palette check (#47). Simulates protanopia, deuteranopia
 * and tritanopia (Machado et al. 2009 matrices) for every sprite palette and
 * requires the three colours to stay distinguishable: a minimum luminance
 * gap OR a minimum RGB distance after simulation.
 */
import { hexToRgb, luminance } from '../src/game/palette';
import { KIDS } from '../src/game/squad';
import { BOSS_PALETTES, BAT_PAL, RAT_PAL, HAND_PAL, FROG_PAL } from '../src/game/art/monsters';
import { THEMES } from '../src/game/art/tiles';
import type { SpritePalette } from '../src/game/palette';

const SIM: Record<string, number[][]> = {
  protanopia: [[0.567, 0.433, 0], [0.558, 0.442, 0], [0, 0.242, 0.758]],
  deuteranopia: [[0.625, 0.375, 0], [0.7, 0.3, 0], [0, 0.3, 0.7]],
  tritanopia: [[0.95, 0.05, 0], [0, 0.433, 0.567], [0, 0.475, 0.525]],
};

function simulate(hex: string, m: number[][]): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return [m[0][0] * r + m[0][1] * g + m[0][2] * b, m[1][0] * r + m[1][1] * g + m[1][2] * b, m[2][0] * r + m[2][1] * g + m[2][2] * b];
}
function toHex(c: [number, number, number]): string {
  return '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function dist(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

const MIN_LUM_GAP = 0.12;
const MIN_RGB_DIST = 60;

export function checkPaletteCB(name: string, p: SpritePalette): string[] {
  const problems: string[] = [];
  const cols = [p[1], p[2], p[3]];
  for (const [simName, m] of Object.entries(SIM)) {
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const a = simulate(cols[i], m);
        const b = simulate(cols[j], m);
        const lumGap = Math.abs(luminance(toHex(a)) - luminance(toHex(b)));
        if (lumGap < MIN_LUM_GAP && dist(a, b) < MIN_RGB_DIST) {
          problems.push(`${name}: ${cols[i]} vs ${cols[j]} indistinguishable under ${simName} (lum gap ${lumGap.toFixed(2)}, dist ${dist(a, b).toFixed(0)})`);
        }
      }
    }
  }
  return problems;
}

const palettes: Record<string, SpritePalette> = {};
for (const k of Object.values(KIDS)) palettes[`kid:${k.id}`] = k.palette;
for (const [n, p] of Object.entries(BOSS_PALETTES)) palettes[`boss:${n}`] = p;
Object.assign(palettes, { bat: BAT_PAL, rat: RAT_PAL, hand: HAND_PAL, frog: FROG_PAL });
for (const [n, t] of Object.entries(THEMES)) {
  palettes[`theme:${n}:tiles`] = t.tiles;
  palettes[`theme:${n}:deco`] = t.deco;
}
const all = Object.entries(palettes).flatMap(([n, p]) => checkPaletteCB(n, p));
if (all.length) {
  console.error(`Colour-blind check FAILED (${all.length}):`);
  for (const p of all) console.error('  ' + p);
  process.exit(1);
}
console.log(`Colour-blind check OK: ${Object.keys(palettes).length} palettes distinguishable under protanopia, deuteranopia and tritanopia.`);
