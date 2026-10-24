/**
 * Prop placement (#55). Pure and seeded, so a night always looks the same and
 * tests can check the rules: props stand on solid ground with clear air above,
 * never next to hazards, ladders, water or vents, never near an object (spawn,
 * pickup, enemy, lamp, exit, crate...) and never inside a boss arena.
 */
import { TILE } from '../engine/constants';
import { hash2 } from '../engine/pixelart';
import type { TileMap } from '../engine/tilemap';
import { PROPS, type Prop } from './art/props';
import type { Theme } from './art/tiles';

export interface PlacedProp {
  x: number;
  y: number;
  prop: Prop;
}

const AVOID = new Set(['spike', 'vent', 'cracked', 'ladder', 'water', 'oneway']);

function seedOf(id: string): number {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

export function placeProps(map: TileMap, theme: Theme, density = 0.14): PlacedProp[] {
  const props = PROPS[theme];
  if (!props.length) return [];
  const seed = seedOf(String(map.props.id ?? theme));
  const arenas = map.objectsOfType('arena');
  const blockers = map.objects.filter((o) => o.type !== 'arena');
  const out: PlacedProp[] = [];
  let lastTx = -10;
  for (let tx = 1; tx < map.width - 1; tx++) {
    for (let ty = 2; ty < map.height; ty++) {
      if (map.kindAt(tx, ty) !== 'solid' || map.kindAt(tx, ty - 1) !== 'empty') continue;
      if (map.gidAt(tx, ty - 1) !== 0) continue; // a decoration tile is already there
      if (tx - lastTx < 3) continue;
      if (hash2(tx, ty, seed) > density) continue;
      // standing on a run of floor, not the lip of a ledge
      if (map.kindAt(tx - 1, ty) !== 'solid' || map.kindAt(tx + 1, ty) !== 'solid') continue;
      // nothing hazardous or interactive beside or above
      let bad = false;
      for (let dx = -1; dx <= 1 && !bad; dx++) for (let dy = -3; dy <= 0 && !bad; dy++) if (AVOID.has(map.kindAt(tx + dx, ty + dy))) bad = true;
      if (bad) continue;
      const px = tx * TILE;
      const py = ty * TILE;
      if (arenas.some((a) => px + TILE > a.x && px < a.x + a.w)) continue;
      if (blockers.some((o) => px - TILE < o.x + o.w && px + 2 * TILE > o.x && py - 3 * TILE < o.y + o.h && py > o.y)) continue;
      const prop = props[Math.floor(hash2(tx, ty, seed + 1) * props.length)];
      // tall props need two clear tiles of headroom
      if (prop.sprite.h > TILE && map.kindAt(tx, ty - 2) !== 'empty') continue;
      out.push({ x: px + Math.floor((TILE - prop.sprite.w) / 2), y: py - prop.sprite.h, prop });
      lastTx = tx;
    }
  }
  return out;
}
