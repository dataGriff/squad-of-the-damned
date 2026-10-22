/** Fodder set (#21): bats, rats, zombie hands, bog frogs. */
import { applyGravity, stepBody } from '../../engine/physics';
import { BAT, BAT_DEAD, BAT_PAL, FROG, FROG_PAL, FROG_SQUASH, HAND, HAND_PAL, RAT, RAT_DEAD, RAT_PAL } from '../art/monsters';
import { Enemy } from './base';
import type { World } from '../world';
import type { Renderer } from '../../engine/render';
import { rand } from '../../engine/random';

export class Bat extends Enemy {
  protected corpse() {
    return { sprite: BAT_DEAD, vx: 20, vy: -30, gravity: 500, life: 0.9 };
  }
  private t = rand() * 6;
  private swoop = 0;
  constructor(x: number, y: number) {
    super(x, y, { w: 10, h: 6, hp: 1, speed: 50, aggroRange: 90, flying: true, colour: 'purple', anims: { fly: BAT }, pal: BAT_PAL });
    this.body.y = y + 4;
    this.spawnY = this.body.y;
  }
  think(world: World, dt: number): void {
    this.t += dt;
    const { dx, dy, dist } = this.senses(world);
    const b = this.body;
    if (this.swoop > 0) {
      this.swoop -= dt;
      b.vx = Math.sign(dx || 1) * 110;
      b.vy = Math.sign(dy) * 70;
    } else if (this.aggro && dist > 20 && Math.abs(dy) < 60) {
      this.swoop = 0.6;
      this.dir = Math.sign(dx) || this.dir;
    } else {
      b.vx = this.dir * this.opts.speed;
      b.vy = Math.sin(this.t * 4) * 30 + (this.spawnY - b.y) * 0.8;
    }
    const nx = b.x + b.vx * dt;
    if (world.map.rectSolid(nx, b.y, b.w, b.h)) this.dir = -this.dir;
    else {
      b.px = b.x;
      b.py = b.y;
      b.x = nx;
      if (!world.map.rectSolid(b.x, b.y + b.vy * dt, b.w, b.h)) b.y += b.vy * dt;
    }
    if (b.vx !== 0) this.dir = Math.sign(b.vx);
  }
}

export class Rat extends Enemy {
  protected corpse() {
    return { sprite: RAT_DEAD, vx: 30, vy: -110, gravity: 600, life: 0.8 };
  }
  constructor(x: number, y: number) {
    super(x, y, { w: 14, h: 6, hp: 1, speed: 70, aggroRange: 70, colour: 'grey', anims: { run: RAT }, pal: RAT_PAL });
  }
  think(world: World, dt: number): void {
    const { dx } = this.senses(world);
    if (this.aggro && this.body.onGround) this.dir = Math.sign(dx) || this.dir;
    this.patrol(world, dt, this.aggro ? this.opts.speed * 1.6 : this.opts.speed);
  }
}

/** Zombie hand: hidden until the player is close, then pops up and grabs. */
export class ZombieHand extends Enemy {
  protected corpse() {
    return { sprite: HAND.frames[2], vx: 0, vy: 0, gravity: 0, life: 0.5 };
  }
  private state: 'hidden' | 'rising' | 'up' | 'sinking' = 'hidden';
  private timer = 0;
  constructor(x: number, y: number) {
    super(x, y, { w: 8, h: 12, hp: 2, speed: 0, aggroRange: 40, colour: 'olive', anims: { up: HAND }, pal: HAND_PAL });
    this.hostile = false;
  }
  think(world: World, dt: number): void {
    const { dist } = this.senses(world);
    this.timer -= dt;
    switch (this.state) {
      case 'hidden':
        this.hostile = false;
        if (this.aggro) {
          this.state = 'rising';
          this.timer = 0.25;
          this.anim.play('up', true);
        }
        break;
      case 'rising':
        if (this.timer <= 0) {
          this.state = 'up';
          this.hostile = true;
          this.timer = 1.6;
        }
        break;
      case 'up':
        if (this.timer <= 0 || dist > this.opts.aggroRange * 2) {
          this.state = 'sinking';
          this.timer = 0.4;
        }
        break;
      case 'sinking':
        this.hostile = false;
        if (this.timer <= 0) this.state = 'hidden';
        break;
    }
    this.anim.frame = this.state === 'hidden' ? 2 : this.state === 'rising' || this.state === 'sinking' ? 1 : 0;
  }
  contact(world: World): void {
    if (this.state === 'up') super.contact(world);
  }
  draw(r: Renderer, cx: number, cy: number, alpha: number): void {
    if (this.state === 'hidden') return;
    super.draw(r, cx, cy, alpha);
  }
}

/** Bog frog: hops toward the player; can't turn mid-air. */
export class BogFrog extends Enemy {
  protected corpse() {
    return { sprite: FROG_SQUASH, vx: 0, vy: 0, gravity: 0, life: 0.6 };
  }
  private wait = 0.8;
  constructor(x: number, y: number) {
    super(x, y, { w: 14, h: 8, hp: 2, speed: 60, aggroRange: 100, colour: 'lime', anims: { hop: FROG }, pal: FROG_PAL });
  }
  think(world: World, dt: number): void {
    const b = this.body;
    const { dx } = this.senses(world);
    if (b.onGround) {
      b.vx = 0;
      this.wait -= dt;
      this.anim.frame = 1;
      if (this.wait <= 0) {
        this.dir = this.aggro ? Math.sign(dx) || this.dir : -this.dir;
        b.vx = this.dir * this.opts.speed;
        b.vy = -220;
        this.wait = 0.9 + rand() * 0.4;
      }
    } else this.anim.frame = 0;
    applyGravity(b, dt);
    stepBody(b, world.map, dt);
    if (b.hitWall) {
      this.dir = -this.dir;
      b.vx = this.dir * this.opts.speed;
    }
  }
}

export function spawnEnemy(type: string, x: number, y: number): Enemy | null {
  switch (type) {
    case 'bat':
      return new Bat(x, y);
    case 'rat':
      return new Rat(x, y);
    case 'hand':
      return new ZombieHand(x, y);
    case 'frog':
      return new BogFrog(x, y);
    default:
      return null;
  }
}
