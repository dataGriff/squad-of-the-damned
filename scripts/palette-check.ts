/**
 * Palette constraint (#37) over the art registry (#63): every sprite uses at
 * most 4 indices, and every palette any sprite is drawn in comes from the
 * NES master palette.
 */
import { checkSprites, checkPalette } from '../src/game/paletteCheck';
import { artRegistry, registeredPalettes, registeredSprites } from '../src/game/art/registry';

const sprites = registeredSprites();
const palettes = registeredPalettes();
const violations = checkSprites(sprites);
for (const { pal, entries } of palettes) violations.push(...checkPalette(pal, entries[0].id));
if (violations.length) {
  console.error(`Palette check FAILED (${violations.length} problems):`);
  for (const v of violations) console.error(`  ${v.sprite}: ${v.reason}`);
  process.exit(1);
}
console.log(`Palette check OK: ${sprites.length} sprites in ${artRegistry().length} registry entries, ${palettes.length} palettes, all ≤4 colours from the master palette.`);
