import { describe, expect, it } from 'vitest';
import { TileMap, levelToTiled, coreTileset } from '../src/engine/tilemap';

const SRC = {
  id: 't',
  theme: 'suburb',
  rows: ['..........', '....-.....', '..P..H..M.', '....#H....', '##########'],
};

describe('Tiled JSON loader (#3)', () => {
  it('exports string rows to a valid Tiled map and loads kinds back', () => {
    const json = levelToTiled(SRC);
    expect(json.width).toBe(10);
    expect(json.height).toBe(5);
    expect(json.tilesets[0].tiles?.length).toBe(coreTileset().tilecount);
    const map = new TileMap(json);
    expect(map.kindAt(0, 4)).toBe('solid');
    expect(map.kindAt(4, 1)).toBe('oneway');
    expect(map.kindAt(5, 2)).toBe('ladder');
    expect(map.kindAt(0, 0)).toBe('empty');
    expect(map.theme).toBe('suburb');
  });
  it('picks a ground-top tile for solids with air above and fill otherwise', () => {
    const json = levelToTiled({ id: 'g', theme: 'suburb', rows: ['....', '####', '####'] });
    const map = new TileMap(json);
    expect(map.gidAt(0, 1)).toBe(1);
    expect(map.gidAt(0, 2)).toBe(2);
  });
  it('turns object characters into objects aligned to the tile bottom', () => {
    const map = new TileMap(levelToTiled(SRC));
    const p = map.objectsOfType('player')[0];
    expect(p).toBeTruthy();
    expect(p.y + p.h).toBe(3 * 16);
    expect(map.objectsOfType('page').length).toBe(1);
  });
  it('treats the sides as solid and above/below as empty', () => {
    const map = new TileMap(levelToTiled(SRC));
    expect(map.kindAt(-1, 0)).toBe('solid');
    expect(map.kindAt(0, -5)).toBe('empty');
  });
  it('rejects unknown characters', () => {
    expect(() => levelToTiled({ id: 'bad', theme: 'suburb', rows: ['?'] })).toThrow(/Unknown level char/);
  });
  it('lets cracked walls be broken with setTile', () => {
    const map = new TileMap(levelToTiled({ id: 'c', theme: 'suburb', rows: ['X.', '##'] }));
    expect(map.kindAt(0, 0)).toBe('cracked');
    map.setTile(0, 0, 0);
    expect(map.kindAt(0, 0)).toBe('empty');
  });
});
