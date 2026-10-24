/**
 * Layout (#61): the 8px grid, the TV-safe area and small helpers for placing
 * panels and text.
 *
 * Real NES output lost about 8 pixels on every edge to TV overscan, so games
 * kept text and HUD inside a title-safe area. Ours is the screen inset by one
 * grid unit (8px) on every side: 240×224 starting at (8, 8). Scenery may fill
 * the whole screen; anything the player must read stays inside SAFE.
 */
import { SCREEN_H, SCREEN_W } from '../../engine/constants';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One grid unit. Panels and text snap to multiples of it. */
export const GRID = 8;

/** Spacing steps, smallest to largest. */
export const SPACE = { xs: 2, sm: 4, md: 8, lg: 16, xl: 24 } as const;

/** The title-safe area: everything the player must read sits inside it. */
export const SAFE: Rect = { x: GRID, y: GRID, w: SCREEN_W - GRID * 2, h: SCREEN_H - GRID * 2 };

export const SCREEN: Rect = { x: 0, y: 0, w: SCREEN_W, h: SCREEN_H };

/** Snap a coordinate to the grid. */
export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

/** A rect shrunk by `n` on every side (or by `dx`, `dy`). */
export function inset(r: Rect, dx: number, dy = dx): Rect {
  return { x: r.x + dx, y: r.y + dy, w: r.w - dx * 2, h: r.h - dy * 2 };
}

/** The x that centres something `w` wide in `within` (default: the screen). */
export function centreX(w: number, within: Rect = SCREEN): number {
  return Math.round(within.x + (within.w - w) / 2);
}

/** A rect of size w×h centred in `within` (default: the screen), snapped to whole pixels. */
export function centred(w: number, h: number, within: Rect = SCREEN): Rect {
  return { x: centreX(w, within), y: Math.round(within.y + (within.h - h) / 2), w, h };
}

/** `n` row positions starting at y, `step` apart. */
export function rows(y: number, n: number, step: number): number[] {
  return Array.from({ length: n }, (_, i) => y + i * step);
}

/** Does `inner` sit entirely inside `outer`? */
export function contains(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

/** Split a rect into a top part `h` tall and the rest, with `gap` between. */
export function splitTop(r: Rect, h: number, gap = 0): [Rect, Rect] {
  return [
    { x: r.x, y: r.y, w: r.w, h },
    { x: r.x, y: r.y + h + gap, w: r.w, h: r.h - h - gap },
  ];
}
