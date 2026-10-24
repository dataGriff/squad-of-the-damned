import type { Sprite } from '../../engine/sprites';
import { registeredSprites } from './registry';

/** Every sprite in the game (from the art registry, #63), for the palette and colour-blind checks. */
export function allSprites(): Sprite[] {
  return registeredSprites();
}
