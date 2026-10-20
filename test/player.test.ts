import { describe, expect, it } from 'vitest';
import { TileMap, levelToTiled } from '../src/engine/tilemap';
import { Camera } from '../src/engine/camera';
import { Particles } from '../src/engine/particles';
import { InputState, type Action } from '../src/engine/input';
import { SaveStore } from '../src/engine/save';
import { World } from '../src/game/world';
import { Player } from '../src/game/player';
import { Squad, KIDS, type KidId } from '../src/game/squad';
import { Crate, spawnObject } from '../src/game/objects';
import { TILE } from '../src/engine/constants';

const DT = 1 / 60;

/** Build a world from string rows with the real Player standing at the 'P' marker. */
function setup(rows: string[], kid: KidId = 'sling') {
  const map = new TileMap(levelToTiled({ id: 't', theme: 'suburb', rows }));
  const input = new InputState();
  const keys = input.addSource();
  const squad = new Squad(['sling', 'garlic', 'big', 'little'], 5, kid);
  const events = { onPlayerDeath() {}, onLevelComplete() {}, onBossDefeated() {}, onPage() {}, onCheckpoint() {}, onSeal() {} };
  const world = new World(map, new Camera(), new Particles(), squad, new SaveStore(null), input, events, 't');
  const start = map.objectsOfType('player')[0];
  const player = new Player(start.x, start.y + start.h, KIDS[kid]);
  player.worldRef = world;
  world.player = player;
  world.add(player);
  for (const o of map.objects) {
    const e = spawnObject(o, 'vampire');
    if (e) world.add(e);
  }
  const tick = (held: Action[] = [], n = 1) => {
    for (let i = 0; i < n; i++) {
      keys.clear();
      held.forEach((a) => keys.add(a));
      input.tick();
      world.update(DT);
    }
  };
  // settle on the ground
  tick([], 30);
  return { map, world, player, squad, tick, keys, input };
}

describe('Player (#8, #11, #12, #17, #18)', () => {
  it('walks right and is stopped by walls', () => {
    const { player, tick } = setup(['........', '........', 'P.....#.', '########']);
    tick(['right'], 90);
    expect(player.x + player.w).toBeLessThanOrEqual(6 * TILE);
    expect(player.x + player.w).toBeGreaterThan(5 * TILE);
  });

  it('jumps about 2.6 tiles and short-hops when the button is released early', () => {
    const full = setup(['........', '........', '........', '........', '........', 'P.......', '########']);
    let top = full.player.y;
    full.tick(['jump'], 1);
    for (let i = 0; i < 40; i++) {
      full.tick(['jump']);
      top = Math.min(top, full.player.y);
    }
    const fullHeight = full.player.y + full.player.h - (top + full.player.h);
    const start = 6 * TILE;
    expect(start - (top + full.player.h)).toBeGreaterThan(36);
    expect(start - (top + full.player.h)).toBeLessThan(48);

    const hop = setup(['........', '........', '........', '........', '........', 'P.......', '########']);
    hop.tick(['jump'], 2);
    let hopTop = hop.player.y;
    for (let i = 0; i < 40; i++) {
      hop.tick([]);
      hopTop = Math.min(hopTop, hop.player.y);
    }
    expect(start - (hopTop + hop.player.h)).toBeLessThan(fullHeight);
  });

  it('coyote time lets you jump a few frames after walking off a ledge', () => {
    const { player, tick } = setup(['........', '........', '........', '.P......', '.##.....', '........', '........', '########']);
    for (let i = 0; i < 120 && player.onGround; i++) tick(['right']); // walk off the ledge
    expect(player.onGround).toBe(false);
    tick(['right'], 3); // inside the coyote window
    tick(['right', 'jump'], 1);
    expect(player.vy).toBeLessThan(0);
    // and too late is too late
    const late = setup(['........', '........', '........', '.P......', '.##.....', '........', '........', '########']);
    for (let i = 0; i < 120 && late.player.onGround; i++) late.tick(['right']);
    late.tick(['right'], 12);
    late.tick(['right', 'jump'], 1);
    expect(late.player.vy).toBeGreaterThan(0);
  });

  it('climbs a ladder and stands on its top', () => {
    const { player, tick } = setup(['........', '..H.....', '..H.....', '..H.....', 'P.H.....', '########']);
    for (let i = 0; i < 120 && player.centerX < 40; i++) tick(['right']); // walk onto the ladder column
    tick(['up'], 120);
    expect(player.climbing || player.onGround).toBe(true);
    expect(player.y + player.h).toBeLessThanOrEqual(2 * TILE);
  });

  it('crouches under a one-tile ceiling and cannot stand back up inside it', () => {
    const { player, tick } = setup(['........', '........', '........', '....####', 'P.......', '########']);
    tick(['right'], 10);
    tick(['down'], 5);
    expect(player.crouching).toBe(true);
    tick(['down', 'right'], 90);
    expect(player.x).toBeGreaterThan(4 * TILE);
    tick([], 5); // release down while under the ceiling
    expect(player.crouching).toBe(true);
  });

  it('only Pip passes vents; swapping to a kid who would not fit is skipped', () => {
    const big = setup(['........', '........', '....#...', '....#...', 'P...v...', '########'], 'big');
    big.tick(['right'], 90);
    expect(big.player.x + big.player.w).toBeLessThanOrEqual(4 * TILE + 0.01);
    const pip = setup(['............', '............', '....#.......', '....#.......', 'P...v.......', '############'], 'little');
    for (let i = 0; i < 120 && pip.player.centerX < 72; i++) pip.tick(['right']); // stop inside the vent
    expect(pip.player.x).toBeGreaterThan(4 * TILE);
    expect(pip.player.x + pip.player.w).toBeLessThan(5 * TILE);
    // inside the vent nobody else fits, so a swap press keeps Pip
    pip.tick([], 10);
    pip.tick(['swap'], 1);
    expect(pip.squad.active).toBe('little');
    pip.tick(['right'], 30);
    pip.tick([], 10);
    pip.tick(['swap'], 1);
    expect(pip.squad.active).toBe('sling'); // out in the open the next kid fits again
  });

  it('only Bruno pushes crates', () => {
    const casey = setup(['........', '........', '........', 'P.C.....', '########']);
    const crate0 = casey.world.find<Crate>('crate')!;
    casey.tick(['right'], 60);
    expect(crate0.x).toBe(2 * TILE);
    expect(casey.player.x + casey.player.w).toBeLessThanOrEqual(2 * TILE + 0.5);
    const bruno = setup(['........', '........', '........', 'P.C.....', '########'], 'big');
    const crate1 = bruno.world.find<Crate>('crate')!;
    bruno.tick(['right'], 90);
    expect(crate1.x).toBeGreaterThan(2 * TILE + 20);
  });

  it('Bruno punches through cracked walls; Casey cannot', () => {
    const bruno = setup(['........', '........', '...X....', '...X....', 'P..X....', '########'], 'big');
    bruno.tick(['right'], 40);
    bruno.tick(['action'], 1);
    bruno.tick([], 5);
    expect(bruno.map.kindAt(3, 4)).toBe('empty');
    expect(bruno.map.kindAt(3, 3)).toBe('empty');
    const casey = setup(['........', '........', '...X....', '...X....', 'P..X....', '########']);
    casey.tick(['right'], 40);
    casey.tick(['action'], 1);
    casey.tick([], 5);
    expect(casey.map.kindAt(3, 4)).toBe('cracked');
  });

  it('Pip double-jumps', () => {
    const pip = setup(['........', '........', '........', '........', '........', '........', 'P.......', '########'], 'little');
    pip.tick(['jump'], 8);
    pip.tick([], 10);
    const before = pip.player.vy;
    expect(before).toBeGreaterThan(-200);
    pip.tick(['jump'], 1);
    expect(pip.player.vy).toBeLessThan(before);
  });

  it('drops through a one-way platform with down + jump', () => {
    const { player, tick } = setup(['........', 'P.......', '---.....', '........', '........', '########']);
    expect(player.y + player.h).toBe(2 * TILE);
    tick(['down', 'jump'], 1);
    tick([], 20);
    expect(player.y + player.h).toBeGreaterThan(2 * TILE + 8);
  });

  it('takes damage with knockback and i-frames, sharing the squad HP pool', () => {
    const { player, squad, world, tick } = setup(['........', '........', '........', 'P.......', '########']);
    expect(squad.hp).toBe(6);
    player.hurt(world, player.centerX + 20);
    expect(squad.hp).toBe(5);
    expect(player.vx).toBeLessThan(0);
    expect(player.invuln).toBeGreaterThan(0);
    player.hurt(world, player.centerX + 20);
    expect(squad.hp).toBe(5); // invulnerable
    tick([], 80);
    player.hurt(world, player.centerX + 20);
    expect(squad.hp).toBe(4);
  });
});
