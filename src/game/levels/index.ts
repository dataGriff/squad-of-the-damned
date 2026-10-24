import type { TiledMap } from '../../engine/tilemap';
import night1 from './json/night1.json';
import night2 from './json/night2.json';
import night3 from './json/night3.json';
import night4 from './json/night4.json';
import night5 from './json/night5.json';
import finale from './json/finale.json';

export const LEVEL_JSON: Record<string, TiledMap> = {
  night1: night1 as unknown as TiledMap,
  night2: night2 as unknown as TiledMap,
  night3: night3 as unknown as TiledMap,
  night4: night4 as unknown as TiledMap,
  night5: night5 as unknown as TiledMap,
  finale: finale as unknown as TiledMap,
};
