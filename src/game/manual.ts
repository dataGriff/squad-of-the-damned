/**
 * Monster manual (#34, #36). Each page describes a creature, its lore and its
 * weakness. A weakness only *works* once the page has been found: the
 * `weaknessMultiplier` helper is the single place that rule lives.
 */
export type Weakness = 'garlic' | 'fire' | 'silver' | 'water' | 'drain' | 'none';

export interface ManualPage {
  id: string;
  creature: string;
  night: number | null;
  lore: string[];
  weakness: Weakness;
  weaknessText: string;
  hint: string;
  /** Sprite key for the hint art. */
  art: string;
  boss: boolean;
}

export const MANUAL_PAGES: ManualPage[] = [
  {
    id: 'vampire',
    creature: 'THE COUNT',
    night: 1,
    lore: ['CAME WITH THE NEW', 'FAMILY ON ELM ST.', 'NEVER SEEN BY DAY.'],
    weakness: 'garlic',
    weaknessText: 'GARLIC. HE CANNOT', // continued in hint
    hint: 'STAND THE SMELL. STUN HIM THEN HIT HARD.',
    art: 'vampire',
    boss: true,
  },
  {
    id: 'giant',
    creature: 'THE STITCHED GIANT',
    night: 2,
    lore: ['BUILT FROM SPARE', 'PARTS. NOT EVIL,', 'JUST VERY LOST.'],
    weakness: 'fire',
    weaknessText: 'FIRE. HE FEARS THE',
    hint: 'LANTERNS. SHOOT ONE DOWN ONTO HIM.',
    art: 'giant',
    boss: true,
  },
  {
    id: 'wolfman',
    creature: 'THE WOLFMAN',
    night: 3,
    lore: ['MR GREY THE', 'POSTMAN. ONLY ON', 'FULL MOONS.'],
    weakness: 'silver',
    weaknessText: 'SILVER. PEBBLES',
    hint: 'JUST ANNOY HIM. LOAD THE SILVER SHOT.',
    art: 'wolfman',
    boss: true,
  },
  {
    id: 'mummy',
    creature: 'THE MUMMY',
    night: 4,
    lore: ['ESCAPED THE', 'MUSEUM GIFT SHOP.', 'VERY DRY.'],
    weakness: 'water',
    weaknessText: 'WATER. SHOOT THE',
    hint: 'VALVES. WET BANDAGES FALL APART.',
    art: 'mummy',
    boss: true,
  },
  {
    id: 'gill',
    creature: 'THE GILL CREATURE',
    night: 5,
    lore: ['LIVES IN THE STORM', 'DRAIN. HATES', 'THE DRY SEASON.'],
    weakness: 'drain',
    weaknessText: 'DRAIN THE WATER.',
    hint: 'BRUNO CAN BREAK THE SLUICE GATE.',
    art: 'gill',
    boss: true,
  },
  {
    id: 'bat',
    creature: 'BATS',
    night: null,
    lore: ['NOT ALL OF THEM', 'ARE THE COUNT.', 'MOST ARE JUST BATS.'],
    weakness: 'none',
    weaknessText: 'ANYTHING. THEY',
    hint: 'ONLY HAVE ONE HIT POINT.',
    art: 'bat',
    boss: false,
  },
  {
    id: 'hand',
    creature: 'ZOMBIE HANDS',
    night: null,
    lore: ['THE REST OF THE', 'ZOMBIE IS STILL', 'DOWN THERE.'],
    weakness: 'none',
    weaknessText: 'JUMP OVER THEM.',
    hint: 'THEY ONLY GRAB WHEN YOU ARE CLOSE.',
    art: 'hand',
    boss: false,
  },
  {
    id: 'frog',
    creature: 'BOG FROGS',
    night: null,
    lore: ['THE STORM DRAIN', 'CHANGED THEM.', 'DO NOT LICK.'],
    weakness: 'none',
    weaknessText: 'HIT THEM MID-HOP.',
    hint: 'THEY CANNOT TURN IN THE AIR.',
    art: 'frog',
    boss: false,
  },
];

export const PAGE_BY_ID: Record<string, ManualPage> = Object.fromEntries(MANUAL_PAGES.map((p) => [p.id, p]));

/**
 * Knowledge as progression (#36): damage from a creature's weakness counts only
 * when its page has been collected. Returns the damage multiplier for a hit of
 * `kind` against the creature identified by `pageId`.
 */
export function weaknessMultiplier(pageId: string, kind: Weakness, hasPage: (id: string) => boolean): number {
  const page = PAGE_BY_ID[pageId];
  if (!page || page.weakness === 'none') return 1;
  if (kind !== page.weakness) return 0; // bosses only take weakness damage
  return hasPage(pageId) ? 1 : 0;
}

export function pagesFound(found: string[]): { found: number; total: number } {
  return { found: MANUAL_PAGES.filter((p) => found.includes(p.id)).length, total: MANUAL_PAGES.length };
}
