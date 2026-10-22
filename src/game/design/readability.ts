/**
 * Readability (#64): can the player pick out what matters?
 *
 *  - Text: every text style must contrast with each surface it is used on.
 *  - Sprites: every gameplay sprite must stand out from the colours that
 *    dominate the backdrop and ground of each night it appears in.
 *  - Scenery: a night's backdrop must be quieter than its gameplay, so the
 *    background never competes with what the player has to read.
 *
 * Contrast is the WCAG ratio of relative luminance. Luminance contrast is
 * what lets anyone, colour blind or not, separate shapes; hue confusions are
 * the colour-blind palette check's job (#47).
 * Backdrops are composited here in plain pixels (no canvas), with the same
 * layer and palette logic the game uses.
 */
import { SCREEN_H, SCREEN_W, TILE } from '../../engine/constants';
import type { Sprite } from '../../engine/sprites';
import type { SpritePalette } from '../palette';
import { BACKDROPS } from '../art/backdrops';
import { THEMES, tileSprite, type Theme } from '../art/tiles';
import { AIR_U } from '../art/autotiles';
import { layerPalette } from '../backdrop';
import { LEVEL_JSON } from '../levels';
import { artRegistry, GAMEPLAY_CATEGORIES, type ArtEntry } from '../art/registry';
import { UNIVERSAL_PALETTES } from '../art/common';
import { HUD_H } from '../hud';
import { STYLES, type StyleName } from './type';
import { hex, type Colour } from './tokens';
import { contrast, lum, simulate } from './vision';

export const NIGHT_THEMES: Theme[] = ['mansion', 'graveyard', 'suburb', 'sewer', 'drain'];

/** Luminance contrast between two colours (WCAG ratio). */
export function lumContrast(a: string, b: string): number {
  return contrast(lum(simulate(a, 'normal')), lum(simulate(b, 'normal')));
}


/* ------------------------------------------------------------------ */
/* Text                                                                 */
/* ------------------------------------------------------------------ */

/**
 * WCAG AA: running text must reach 4.5:1; bold display text (the heavy face
 * and the big logo face count as large text) and secondary text (hints,
 * notes, unselected items) 3:1. Disabled menu items are exempt, as in WCAG.
 */
export const TEXT_MIN = { primary: 4.5, display: 3, secondary: 3 } as const;

/** Where each style appears, and how important it is. `label` carries its own shadow, so it is checked against that. */
export const TEXT_USES: Record<StyleName, { on: Colour[]; tier: keyof typeof TEXT_MIN }> = {
  title: { on: ['screen'], tier: 'display' },
  subtitle: { on: ['screen'], tier: 'display' },
  heading: { on: ['panel', 'dialog', 'screen'], tier: 'display' },
  alert: { on: ['panel', 'screen'], tier: 'display' },
  display: { on: ['panel', 'screen'], tier: 'display' },
  body: { on: ['panel', 'dialog', 'screen'], tier: 'primary' },
  bodySoft: { on: ['panel', 'dialog', 'screen'], tier: 'secondary' },
  hint: { on: ['panel', 'dialog', 'screen'], tier: 'secondary' },
  caption: { on: ['screen'], tier: 'secondary' },
  label: { on: ['black'], tier: 'primary' },
  paperHeading: { on: ['paper'], tier: 'display' },
  paperAlert: { on: ['paper'], tier: 'display' },
  paperBody: { on: ['paper'], tier: 'primary' },
  paperNote: { on: ['paper'], tier: 'secondary' },
  paperAccent: { on: ['paper'], tier: 'secondary' },
};

/** Menu and prompt colours that are not a style of their own (#62). */
export const UI_COLOUR_USES: { what: string; colour: Colour; on: Colour[]; tier: keyof typeof TEXT_MIN }[] = [
  { what: 'menu cursor', colour: 'accent', on: ['panel', 'dialog'], tier: 'primary' },
  { what: 'menu value', colour: 'textSoft', on: ['panel', 'dialog'], tier: 'secondary' },
  { what: 'selected value', colour: 'accent', on: ['panel', 'dialog'], tier: 'primary' },
  { what: 'unselected item', colour: 'textDim', on: ['panel', 'dialog', 'screen'], tier: 'secondary' },
];

export interface TextResult {
  what: string;
  colour: string;
  on: Colour;
  ratio: number;
  min: number;
}

export function textResults(): TextResult[] {
  const out: TextResult[] = [];
  for (const [name, use] of Object.entries(TEXT_USES) as [StyleName, (typeof TEXT_USES)[StyleName]][])
    for (const on of use.on) out.push({ what: `style ${name}`, colour: hex(STYLES[name].colour), on, ratio: lumContrast(hex(STYLES[name].colour), hex(on)), min: TEXT_MIN[use.tier] });
  for (const u of UI_COLOUR_USES) for (const on of u.on) out.push({ what: u.what, colour: hex(u.colour), on, ratio: lumContrast(hex(u.colour), hex(on)), min: TEXT_MIN[u.tier] });
  return out;
}

/* ------------------------------------------------------------------ */
/* Backdrops                                                            */
/* ------------------------------------------------------------------ */

function blit(buf: Uint32Array, s: Sprite, p: SpritePalette, x0: number, y0: number): void {
  const rgb = p.map((c) => (c ? parseInt(c.slice(1), 16) : -1));
  for (let y = 0; y < s.h; y++) {
    const sy = y0 + y;
    if (sy < 0 || sy >= SCREEN_H) continue;
    for (let x = 0; x < s.w; x++) {
      const sx = x0 + x;
      if (sx < 0 || sx >= SCREEN_W) continue;
      const c = rgb[s.px[y * s.w + x]];
      if (c >= 0) buf[sy * SCREEN_W + sx] = c;
    }
  }
}

/** A theme's backdrop (and optionally a strip of ground) at a camera position, as 0xRRGGBB pixels. */
export function composeScene(theme: Theme, camX: number, ground = true): Uint32Array {
  const buf = new Uint32Array(SCREEN_W * SCREEN_H).fill(parseInt(hex(THEMES[theme].sky).slice(1), 16));
  const layers = BACKDROPS[theme];
  const outdoors = layers.some((l) => l.sky);
  for (const l of layers) {
    const f = l.frames[0];
    const p = layerPalette(l, f, 0, outdoors, 'none');
    if (!p) continue;
    if (l.x !== undefined) {
      blit(buf, f, p, l.x, l.y);
      continue;
    }
    const every = l.every ?? f.w;
    const shift = Math.round(camX * l.factor) - (l.offset ?? 0);
    let x = -(((shift % every) + every) % every);
    while (x + f.w > 0) x -= every;
    for (x += every; x < SCREEN_W; x += every) blit(buf, f, p, x, l.y);
  }
  // the ground the squad runs on: one auto-tiled surface row over fill
  if (ground) for (let x = 0; x < SCREEN_W; x += TILE) {
    const top = tileSprite(1, theme, 0, AIR_U, (x / TILE) % 4);
    const fill = tileSprite(2, theme, 0, 0, (x / TILE + 1) % 4);
    if (top) blit(buf, top.sprite, top.pal, x, SCREEN_H - 2 * TILE);
    if (fill) blit(buf, fill.sprite, fill.pal, x, SCREEN_H - TILE);
  }
  return buf;
}

/** A colour needs this share of the play area (below the HUD) to count as dominant. */
export const DOMINANT_SHARE = 0.04;

/** The colours covering at least DOMINANT_SHARE of the play area, over several camera positions. */
export function dominantColours(theme: Theme, ground = true): { colour: string; share: number }[] {
  const counts = new Map<number, number>();
  let total = 0;
  for (const camX of [0, 400, 1100, 2300]) {
    const buf = composeScene(theme, camX, ground);
    for (let i = HUD_H * SCREEN_W; i < buf.length; i++) {
      counts.set(buf[i], (counts.get(buf[i]) ?? 0) + 1);
      total++;
    }
  }
  return [...counts]
    .map(([c, n]) => ({ colour: '#' + c.toString(16).padStart(6, '0'), share: n / total }))
    .filter((c) => c.share >= DOMINANT_SHARE)
    .sort((a, b) => b.share - a.share);
}

/* ------------------------------------------------------------------ */
/* Sprites                                                              */
/* ------------------------------------------------------------------ */

/** Registry entry ids each level object type stands for. */
const OBJECT_ART: Record<string, string[]> = {
  bat: ['enemy:bat'],
  rat: ['enemy:rat'],
  hand: ['enemy:hand'],
  frog: ['enemy:frog'],
  page: ['item:page'],
  lamp: ['item:lamp'],
  crate: ['item:crate'],
  silver: ['item:silver'],
  heart: ['item:heart'],
  exit: ['item:exit'],
  lantern: ['item:lantern', 'projectile:fire'],
  valve: ['item:valve', 'projectile:spray'],
  sluice: ['item:sluice'],
  seal: ['item:seal'],
  portal: ['item:portal'],
  giant_ally: ['boss:giant'],
};
const BOSS_ART: Record<string, string[]> = {
  vampire: ['boss:vampire'],
  giant: ['boss:giant', 'projectile:boulder'],
  wolfman: ['boss:wolfman'],
  mummy: ['boss:mummy', 'projectile:bandage'],
  gill: ['boss:gill', 'projectile:bubble'],
};

/** The nights each gameplay entry appears in, from the level data. Kids and their shots appear everywhere. */
export function appearances(): Map<string, Set<Theme>> {
  const m = new Map<string, Set<Theme>>();
  const add = (id: string, t: Theme) => (m.get(id) ?? m.set(id, new Set()).get(id)!).add(t);
  for (const level of Object.values(LEVEL_JSON)) {
    const theme = level.properties?.find((p) => p.name === 'theme')?.value as Theme;
    for (const layer of level.layers)
      for (const o of layer.objects ?? []) {
        for (const id of OBJECT_ART[o.type] ?? []) add(id, theme);
        const boss = o.properties?.find((p) => p.name === 'boss')?.value as string | undefined;
        if (o.type === 'arena' && boss) for (const id of BOSS_ART[boss] ?? []) add(id, theme);
      }
  }
  // hazard tiles appear where a level actually uses them
  const HAZARD_GIDS: Record<number, string> = { 6: 'spike', 8: 'water' };
  for (const level of Object.values(LEVEL_JSON)) {
    const theme = level.properties?.find((p) => p.name === 'theme')?.value as Theme;
    for (const layer of level.layers) for (const gid of layer.data ?? []) if (HAZARD_GIDS[gid]) add(`hazard:${HAZARD_GIDS[gid]}:${theme}`, theme);
  }
  for (const e of artRegistry()) if (e.category === 'kid' || e.id === 'projectile:shots' || e.id === 'projectile:garlic') for (const t of NIGHT_THEMES) add(e.id, t);
  return m;
}

const UNIVERSAL = new Set(UNIVERSAL_PALETTES.map((p) => p.join(',')));


/** A colour counts towards a sprite's look when it covers at least an eighth of its pixels: faces, hands and rim light do (12–15%), eyes and glints (2–5%) do not. */
export const SIGNIFICANT = 0.125;

/** The colours covering at least SIGNIFICANT of an entry's opaque pixels, over all frames, as palette indices. */
function significantIndices(e: ArtEntry): number[] {
  const n = [0, 0, 0, 0];
  for (const s of e.sprites) for (const v of s.px) n[v]++;
  const opaque = n[1] + n[2] + n[3];
  return [1, 2, 3].filter((i) => n[i] / opaque >= SIGNIFICANT);
}

/** A sprite stands out from a background colour when one of its significant colours reaches this contrast. */
export const STANDOUT = 3;
/** It must stand out from backgrounds covering at least half the night's play area. */
export const READABLE_SHARE = 0.5;
/** Below this the check passes but reports the sprite, so weak spots stay visible. */
export const WARN_SHARE = 0.75;

export interface SpriteResult {
  entry: string;
  theme: Theme;
  background: string;
  share: number;
  /** The best contrast of the sprite's significant colours against this background colour (worst palette). */
  ratio: number;
}

/** Each gameplay entry's own palettes (not the shared flash and silhouette ones). */
function ownPalettes(e: ArtEntry): SpritePalette[] {
  return e.palettes.filter((p) => !UNIVERSAL.has(p.join(',')));
}

export function spriteResults(): SpriteResult[] {
  const where = appearances();
  const dominant = new Map(NIGHT_THEMES.map((t) => [t, dominantColours(t)]));
  const out: SpriteResult[] = [];
  for (const e of artRegistry()) {
    if (!GAMEPLAY_CATEGORIES.includes(e.category)) continue;
    const idx = significantIndices(e);
    for (const theme of where.get(e.id) ?? [])
      for (const bg of dominant.get(theme)!) {
        const ratio = Math.min(...ownPalettes(e).map((p) => Math.max(...idx.map((i) => lumContrast(p[i] as string, bg.colour)))));
        out.push({ entry: e.id, theme, background: bg.colour, share: bg.share, ratio });
      }
  }
  return out;
}

export interface ReadableResult {
  entry: string;
  theme: Theme;
  /** Share of the night's dominant background the sprite stands out from. */
  readable: number;
  /** The background colours it gets lost against. */
  lostOn: string[];
}

/** Per gameplay entry and night: how much of the background it stands out from. */
export function readableResults(sprites = spriteResults()): ReadableResult[] {
  const m = new Map<string, { ok: number; total: number; lost: string[]; e: string; t: Theme }>();
  for (const s of sprites) {
    const k = `${s.entry}@${s.theme}`;
    const a = m.get(k) ?? { ok: 0, total: 0, lost: [], e: s.entry, t: s.theme };
    a.total += s.share;
    if (s.ratio >= STANDOUT) a.ok += s.share;
    else a.lost.push(s.background);
    m.set(k, a);
  }
  return [...m.values()].map((a) => ({ entry: a.e, theme: a.t, readable: a.ok / a.total, lostOn: a.lost }));
}

/* ------------------------------------------------------------------ */
/* Scenery                                                              */
/* ------------------------------------------------------------------ */

/** A backdrop's strongest internal edge must stay below a gameplay standout, so it never competes. */
export const BACKDROP_MAX = STANDOUT;

export interface SceneryResult {
  theme: Theme;
  /** Strongest contrast between two dominant backdrop colours: how busy the background is (must stay under BACKDROP_MAX). */
  backdrop: number;
  /** Median best contrast of gameplay sprites against that night's dominant colours. */
  gameplay: number;
}

export function sceneryResults(sprites = spriteResults()): SceneryResult[] {
  return NIGHT_THEMES.map((theme) => {
    // only the decorative backdrop: the ground is terrain the player reads
    const dom = dominantColours(theme, false);
    let busy = 1;
    for (let i = 0; i < dom.length; i++) for (let j = i + 1; j < dom.length; j++) busy = Math.max(busy, lumContrast(dom[i].colour, dom[j].colour));
    const ratios = sprites.filter((s) => s.theme === theme).map((s) => s.ratio).sort((a, b) => a - b);
    return { theme, backdrop: busy, gameplay: ratios[Math.floor(ratios.length / 2)] ?? 0 };
  });
}

