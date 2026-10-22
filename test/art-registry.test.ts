import { describe, expect, it } from 'vitest';
import type { Sprite } from '../src/engine/sprites';
import { GAMEPLAY_CATEGORIES, artRegistry, isRegisteredPair, registeredSprites } from '../src/game/art/registry';
import { FLASH_PAL } from '../src/game/art/common';
import { KIDS } from '../src/game/squad';
import { BOSS_PALETTES } from '../src/game/art/monsters';
import { pal } from '../src/game/palette';
import * as kids from '../src/game/art/kids';
import * as monsters from '../src/game/art/monsters';
import * as items from '../src/game/art/items';
import * as icons from '../src/game/art/icons';
import * as scenery from '../src/game/art/scenery';
import * as landmarks from '../src/game/art/landmarks';
import * as backdrops from '../src/game/art/backdrops';
import * as props from '../src/game/art/props';
import * as effects from '../src/game/effects';
import * as particles from '../src/engine/particles';

const isSprite = (v: unknown): v is Sprite => !!v && typeof v === 'object' && (v as Sprite).px instanceof Uint8Array && typeof (v as Sprite).name === 'string';

/** Every sprite reachable from a module's exports (sprites, arrays, animations, tables). */
function exportedSprites(mod: Record<string, unknown>): Sprite[] {
  const out: Sprite[] = [];
  const seen = new Set<unknown>();
  const walk = (v: unknown, depth: number): void => {
    if (!v || typeof v !== 'object' || seen.has(v) || depth > 5) return;
    seen.add(v);
    if (isSprite(v)) return void out.push(v);
    for (const x of Array.isArray(v) ? v : Object.values(v)) walk(x, depth + 1);
  };
  for (const v of Object.values(mod)) walk(v, 0);
  return out;
}

describe('art registry (#63)', () => {
  it('every sprite exported by an art module is registered', () => {
    const registered = new Set(registeredSprites().map((s) => s.name));
    const modules = { kids, monsters, items, icons, scenery, landmarks, backdrops, props, effects, particles };
    const missing: string[] = [];
    for (const [name, mod] of Object.entries(modules)) for (const s of exportedSprites(mod as Record<string, unknown>)) if (!registered.has(s.name)) missing.push(`${name}: ${s.name}`);
    expect(missing).toEqual([]);
    expect(registered.size).toBeGreaterThan(1600);
  });

  it('entries are unique and each has sprites and palettes', () => {
    const ids = artRegistry().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of artRegistry()) {
      expect(e.sprites.length, e.id).toBeGreaterThan(0);
      expect(e.palettes.length, e.id).toBeGreaterThan(0);
    }
    for (const c of GAMEPLAY_CATEGORIES) expect(artRegistry().some((e) => e.category === c), c).toBe(true);
  });

  it('knows which palettes each sprite is drawn in', () => {
    const casey = kids.KID_SHEETS.sling.anims.idle.frames[0];
    expect(isRegisteredPair(casey.name, KIDS.sling.palette)).toBe(true);
    expect(isRegisteredPair(casey.name, FLASH_PAL)).toBe(true);
    expect(isRegisteredPair(casey.name, BOSS_PALETTES.vampire)).toBe(false);
    expect(isRegisteredPair('no_such_sprite', FLASH_PAL)).toBe(false);
    // particles take any single colour
    expect(isRegisteredPair(particles.PARTICLE_FRAMES.puff[0].name, pal('mint', 'mint', 'mint'))).toBe(true);
  });
});
