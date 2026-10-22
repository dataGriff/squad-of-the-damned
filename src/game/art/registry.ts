/**
 * Art registry (#63): every sprite in the game, grouped, with the palettes it
 * is actually drawn in. The palette, colour-blind and readability checks and
 * the style guide all read this list, so a sprite is checked in the colours
 * the player sees rather than in isolation.
 *
 * Where the game picks palettes at run time (auto-tiles, palette cycling,
 * lightning), the registry calls the same functions the game does and
 * collects every result, so the two cannot drift apart.
 */
import type { Sprite } from '../../engine/sprites';
import { PARTICLE_FRAMES } from '../../engine/particles';
import { cycled, rotated, type SpritePalette } from '../palette';
import { KIDS, KID_ORDER } from '../squad';
import { KID_PORTRAITS, KID_SHEETS, PORTRAIT_DIM_PAL } from './kids';
import * as M from './monsters';
import * as I from './items';
import * as C from './icons';
import * as SC from './scenery';
import { THEMES, tileSprite, type Theme } from './tiles';
import { BACKDROPS } from './backdrops';
import { allLandmarkSprites } from './landmarks';
import { FOREGROUND, PROPS } from './props';
import { GLINT, GLINT_PAL } from '../effects';
import { layerPalette, type Lightning } from '../backdrop';
import { STORY_ART } from '../story';
import { FLASH_PAL, SILHOUETTE_PAL, UNIVERSAL_PALETTES } from './common';

export type ArtCategory =
  | 'kid'
  | 'portrait'
  | 'boss'
  | 'enemy'
  | 'item'
  | 'projectile'
  | 'tile'
  | 'hazard'
  | 'backdrop'
  | 'landmark'
  | 'prop'
  | 'foreground'
  | 'scenery'
  | 'icon'
  | 'effect'
  | 'particle'
  | 'story';

/** Categories the player has to read during play: these must stand out from the scenery (#64). */
export const GAMEPLAY_CATEGORIES: readonly ArtCategory[] = ['kid', 'boss', 'enemy', 'item', 'projectile', 'hazard'];

export interface ArtEntry {
  /** Unique id: category plus name. */
  id: string;
  category: ArtCategory;
  /** The night theme it belongs to, for scenery and tiles. */
  theme?: Theme;
  sprites: Sprite[];
  palettes: SpritePalette[];
  /** Particles are drawn in one colour of the caller's choosing. */
  anySolid?: boolean;
}

const unique = <T>(xs: T[], key: (x: T) => string): T[] => {
  const seen = new Set<string>();
  return xs.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true)));
};
export const paletteKey = (p: SpritePalette): string => p.join(',');
const pals = (ps: SpritePalette[]) => unique(ps, paletteKey);
const sprites = (ss: Sprite[]) => unique(ss, (s) => s.name);

/** Every palette a cycling entry passes through. */
function cycleVariants(base: SpritePalette, i: 1 | 2 | 3, names: readonly string[]): SpritePalette[] {
  return pals(names.map((_, k) => cycled(base, i, names as never, k, 1)));
}

function kidArt(): ArtEntry[] {
  return KID_ORDER.flatMap((id) => [
    {
      id: `kid:${id}`,
      category: 'kid' as const,
      sprites: sprites(Object.values(KID_SHEETS[id].anims).flatMap((a) => a.frames)),
      palettes: [KIDS[id].palette, FLASH_PAL],
    },
    { id: `portrait:${id}`, category: 'portrait' as const, sprites: [KID_PORTRAITS[id]], palettes: [KIDS[id].palette, PORTRAIT_DIM_PAL, SILHOUETTE_PAL] },
  ]);
}

function monsterArt(): ArtEntry[] {
  const bosses = Object.entries(M.BOSS_ANIMS).map(([name, anims]) => ({
    id: `boss:${name}`,
    category: 'boss' as const,
    sprites: sprites(Object.values(anims).flatMap((a) => a.frames)),
    palettes: [M.BOSS_PALETTES[name], FLASH_PAL, SILHOUETTE_PAL],
  }));
  const fodder: [string, Sprite[], SpritePalette][] = [
    ['bat', [...M.BAT.frames, M.BAT_DEAD], M.BAT_PAL],
    ['rat', [...M.RAT.frames, M.RAT_DEAD], M.RAT_PAL],
    ['hand', M.HAND.frames, M.HAND_PAL],
    ['frog', [...M.FROG.frames, M.FROG_SQUASH], M.FROG_PAL],
  ];
  return [...bosses, ...fodder.map(([name, ss, p]) => ({ id: `enemy:${name}`, category: 'enemy' as const, sprites: ss, palettes: [p, FLASH_PAL, SILHOUETTE_PAL] }))];
}

function itemArt(): ArtEntry[] {
  const item = (name: string, ss: Sprite[], ps: SpritePalette[], category: ArtCategory = 'item'): ArtEntry => ({ id: `${category}:${name}`, category, sprites: ss, palettes: ps });
  return [
    item('page', I.PAGE.frames, [I.PAGE_PAL]),
    item('lamp', [I.LAMP_OFF, I.LAMP_ON], [I.LAMP_PAL]),
    item('lamp_glow', [I.LAMP_GLOW], cycleVariants(I.LAMP_GLOW_PAL, 1, I.LAMP_FLICKER), 'effect'),
    item('crate', [I.CRATE], [I.CRATE_PAL]),
    item('silver', I.SILVER.frames, [I.SILVER_PAL]),
    item('heart', [I.HEART], [I.HEART_PAL]),
    item('exit', [I.EXIT], [I.DOOR_PAL]),
    item('lantern', I.LANTERN.frames, [I.LANTERN_PAL]),
    item('valve', [I.VALVE], [I.VALVE_PAL]),
    item('sluice', [I.SLUICE, I.SLUICE_BROKEN], [I.SLUICE_PAL]),
    item('seal', [I.SEAL_OFF, I.SEAL_ON], [I.SEAL_PAL]),
    item('portal', I.PORTAL.frames, pals([0, 1, 2].map((k) => rotated(I.PORTAL_PAL, k)))),
    item('shots', [I.PEBBLE, I.SILVER_SHOT, I.CHARGED_SHOT], [I.PROJ_PAL], 'projectile'),
    item('garlic', [...I.GARLIC_BOMB.frames, ...I.STUN_CLOUD.frames], [I.GARLIC_PAL], 'projectile'),
    item('fire', I.FIRE.frames, [I.FIRE_PAL], 'projectile'),
    item('spray', I.SPRAY.frames, [I.WATER_PAL], 'projectile'),
    item('boulder', [I.BOULDER], [I.BOULDER_PAL], 'projectile'),
    item('bandage', [I.BANDAGE], [I.BANDAGE_PAL], 'projectile'),
    item('bubble', [I.BUBBLE], [I.BUBBLE_PAL], 'projectile'),
  ];
}

/** Tile ids by kind; spikes and water are hazards the player must read. */
const TILE_KINDS: Record<number, [ArtCategory, string]> = {
  1: ['tile', 'solid'],
  2: ['tile', 'solid'],
  14: ['tile', 'solid'],
  3: ['tile', 'platform'],
  4: ['tile', 'ladder'],
  5: ['tile', 'cracked'],
  7: ['tile', 'vent'],
  9: ['tile', 'deco'],
  10: ['tile', 'deco'],
  11: ['tile', 'deco'],
  12: ['tile', 'lamp'],
  13: ['tile', 'door'],
  6: ['hazard', 'spike'],
  8: ['hazard', 'water'],
};

/** Every (sprite, palette) tileSprite() can return, per theme and kind. */
function tileArt(): ArtEntry[] {
  const out: ArtEntry[] = [];
  for (const theme of Object.keys(THEMES) as Theme[]) {
    const groups = new Map<string, { category: ArtCategory; ss: Sprite[]; ps: SpritePalette[] }>();
    for (const [gid, [category, kind]] of Object.entries(TILE_KINDS))
      for (let mask = 0; mask < 16; mask++)
        for (let v = 0; v < 4; v++)
          for (let frame = 0; frame < 12; frame++) {
            const t = tileSprite(Number(gid), theme, frame, mask, v);
            if (!t) continue;
            const id = `${category}:${kind}:${theme}`;
            const g = groups.get(id) ?? { category, ss: [], ps: [] };
            g.ss.push(t.sprite);
            g.ps.push(t.pal);
            groups.set(id, g);
          }
    for (const [id, g] of groups) out.push({ id, category: g.category, theme, sprites: sprites(g.ss), palettes: pals(g.ps) });
  }
  return out;
}

function backdropArt(): ArtEntry[] {
  const landmarks = new Set(allLandmarkSprites().map((s) => s.name));
  const out: ArtEntry[] = [];
  for (const [theme, layers] of Object.entries(BACKDROPS) as [Theme, (typeof BACKDROPS)[Theme]][]) {
    const outdoors = layers.some((l) => l.sky);
    layers.forEach((l, i) => {
      const ps: SpritePalette[] = [];
      for (const f of l.frames)
        for (const lightning of ['none', 'strike', 'pulse'] as Lightning[])
          // step through a full palette cycle at its own rate
          for (let k = 0; k < (l.cycle ? l.cycle.colours.length : 1); k++) {
            const p = layerPalette(l, f, l.cycle ? k / l.cycle.fps : 0, outdoors, lightning);
            if (p) ps.push(p);
          }
      const category = l.frames.some((f) => landmarks.has(f.name)) ? 'landmark' : 'backdrop';
      out.push({ id: `${category}:${theme}:${i}:${l.frames[0].name}`, category, theme, sprites: l.frames, palettes: pals(ps) });
    });
  }
  return out;
}

function propArt(): ArtEntry[] {
  return (Object.keys(PROPS) as Theme[]).flatMap((theme) => [
    ...PROPS[theme].map((p) => ({ id: `prop:${theme}:${p.sprite.name}`, category: 'prop' as const, theme, sprites: [p.sprite], palettes: [p.pal] })),
    ...FOREGROUND[theme].map((l) => ({ id: `foreground:${theme}:${l.frames[0].name}`, category: 'foreground' as const, theme, sprites: l.frames, palettes: [l.pal] })),
  ]);
}

function sceneryArt(): ArtEntry[] {
  const e = (name: string, s: Sprite, ps: SpritePalette[]): ArtEntry => ({ id: `scenery:${name}`, category: 'scenery', theme: 'hub', sprites: [s], palettes: ps });
  return [
    e('oak_trunk', SC.OAK_TRUNK, [SC.OAK_TRUNK_PAL]),
    e('oak_canopy', SC.OAK_CANOPY, [SC.OAK_CANOPY_PAL]),
    e('treehouse', SC.TREEHOUSE, pals([SC.TREEHOUSE_PAL, ...cycleVariants(SC.TREEHOUSE_PAL, 3, SC.TREEHOUSE_FLICKER)])),
    e('rope_ladder', SC.ROPE_LADDER, [SC.ROPE_PAL]),
    e('drip', SC.DRIP, [SC.DRIP_PAL]),
  ];
}

function iconArt(): ArtEntry[] {
  const e = (name: string, ss: Sprite[], p: SpritePalette): ArtEntry => ({ id: `icon:${name}`, category: 'icon', sprites: ss, palettes: [p] });
  return [
    e('heart', [C.HEART_FULL], C.HEART_PAL),
    e('heart_empty', [C.HEART_EMPTY], C.HEART_EMPTY_PAL),
    e('life', [C.LIFE], C.LIFE_PAL),
    e('clock', [C.CLOCK], C.CLOCK_PAL),
    e('buttons', [C.BUTTON_A, C.BUTTON_B], C.BUTTON_PAL),
    e('pill', [C.BUTTON_PILL], C.PILL_PAL),
    e('skull', [C.SKULL], C.SKULL_PAL),
  ];
}

function effectArt(): ArtEntry[] {
  return [
    { id: 'effect:glint', category: 'effect', sprites: GLINT.frames, palettes: [GLINT_PAL] },
    { id: 'particle:all', category: 'particle', sprites: Object.values(PARTICLE_FRAMES).flat(), palettes: [FLASH_PAL], anySolid: true },
    ...STORY_ART.map((a) => ({ id: `story:${a.sprite.name}`, category: 'story' as const, sprites: [a.sprite], palettes: [a.pal] })),
  ];
}

let cache: ArtEntry[] | null = null;

/** The whole registry (built once). */
export function artRegistry(): ArtEntry[] {
  cache ??= [...kidArt(), ...monsterArt(), ...itemArt(), ...tileArt(), ...backdropArt(), ...propArt(), ...sceneryArt(), ...iconArt(), ...effectArt()];
  return cache;
}

/** Every distinct sprite in the registry. */
export function registeredSprites(): Sprite[] {
  return sprites(artRegistry().flatMap((e) => e.sprites));
}

/** Every distinct palette in the registry, with the entries that use it. */
export function registeredPalettes(): { pal: SpritePalette; entries: ArtEntry[] }[] {
  const m = new Map<string, { pal: SpritePalette; entries: ArtEntry[] }>();
  for (const e of artRegistry())
    for (const p of e.palettes) {
      const k = paletteKey(p);
      if (!m.has(k)) m.set(k, { pal: p, entries: [] });
      m.get(k)!.entries.push(e);
    }
  return [...m.values()];
}

/**
 * Is this sprite registered with this palette? Universal palettes (flash,
 * silhouettes) are allowed for any registered sprite, and particle sprites
 * take any single colour.
 */
export function isRegisteredPair(spriteName: string, p: SpritePalette): boolean {
  const index = pairIndex();
  const allowed = index.get(spriteName);
  if (!allowed) return false;
  const k = paletteKey(p);
  if (allowed.pals.has(k) || UNIVERSAL_KEYS.has(k)) return true;
  return allowed.anySolid && p[1] === p[2] && p[2] === p[3];
}

const UNIVERSAL_KEYS = new Set(UNIVERSAL_PALETTES.map(paletteKey));
let pairs: Map<string, { pals: Set<string>; anySolid: boolean }> | null = null;
function pairIndex() {
  if (pairs) return pairs;
  pairs = new Map();
  for (const e of artRegistry())
    for (const s of e.sprites) {
      const cur = pairs.get(s.name) ?? { pals: new Set<string>(), anySolid: false };
      for (const p of e.palettes) cur.pals.add(paletteKey(p));
      cur.anySolid ||= !!e.anySolid;
      pairs.set(s.name, cur);
    }
  return pairs;
}
