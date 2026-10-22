import { describe, expect, it } from 'vitest';
import { TileMap, levelToTiled } from '../src/engine/tilemap';
import { NIGHTS } from '../src/game/levels/nights';
import { placeProps } from '../src/game/dressing';
import type { Theme } from '../src/game/art/tiles';
import { TILE } from '../src/engine/constants';

describe('Foreground dressing (#55)', () => {
  for (const n of NIGHTS) {
    const map = new TileMap(levelToTiled(n.source));
    const props = placeProps(map, map.theme as Theme);
    it(`${n.id}: places a stable set of props`, () => {
      expect(props.length).toBeGreaterThan(5);
      expect(placeProps(map, map.theme as Theme)).toEqual(props);
    });
    it(`${n.id}: props stand on solid floor with clear air above`, () => {
      for (const p of props) {
        const tx = Math.floor((p.x + p.prop.sprite.w / 2) / TILE);
        const ty = Math.floor((p.y + p.prop.sprite.h) / TILE);
        expect(map.kindAt(tx, ty)).toBe('solid');
        expect(map.kindAt(tx, ty - 1)).toBe('empty');
      }
    });
    it(`${n.id}: props never cover objects, hazards or the boss arena`, () => {
      const arena = map.objectsOfType('arena')[0];
      for (const p of props) {
        const r = { x: p.x, y: p.y, w: p.prop.sprite.w, h: p.prop.sprite.h };
        expect(r.x + r.w <= arena.x || r.x >= arena.x + arena.w).toBe(true);
        for (const o of map.objects) {
          if (o.type === 'arena') continue;
          const overlap = r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y;
          expect(overlap, `${o.type} at ${o.x},${o.y}`).toBe(false);
        }
        const tx = Math.floor((p.x + p.prop.sprite.w / 2) / TILE);
        const ty = Math.floor((p.y + p.prop.sprite.h) / TILE);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -2; dy <= 0; dy++) expect(['spike', 'vent', 'cracked', 'ladder', 'water']).not.toContain(map.kindAt(tx + dx, ty + dy));
      }
    });
  }
});
