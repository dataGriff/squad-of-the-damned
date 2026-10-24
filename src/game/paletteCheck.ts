/**
 * Palette constraint (#37): every sprite uses at most 4 palette indices
 * (transparent + 3) and every sprite palette draws from the NES master palette.
 * Shared by the test suite and the CLI script.
 */
import { spriteColourCount, type Sprite } from '../engine/sprites';
import { MASTER_PALETTE, type SpritePalette } from './palette';

export interface PaletteViolation {
  sprite: string;
  reason: string;
}

export function checkSprites(sprites: Sprite[]): PaletteViolation[] {
  const out: PaletteViolation[] = [];
  const seen = new Set<string>();
  for (const s of sprites) {
    if (seen.has(s.name)) out.push({ sprite: s.name, reason: 'duplicate sprite name' });
    seen.add(s.name);
    const n = spriteColourCount(s);
    if (n > 4) out.push({ sprite: s.name, reason: `uses ${n} colours (max 4 incl. transparent)` });
    for (const v of s.px) if (v > 3) out.push({ sprite: s.name, reason: `palette index ${v} out of range` });
    if (s.w === 0 || s.h === 0) out.push({ sprite: s.name, reason: 'empty sprite' });
  }
  return out;
}

export function checkPalette(p: SpritePalette, name = 'palette'): PaletteViolation[] {
  const master = new Set<string>(Object.values(MASTER_PALETTE));
  const out: PaletteViolation[] = [];
  if (p[0] !== null) out.push({ sprite: name, reason: 'index 0 must be transparent' });
  for (let i = 1; i < 4; i++) if (!master.has(p[i] as string)) out.push({ sprite: name, reason: `colour ${p[i]} not in master palette` });
  return out;
}
