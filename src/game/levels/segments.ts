/**
 * Level segment library. Every segment is 15 rows tall; nights are built by
 * concatenating segments left-to-right (see nights.ts). Grammar is in tilemap.ts.
 */
export const ROWS = 15;

export type Seg = string[];

export function seg(rows: string[]): Seg {
  if (rows.length !== ROWS) throw new Error(`Segment must have ${ROWS} rows, got ${rows.length}`);
  const w = rows[0].length;
  for (const r of rows) if (r.length !== w) throw new Error(`Ragged segment row: '${r}' (${r.length} vs ${w})`);
  return rows;
}

/** Concatenate segments horizontally. */
export function cat(...segs: Seg[]): string[] {
  const out: string[] = [];
  for (let y = 0; y < ROWS; y++) out.push(segs.map((s) => s[y]).join(''));
  return out;
}

const E = '................';
const G = '################';

export const START = seg([E, E, E, E, E, E, E, E, E, E, E, E, '..P.........L...', G, G]);
export const FLAT = seg([E, E, E, E, E, E, E, E, E, E, E, E, E, G, G]);
export const FLAT_RATS = seg([E, E, E, E, E, E, E, E, E, E, E, E, '....r.....r.....', G, G]);
export const FLAT_BATS = seg([E, E, E, E, E, E, '...b........b...', E, E, E, E, E, E, G, G]);
export const FLAT_HANDS = seg([E, E, E, E, E, E, E, E, E, E, E, E, '...z..z...z..z..', G, G]);
export const FLAT_FROGS = seg([E, E, E, E, E, E, E, E, E, E, E, E, '.....f.......f..', G, G]);
export const LAMP = seg([E, E, E, E, E, E, E, E, E, E, E, E, '.......L........', G, G]);
export const HEART = seg([E, E, E, E, E, E, E, E, E, '.......---......', '................', '................', '........h.......', G, G]);
export const SILVER = seg([E, E, E, E, E, E, E, E, E, E, '....---.........', '........S.......', '..........---...', G, G]);

/** Pit with spikes; needs a running jump. */
export const GAP_SPIKES = seg([E, E, E, E, E, E, E, E, E, E, E, E, E, '######^^^#######', G]);
/** Wider pit over water (slow) with a frog. */
export const GAP_WATER = seg([E, E, E, E, E, E, E, E, E, E, E, '......---.......', '.........f......', '####~~~~~~~~####', '################']);
/** Stepped one-way platforms up and over a tall wall. */
export const STEPS = seg([E, E, E, E, '............---.', E, '.........---....', E, '......---.......', E, '...---..........', E, E, '############||##', G]);
/** A tall wall with a ladder, bats hovering, then down the other side. */
export const LADDER_WALL = seg([E, E, E, E, '......H.........', '......H###......', '......H###......', '......H###..b...', '......H###......', '......H###......', '......H###......', '......H###......', '......H###......', '################', G]);
/** Low ceiling crawl (crouch) with a rat inside. */
export const CRAWL = seg([E, E, E, E, E, E, E, E, E, E, E, '....##########..', '....##########..', '......r.........', G]);
/** Vent wall: only Pip passes. The page sits behind it. */
export const VENT_PAGE = seg([E, E, E, E, E, E, E, E, E, E, '.......#........', '.......#........', '.......#........', '.......v..M.....', G]);
/** Cracked wall: Bruno punches through. */
export const CRACKED = seg([E, E, E, E, E, E, E, E, E, '.......XX.......', '.......XX.......', '.......XX.......', '.......XX.......', '.......XX.......', G]);
/** Crate puzzle: push the crate under the ledge to reach the high platform. */
export const CRATE_LEDGE = seg([E, E, E, E, E, E, E, E, E, E, E, '..........######', '...C......#.....', '..........#.....', G]);
/** Pip's double-jump bonus: silver on a high ledge; others use the crate below. */
export const HIGH_SILVER = seg([E, E, E, E, E, E, E, E, E, '.........S......', '........---.....', E, '.....C..........', G, G]);
/** Secret room (#32): hidden bonus page / silver above a vent. */
export const SECRET_ROOM = seg([E, E, '..############..', '..#..........#..', '..#.S......S.#..', '..#..........#..', '..###v####v###..', E, '.........---....', E, '...---..........', E, E, G, G]);
export const EXIT = seg([E, E, E, E, E, E, E, E, E, E, E, E, '........E.......', G, G]);
export const FLAT_DECO_A = seg([E, E, E, E, E, E, E, E, E, E, E, E, '..,....;.....".,', G, G]);
export const FLAT_DECO_B = seg([E, E, E, E, E, E, E, E, E, E, E, E, '.".,.....;...,..', G, G]);
export const PILLARS = seg([E, E, E, E, E, E, E, E, E, '....||....||....', '....||....||....', '....||....||....', '....||....||....', G, G]);

/* ---------- boss arenas: 16 wide, floor at row 13, walls at the edges ---------- */
export const ARENA_VAMPIRE = seg([
  '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#....---.---...#', '#..............#', '#..............#', '#..---.....---.#', '#..............#', '..........B.....', '................', G, G,
]);
export const ARENA_GIANT = seg([
  '#..............#', '#..T.....T...T.#', '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#..---.....---.#', '#..............#', '...........B....', '................', G, G,
]);
export const ARENA_WOLF = seg([
  '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#.---......---.#', '#..............#', '#..............#', '...........B....', '................', G, G,
]);
export const ARENA_MUMMY = seg([
  '#..............#', '#..W....W....W.#', '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#.---......---.#', '#..............#', '#..............#', '...........B....', '................', G, G,
]);
export const ARENA_GILL = seg([
  '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#..............#', '#---........---#', '#..............#', '#..............#', '#.........B....#', '#~~~~~~~~~~~~~~#', '.~~~~~~~~~~~~~~.', '.~~~~~~~~~~~~~G.', G, G,
]);
/** After an arena: a short corridor to the exit. */
export const ARENA_EXIT = seg([E, E, E, E, E, E, E, E, E, E, E, E, '.......L..E.....', G, G]);
