import { TILE } from './constants';
import type { TileMap } from './tilemap';

/** Tuning constants shared by player and enemies. Units: px/s, px/s². */
export const GRAVITY = 900;
export const MAX_FALL = 260;

export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  /** Set when the body hit a wall this tick (-1 left, 1 right, 0 none). */
  hitWall: number;
  hitCeiling: boolean;
  /** Small bodies pass through vent tiles. */
  small?: boolean;
  /** When true, one-way platforms are ignored this tick (drop-through). */
  dropThrough?: boolean;
  /** When true, ignore all tile collision (ladders, bats). */
  ghost?: boolean;
  /** Previous position for render interpolation. */
  px: number;
  py: number;
}

export function makeBody(x: number, y: number, w: number, h: number): Body {
  return { x, y, w, h, vx: 0, vy: 0, onGround: false, hitWall: 0, hitCeiling: false, px: x, py: y };
}

export function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** True when a one-way platform top lies in (yFrom, yTo] for the body's bottom edge. */
function onewayBelow(map: TileMap, x: number, w: number, yFrom: number, yTo: number): number | null {
  const x0 = Math.floor(x / TILE);
  const x1 = Math.floor((x + w - 0.001) / TILE);
  const ty0 = Math.floor(yFrom / TILE);
  const ty1 = Math.floor(yTo / TILE);
  for (let ty = ty0; ty <= ty1; ty++) {
    const top = ty * TILE;
    if (top < yFrom || top > yTo) continue;
    for (let tx = x0; tx <= x1; tx++) if (map.kindAt(tx, ty) === 'oneway') return top;
  }
  return null;
}

/**
 * Move a body by its velocity over `dt`, resolving X then Y against solid tiles
 * and one-way platforms. Sets onGround / hitWall / hitCeiling.
 */
export function stepBody(b: Body, map: TileMap, dt: number): void {
  b.px = b.x;
  b.py = b.y;
  b.hitWall = 0;
  b.hitCeiling = false;
  const small = !!b.small;
  if (b.ghost) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.onGround = false;
    return;
  }
  // X axis
  const dx = b.vx * dt;
  if (dx !== 0) {
    const nx = b.x + dx;
    if (map.rectSolid(nx, b.y, b.w, b.h, small)) {
      const dir = Math.sign(dx);
      if (dir > 0) b.x = Math.floor((nx + b.w) / TILE) * TILE - b.w - 0.001;
      else b.x = Math.floor(nx / TILE + 1) * TILE;
      // still stuck (started inside a tile) → stay put rather than fly off
      if (map.rectSolid(b.x, b.y, b.w, b.h, small)) b.x = b.px;
      b.vx = 0;
      b.hitWall = dir;
    } else b.x = nx;
  }
  // Y axis
  const dy = b.vy * dt;
  const prevBottom = b.y + b.h;
  b.onGround = false;
  const ny = b.y + dy;
  if (dy > 0) {
    if (map.rectSolid(b.x, ny, b.w, b.h, small)) {
      b.y = Math.floor((ny + b.h) / TILE) * TILE - b.h;
      b.vy = 0;
      b.onGround = true;
    } else {
      b.y = ny;
      if (!b.dropThrough) {
        const top = onewayBelow(map, b.x, b.w, prevBottom, ny + b.h);
        if (top !== null) {
          b.y = top - b.h;
          b.vy = 0;
          b.onGround = true;
        }
      }
    }
  } else if (dy < 0) {
    if (map.rectSolid(b.x, ny, b.w, b.h, small)) {
      b.y = Math.floor(ny / TILE + 1) * TILE;
      b.vy = 0;
      b.hitCeiling = true;
    } else b.y = ny;
  } else {
    // resting: check ground directly beneath
    if (map.rectSolid(b.x, b.y + 1, b.w, b.h, small)) b.onGround = true;
    else if (!b.dropThrough && onewayBelow(map, b.x, b.w, prevBottom, prevBottom + 1) !== null) b.onGround = true;
  }
}

export function applyGravity(b: Body, dt: number, scale = 1): void {
  b.vy = Math.min(MAX_FALL, b.vy + GRAVITY * scale * dt);
}

/** Is there standing ground one tile ahead and below the body's leading edge? */
export function groundAhead(b: Body, map: TileMap, dir: number): boolean {
  const x = dir > 0 ? b.x + b.w + 1 : b.x - 1;
  const y = b.y + b.h + 1;
  const k = map.kindAtPx(x, y);
  return k === 'solid' || k === 'oneway' || k === 'cracked' || k === 'vent';
}

export function wallAhead(b: Body, map: TileMap, dir: number): boolean {
  const x = dir > 0 ? b.x + b.w + 1 : b.x - 1;
  return map.rectSolid(x, b.y, 1, b.h - 1, !!b.small);
}
