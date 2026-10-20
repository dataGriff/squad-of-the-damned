/**
 * Nights 1–5 and the finale (#29, #31, #32, #33) as level sources. The export
 * script turns these into Tiled JSON; the game loads that JSON. Each night
 * declares which kids it requires (#19) — a test checks the map really does.
 */
import type { LevelSource } from '../../engine/tilemap';
import * as S from './segments';

export interface NightDef {
  id: string;
  number: number;
  title: string;
  boss: string;
  page: string;
  song: string;
  requiredKids: string[];
  source: LevelSource;
}

const ARENA_W = 16;

/** Build a night: segments, then the arena, then the exit corridor. */
function night(id: string, theme: string, segs: S.Seg[], arena: S.Seg, boss: string, extra: LevelSource['objects'] = [], props: Record<string, string | number | boolean> = {}): LevelSource {
  const body = [...segs, arena, S.ARENA_EXIT];
  const rows = S.cat(...body);
  const arenaTx = segs.reduce((n, s) => n + s[0].length, 0);
  return {
    id,
    theme,
    rows,
    objects: [{ type: 'arena', tx: arenaTx, ty: 14, w: ARENA_W * 16, h: 240, props: { boss } }, ...extra],
    props,
  };
}

export const NIGHTS: NightDef[] = [
  {
    id: 'night1',
    number: 1,
    title: 'NIGHT 1: THE HOUSE ON ELM ST',
    boss: 'vampire',
    page: 'vampire',
    song: 'night1',
    requiredKids: ['garlic', 'little'],
    source: night('night1', 'mansion', [S.START, S.FLAT_DECO_A, S.FLAT_RATS, S.STEPS, S.FLAT_BATS, S.LAMP, S.CRAWL, S.VENT_PAGE, S.FLAT_DECO_B, S.HEART, S.GAP_SPIKES, S.FLAT_BATS, S.SECRET_ROOM, S.LAMP, S.PILLARS], S.ARENA_VAMPIRE, 'vampire', [
      { type: 'page', tx: 16 * 12 + 7, ty: 5, props: { page: 'bat' } },
    ]),
  },
  {
    id: 'night2',
    number: 2,
    title: 'NIGHT 2: THE OLD GRAVEYARD',
    boss: 'giant',
    page: 'giant',
    song: 'night2',
    requiredKids: ['sling', 'big'],
    source: night('night2', 'graveyard', [S.START, S.FLAT_DECO_A, S.FLAT_HANDS, S.LADDER_WALL, S.FLAT_BATS, S.LAMP, S.CRACKED, S.FLAT_HANDS, S.CRATE_LEDGE, S.FLAT_DECO_B, S.GAP_SPIKES, S.LAMP, S.SILVER, S.FLAT_HANDS, S.FLAT_DECO_A], S.ARENA_GIANT, 'giant', [
      { type: 'page', tx: 16 * 8 + 12, ty: 9, props: { page: 'giant' } },
      { type: 'page', tx: 16 * 13 + 10, ty: 12, props: { page: 'hand' } },
    ]),
  },
  {
    id: 'night3',
    number: 3,
    title: 'NIGHT 3: FULL MOON OVER MAPLE DRIVE',
    boss: 'wolfman',
    page: 'wolfman',
    song: 'night3',
    requiredKids: ['sling', 'little', 'big'],
    source: night('night3', 'suburb', [S.START, S.FLAT_DECO_A, S.FLAT_RATS, S.GAP_SPIKES, S.FLAT_BATS, S.LAMP, S.CRATE_LEDGE, S.SILVER, S.FLAT_RATS, S.VENT_PAGE, S.HIGH_SILVER, S.LAMP, S.STEPS, S.SILVER, S.SECRET_ROOM, S.FLAT_DECO_B], S.ARENA_WOLF, 'wolfman', [
      { type: 'page', tx: 16 * 14 + 7, ty: 5, props: { page: 'rat' } },
    ]),
  },
  {
    id: 'night4',
    number: 4,
    title: 'NIGHT 4: UNDER THE MUSEUM',
    boss: 'mummy',
    page: 'mummy',
    song: 'night4',
    requiredKids: ['sling', 'big', 'little'],
    source: night('night4', 'sewer', [S.START, S.FLAT_DECO_A, S.GAP_WATER, S.FLAT_FROGS, S.LAMP, S.CRACKED, S.FLAT_RATS, S.LADDER_WALL, S.CRAWL, S.VENT_PAGE, S.LAMP, S.GAP_WATER, S.FLAT_BATS, S.HEART, S.FLAT_DECO_B], S.ARENA_MUMMY, 'mummy', [
      { type: 'page', tx: 16 * 3 + 4, ty: 10, props: { page: 'frog' } },
    ]),
  },
  {
    id: 'night5',
    number: 5,
    title: 'NIGHT 5: THE STORM DRAIN',
    boss: 'gill',
    page: 'gill',
    song: 'night5',
    requiredKids: ['big', 'little'],
    source: night('night5', 'drain', [S.START, S.FLAT_DECO_A, S.FLAT_FROGS, S.GAP_WATER, S.LAMP, S.CRAWL, S.VENT_PAGE, S.FLAT_BATS, S.CRACKED, S.LAMP, S.GAP_WATER, S.FLAT_FROGS, S.STEPS, S.SECRET_ROOM, S.HEART, S.FLAT_DECO_B], S.ARENA_GILL, 'gill', [], { water: true }),
  },
];

/** The finale (#28): a single graveyard screen around the portal, four seals, 90 seconds. */
export const FINALE: LevelSource = {
  id: 'finale',
  theme: 'graveyard',
  rows: [
    '################################################',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#...---..........................---...........#',
    '#..............................................#',
    '#......---....................---..............#',
    '#..............................................#',
    '#.........---..............---..............#..#',
    '#...........................................#..#',
    '#.C.........P.........L.....g...O...........v..#',
    '################################################',
  ],
  objects: [
    { type: 'seal', tx: 1, ty: 6, props: { need: 'shot' } },
    { type: 'seal', tx: 38, ty: 13, props: { need: 'bomb' } },
    { type: 'seal', tx: 46, ty: 13, props: { need: 'vent' } },
    { type: 'seal', tx: 5, ty: 13, props: { need: 'crate' } },
  ],
  props: { finale: true, timer: 90 },
};

export const ALL_LEVELS: LevelSource[] = [...NIGHTS.map((n) => n.source), FINALE];
export const NIGHT_BY_ID: Record<string, NightDef> = Object.fromEntries(NIGHTS.map((n) => [n.id, n]));
