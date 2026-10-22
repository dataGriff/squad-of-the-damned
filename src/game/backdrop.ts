/** Draws a theme's parallax backdrop layers (far to near) behind the tiles. */
import type { Renderer } from '../engine/render';
import { SCREEN_W } from '../engine/constants';
import { BACKDROPS, type BackLayer } from './art/backdrops';
import { FOREGROUND } from './art/props';
import type { Sprite } from '../engine/sprites';
import { THEMES, type Theme } from './art/tiles';
import { cycled, pal, type SpritePalette } from './palette';

/**
 * Lightning (#54): 'strike' turns the sky white and every other layer into a
 * black silhouette, NES-style; 'pulse' is the reduced-flash version, a soft
 * brightening of the sky only.
 */
export type Lightning = 'none' | 'strike' | 'pulse';

const STRIKE_SKY = pal('lavender', 'white', 'white');
const STRIKE_SILHOUETTE = pal('black', 'black', 'darkGrey');
const PULSE_SKY = pal('indigo', 'violet', 'violet');

export function drawBackdrop(r: Renderer, theme: Theme, camX: number, t: number, lightning: Lightning = 'none'): void {
  const layers = BACKDROPS[theme];
  const outdoors = layers.some((l) => l.sky);
  r.clear(lightning === 'strike' && outdoors ? '#fcfcfc' : THEMES[theme].sky);
  for (const l of layers) {
    const f = l.frames.length > 1 ? l.frames[Math.floor(t * (l.fps ?? 4)) % l.frames.length] : l.frames[0];
    let p = l.cycle ? cycled(l.pal, l.cycle.index, l.cycle.colours, t, l.cycle.fps) : l.pal;
    if (!outdoors) {
      // underground: the flash comes down through the grates and lights the tunnel;
      // with reduced flash only the light shafts brighten, steadily
      if (l.strikePal && (lightning === 'strike' || (lightning === 'pulse' && f.name.includes('shafts')))) p = l.strikePal;
    } else if (lightning === 'strike') {
      if (l.sky) p = STRIKE_SKY;
      else if (l.x !== undefined && f.name.includes('halo')) continue;
      else if (l.x === undefined) p = STRIKE_SILHOUETTE;
    } else if (lightning === 'pulse' && l.sky) p = PULSE_SKY;
    drawLayer(r, l, f, p, camX, t);
  }
}

/** Draw one layer: pinned at `x`, or repeated across the screen with parallax and drift. */
function drawLayer(r: Renderer, l: BackLayer, f: Sprite, p: SpritePalette, camX: number, t: number): void {
  if (l.x !== undefined) {
    r.sprite(f, p, l.x, l.y);
    return;
  }
  const every = l.every ?? f.w;
  const shift = Math.round(camX * l.factor + (l.drift ?? 0) * t) - (l.offset ?? 0);
  let x = -(((shift % every) + every) % every);
  // step back far enough that a sprite wider than its spacing still covers the left edge
  while (x + f.w > 0) x -= every;
  for (x += every; x < SCREEN_W; x += every) r.sprite(f, p, x, l.y);
}

/** Near silhouettes drawn in front of everything except the HUD (#55). */
export function drawForeground(r: Renderer, theme: Theme, camX: number, t: number): void {
  for (const l of FOREGROUND[theme]) drawLayer(r, l, l.frames[0], l.pal, camX, t);
}

/**
 * A storm: schedules strikes every few seconds. `update` reports the tick a
 * strike begins and, a moment later, the tick the thunder should play.
 */
export class Storm {
  private next: number;
  private t = 0;
  private strikeAt = -10;
  thunderIn = -1;
  constructor(private minGap = 5, private maxGap = 11, private rand: () => number = Math.random) {
    this.next = 2 + this.rand() * 4;
  }
  update(dt: number): { strike: boolean; thunder: boolean } {
    this.t += dt;
    let thunder = false;
    if (this.thunderIn > 0) {
      this.thunderIn -= dt;
      thunder = this.thunderIn <= 0;
    }
    if (this.t >= this.next) {
      this.strikeAt = this.t;
      this.next = this.t + this.minGap + this.rand() * (this.maxGap - this.minGap);
      this.thunderIn = 0.35 + this.rand() * 0.6;
      return { strike: true, thunder };
    }
    return { strike: false, thunder };
  }
  /** Current lightning state: a three-flash strobe, or one slow pulse when reduced. */
  state(reduced: boolean): Lightning {
    const k = this.t - this.strikeAt;
    if (k < 0 || k > 0.6) return 'none';
    if (reduced) return k < 0.5 ? 'pulse' : 'none';
    const frame = Math.floor(k * 60);
    return frame < 3 || (frame >= 6 && frame < 8) || (frame >= 14 && frame < 16) ? 'strike' : 'none';
  }
}
