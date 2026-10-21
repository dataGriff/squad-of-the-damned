import { describe, expect, it } from 'vitest';
import { TileMap, levelToTiled } from '../src/engine/tilemap';
import { ALL_LEVELS, FINALE, NIGHTS } from '../src/game/levels/nights';
import { LEVEL_JSON } from '../src/game/levels';

/** What in a map proves a kid is required (#19). */
function kidsRequiredBy(map: TileMap, boss: string): Set<string> {
  const req = new Set<string>();
  let vent = false, cracked = false;
  for (const k of map.kinds) {
    if (k === 'vent') vent = true;
    if (k === 'cracked') cracked = true;
  }
  if (vent) req.add('little');
  if (cracked) req.add('big');
  if (map.objectsOfType('lantern').length || map.objectsOfType('valve').length) req.add('sling');
  if (map.objectsOfType('sluice').length || map.objectsOfType('crate').length) req.add('big');
  if (boss === 'vampire') req.add('garlic');
  if (boss === 'wolfman') req.add('sling');
  for (const s of map.objectsOfType('seal')) {
    const need = String(s.props.need);
    req.add(need === 'shot' ? 'sling' : need === 'bomb' ? 'garlic' : need === 'crate' ? 'big' : 'little');
  }
  return req;
}

describe('Nights (#19, #29, #31)', () => {
  it('every night needs at least two kids and declares them honestly', () => {
    for (const n of NIGHTS) {
      const map = new TileMap(levelToTiled(n.source));
      const req = kidsRequiredBy(map, n.boss);
      expect(req.size, n.id).toBeGreaterThanOrEqual(2);
      for (const k of n.requiredKids) expect(req.has(k), `${n.id} claims ${k}`).toBe(true);
    }
  });
  it('every night has a start, lamps, its own manual page, an arena with a boss, and an exit', () => {
    for (const n of NIGHTS) {
      const map = new TileMap(levelToTiled(n.source));
      expect(map.objectsOfType('player').length).toBe(1);
      expect(map.objectsOfType('lamp').length).toBeGreaterThanOrEqual(2);
      expect(map.objectsOfType('exit').length).toBe(1);
      const arena = map.objectsOfType('arena')[0];
      expect(arena.props.boss).toBe(n.boss);
      expect(map.objectsOfType('boss').length).toBe(1);
      // the boss page is on the main path: a plain 'page' object with no override, or an explicit one
      const pages = map.objectsOfType('page').map((p) => String(p.props.page ?? n.page));
      expect(pages).toContain(n.page);
    }
  });
  it('the finale needs all four kids', () => {
    const map = new TileMap(levelToTiled(FINALE));
    expect(kidsRequiredBy(map, 'none').size).toBe(4);
    expect(map.objectsOfType('portal').length).toBe(1);
    expect(map.props.timer).toBe(90);
  });
  it('the committed JSON matches the sources (run npm run export:levels)', () => {
    for (const src of ALL_LEVELS) {
      expect(JSON.stringify(LEVEL_JSON[src.id])).toBe(JSON.stringify(levelToTiled(src)));
    }
  });
});
