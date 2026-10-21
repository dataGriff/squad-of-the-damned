import { allSprites } from '../src/game/art';
import { checkSprites, checkPalette } from '../src/game/paletteCheck';
import { KIDS } from '../src/game/squad';
import { BOSS_PALETTES, BAT_PAL, RAT_PAL, HAND_PAL, FROG_PAL } from '../src/game/art/monsters';
import { THEMES } from '../src/game/art/tiles';

const sprites = allSprites();
const violations = checkSprites(sprites);
for (const k of Object.values(KIDS)) violations.push(...checkPalette(k.palette, `kid:${k.id}`));
for (const [n, p] of Object.entries(BOSS_PALETTES)) violations.push(...checkPalette(p, `boss:${n}`));
for (const [n, p] of Object.entries({ BAT_PAL, RAT_PAL, HAND_PAL, FROG_PAL })) violations.push(...checkPalette(p, n));
for (const [n, t] of Object.entries(THEMES)) {
  violations.push(...checkPalette(t.tiles, `theme:${n}:tiles`), ...checkPalette(t.deco, `theme:${n}:deco`));
}
if (violations.length) {
  console.error(`Palette check FAILED (${violations.length} problems):`);
  for (const v of violations) console.error(`  ${v.sprite}: ${v.reason}`);
  process.exit(1);
}
console.log(`Palette check OK: ${sprites.length} sprites, all ≤4 colours from the master palette.`);
