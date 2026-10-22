/** Purely visual entities (#53): enemy corpses, the Count's bat burst, pickup glints. */
import type { Renderer } from '../engine/render';
import { anim, Animator, defineSprite, type Sprite } from '../engine/sprites';
import { pal, type SpritePalette } from './palette';
import { BAT, BAT_PAL } from './art/monsters';
import type { Entity, World } from './world';

/** A body that tumbles, bounces once off the floor and blinks out. */
export class Corpse implements Entity {
  kind = 'fx';
  dead = false;
  w = 0;
  h = 0;
  layer = 3;
  private bounced = false;
  constructor(
    public sprite: Sprite,
    public pal: SpritePalette,
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public gravity: number,
    public life: number,
    public flip = false,
  ) {}
  update(world: World, dt: number): void {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    const ny = this.y + this.vy * dt;
    if (this.vy > 0 && world.map.rectSolid(this.x, ny + this.sprite.h - 1, this.sprite.w, 1)) {
      this.vy = this.bounced ? 0 : -this.vy * 0.3;
      this.vx *= 0.4;
      this.bounced = true;
    } else this.y = ny;
  }
  draw(r: Renderer, cx: number, cy: number): void {
    if (this.life < 0.3 && Math.floor(this.life * 20) % 2) return;
    r.sprite(this.sprite, this.pal, this.x - cx, this.y - cy, this.flip);
  }
}

/** Bats bursting outward from a point and flapping away (the Count's defeat). */
export class BatBurst implements Entity {
  kind = 'fx';
  dead = false;
  w = 0;
  h = 0;
  layer = 6;
  private bats: { x: number; y: number; vx: number; vy: number; a: Animator }[] = [];
  private t = 0;
  constructor(public x: number, public y: number, n = 10) {
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (i / (n - 1) - 0.5) * Math.PI * 1.4;
      const sp = 60 + (i % 3) * 25;
      const a = new Animator({ fly: BAT }, 'fly');
      a.frame = i % BAT.frames.length;
      this.bats.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, a });
    }
  }
  update(_world: World, dt: number): void {
    this.t += dt;
    for (const b of this.bats) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy -= 30 * dt; // they all flee upward
      b.a.update(dt);
    }
    if (this.t > 2.5) this.dead = true;
  }
  draw(r: Renderer, cx: number, cy: number): void {
    for (const b of this.bats) r.sprite(b.a.sprite, BAT_PAL, b.x - cx - 8, b.y - cy - 6, b.vx > 0);
  }
}

/** A four-point star that twinkles on pickups now and then. */
export const GLINT = anim(
  [
    defineSprite('glint_0', ['.....', '.....', '..1..', '.....', '.....']),
    defineSprite('glint_1', ['.....', '..1..', '.111.', '..1..', '.....']),
    defineSprite('glint_2', ['..1..', '..1..', '11111', '..1..', '..1..']),
    defineSprite('glint_3', ['.....', '..1..', '.111.', '..1..', '.....']),
  ],
  16,
);
export const GLINT_PAL = pal('white', 'white', 'white');

/** Draw a glint at (x, y) if this pickup is in its twinkle window; `seed` staggers pickups. */
export function drawGlint(r: Renderer, x: number, y: number, seed: number): void {
  const t = (performance.now() / 1000 + seed * 0.37) % 1.8;
  if (t >= 0.25) return;
  r.sprite(GLINT.frames[Math.min(3, Math.floor(t / 0.0625))], GLINT_PAL, x - 2, y - 2);
}
