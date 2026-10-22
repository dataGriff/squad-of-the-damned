/**
 * Colour-blind safe palette check (#47) over the art registry (#63): every
 * palette that art the player has to read is drawn in (gameplay sprites,
 * portraits, HUD icons) must keep its colours apart under protanopia,
 * deuteranopia and tritanopia. See src/game/design/vision.ts for the rule.
 *
 * Scenery (backdrops, landmarks, props, tiles) is exempt on purpose: it is
 * shaded with neighbouring colours and dithered gradients, and the
 * readability check (#64) keeps it from competing with gameplay instead.
 */
import { checkPaletteCB } from '../src/game/design/vision';
import { GAMEPLAY_CATEGORIES, registeredPalettes, type ArtCategory } from '../src/game/art/registry';

const READ: ArtCategory[] = [...GAMEPLAY_CATEGORIES, 'portrait', 'icon'];
const palettes = registeredPalettes()
  .map(({ pal, entries }) => ({ pal, entries: entries.filter((e) => READ.includes(e.category)) }))
  .filter((p) => p.entries.length);
const all = [...new Set(palettes.flatMap(({ pal, entries }) => checkPaletteCB(entries.map((e) => e.id).join(' + '), pal)))];
if (all.length) {
  console.error(`Colour-blind check FAILED (${all.length}):`);
  for (const p of all) console.error('  ' + p);
  process.exit(1);
}
console.log(`Colour-blind check OK: ${palettes.length} palettes used by gameplay, portrait and icon art stay distinguishable under protanopia, deuteranopia and tritanopia.`);
