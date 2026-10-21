/** Draws a theme's parallax backdrop layers (far to near) behind the tiles. */
import type { Renderer } from '../engine/render';
import { SCREEN_W } from '../engine/constants';
import { BACKDROPS } from './art/backdrops';
import { THEMES, type Theme } from './art/tiles';

export function drawBackdrop(r: Renderer, theme: Theme, camX: number, t: number): void {
  r.clear(THEMES[theme].sky);
  for (const l of BACKDROPS[theme]) {
    const f = l.frames.length > 1 ? l.frames[Math.floor(t * (l.fps ?? 4)) % l.frames.length] : l.frames[0];
    if (l.x !== undefined) {
      r.sprite(f, l.pal, l.x, l.y);
      continue;
    }
    const every = l.every ?? f.w;
    const shift = Math.round(camX * l.factor + (l.drift ?? 0) * t) - (l.offset ?? 0);
    let x = -(((shift % every) + every) % every);
    // step back far enough that a sprite wider than its spacing still covers the left edge
    while (x + f.w > 0) x -= every;
    for (x += every; x < SCREEN_W; x += every) r.sprite(f, l.pal, x, l.y);
  }
}
