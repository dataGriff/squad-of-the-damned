import type { Sprite } from '../../engine/sprites';
import { allKidSprites } from './kids';
import { allMonsterSprites } from './monsters';
import { allItemSprites } from './items';
import { allTileSprites } from './tiles';
import { allBackdropSprites } from './backdrops';
import { allScenerySprites } from './scenery';
import { GLINT } from '../effects';

/** Every sprite in the game, for the palette and colour-blind checks. */
export function allSprites(): Sprite[] {
  return [...allKidSprites(), ...allMonsterSprites(), ...allItemSprites(), ...allTileSprites(), ...allBackdropSprites(), ...allScenerySprites(), ...GLINT.frames];
}
