/** Export every level source to Tiled JSON (#3). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { levelToTiled } from '../src/engine/tilemap';
import { ALL_LEVELS } from '../src/game/levels/nights';

const outDir = join(process.cwd(), 'src/game/levels/json');
mkdirSync(outDir, { recursive: true });
for (const src of ALL_LEVELS) {
  const map = levelToTiled(src);
  writeFileSync(join(outDir, `${src.id}.json`), JSON.stringify(map));
  console.log(`${src.id}: ${map.width}×${map.height} tiles, ${map.layers[1].objects?.length ?? 0} objects`);
}
