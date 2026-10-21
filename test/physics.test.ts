import { describe, expect, it } from 'vitest';
import { TileMap, levelToTiled } from '../src/engine/tilemap';
import { applyGravity, makeBody, stepBody } from '../src/engine/physics';

function map(rows: string[]): TileMap {
  return new TileMap(levelToTiled({ id: 'p', theme: 'suburb', rows }));
}
const DT = 1 / 60;

describe('tile physics (#8, #11, #12, #18)', () => {
  it('lands on solid ground', () => {
    const m = map(['....', '....', '....', '####']);
    const b = makeBody(8, 0, 8, 16);
    for (let i = 0; i < 120; i++) {
      applyGravity(b, DT);
      stepBody(b, m, DT);
    }
    expect(b.onGround).toBe(true);
    expect(b.y + b.h).toBe(48);
  });
  it('stops at walls and reports hitWall', () => {
    const m = map(['...#', '...#', '####']);
    const b = makeBody(36, 16, 8, 16);
    b.vx = 500;
    stepBody(b, m, DT);
    expect(b.hitWall).toBe(1);
    expect(b.x + b.w).toBeLessThanOrEqual(48);
  });
  it('passes through one-way platforms from below but lands from above', () => {
    const m = map(['....', '....', '.--.', '....', '####']);
    const up = makeBody(16, 50, 8, 10);
    up.vy = -300;
    stepBody(up, m, DT);
    expect(up.hitCeiling).toBe(false);
    const down = makeBody(16, 20, 8, 10);
    down.vy = 200;
    stepBody(down, m, DT);
    expect(down.onGround).toBe(true);
    expect(down.y + down.h).toBe(32);
  });
  it('drops through a one-way platform when dropThrough is set', () => {
    const m = map(['....', '.--.', '....', '####']);
    const b = makeBody(16, 6, 8, 10);
    b.dropThrough = true;
    b.vy = 100;
    stepBody(b, m, DT);
    expect(b.onGround).toBe(false);
  });
  it('vent tiles are solid for big kids and open for small ones', () => {
    const m = map(['..v.', '####']);
    const big = makeBody(20, 0, 8, 16);
    big.vx = 600;
    stepBody(big, m, DT);
    expect(big.hitWall).toBe(1);
    const small = makeBody(20, 2, 8, 12);
    small.small = true;
    small.vx = 600;
    stepBody(small, m, DT);
    expect(small.hitWall).toBe(0);
  });
  it('a crouched (14px) body fits a 1-tile gap that a standing (22px) body cannot', () => {
    const m = map(['....', '.###', '....', '####']);
    const standing = makeBody(0, 42 - 22, 8, 22);
    standing.vx = 600;
    stepBody(standing, m, DT);
    expect(standing.hitWall).toBe(1);
    const crouched = makeBody(0, 48 - 14, 8, 14);
    crouched.vx = 600;
    stepBody(crouched, m, DT);
    expect(crouched.hitWall).toBe(0);
  });
});
