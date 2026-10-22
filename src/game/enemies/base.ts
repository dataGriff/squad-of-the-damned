/** Enemy base class (#20): patrol, edge-turn, aggro range, HP, stun, death particles. */
import { applyGravity, groundAhead, makeBody, overlaps, stepBody, wallAhead, type Body } from '../../engine/physics';
import type { Renderer } from '../../engine/render';
import { Animator, type AnimDef, type Sprite } from '../../engine/sprites';
import { Corpse } from '../effects';
import { audio } from '../../engine/audio';
import type { SpritePalette } from '../palette';
import type { Damageable, World } from '../world';
import type { Weakness } from '../manual';
import type { Colour } from '../design/tokens';
import { FLASH_PAL } from '../art/common';

export interface EnemyOpts {
  w: number;
  h: number;
  hp: number;
  speed: number;
  aggroRange: number;
  flying?: boolean;
  contactDamage?: number;
  /** Death particle colour. */
  colour: Colour;
  anims: Record<string, AnimDef>;
  pal: SpritePalette;
  /** Sprite size (may be larger than hitbox). */
  sw?: number;
  sh?: number;
}

export class Enemy implements Damageable {
  kind = 'enemy';
  dead = false;
  hostile = true;
  body: Body;
  hp: number;
  dir = -1;
  stunTime = 0;
  flashTime = 0;
  anim: Animator;
  aggro = false;
  spawnX: number;
  spawnY: number;
  constructor(x: number, y: number, public opts: EnemyOpts) {
    this.body = makeBody(x + (16 - opts.w) / 2, y + 16 - opts.h, opts.w, opts.h);
    this.body.ghost = !!opts.flying;
    this.hp = opts.hp;
    this.anim = new Animator(opts.anims, Object.keys(opts.anims)[0]);
    this.spawnX = this.body.x;
    this.spawnY = this.body.y;
  }
  get x() { return this.body.x; }
  get y() { return this.body.y; }
  get w() { return this.body.w; }
  get h() { return this.body.h; }
  get centerX() { return this.body.x + this.body.w / 2; }
  get centerY() { return this.body.y + this.body.h / 2; }

  hit(world: World, _kind: Weakness | 'melee' | 'pebble', damage: number, fromX: number): boolean {
    if (this.dead) return false;
    this.hp -= damage;
    this.flashTime = 0.1;
    audio.play('hit');
    this.body.vx = (this.centerX < fromX ? -1 : 1) * 60;
    if (this.hp <= 0) this.die(world);
    return true;
  }
  stun(seconds: number): void {
    this.stunTime = Math.max(this.stunTime, seconds);
  }
  die(world: World): void {
    this.dead = true;
    world.particles.burst(this.centerX, this.centerY, this.opts.colour, 6, 70);
    const c = this.corpse();
    if (c) {
      const x = this.body.x + this.body.w / 2 - c.sprite.w / 2;
      const y = this.body.y + this.body.h - c.sprite.h;
      world.add(new Corpse(c.sprite, this.opts.pal, x, y, c.vx * -this.dir, c.vy, c.gravity, c.life, this.dir > 0));
    }
  }

  /** Per-type death animation (#53): a sprite that tumbles and blinks out. */
  protected corpse(): { sprite: Sprite; vx: number; vy: number; gravity: number; life: number } | null {
    return null;
  }

  /** Distance to the player; aggro when within range on the same rough height. */
  senses(world: World): { dx: number; dy: number; dist: number } {
    const p = world.player;
    const dx = p.centerX - this.centerX;
    const dy = p.centerY - this.centerY;
    const dist = Math.hypot(dx, dy);
    this.aggro = dist < this.opts.aggroRange;
    return { dx, dy, dist };
  }

  /** Default ground patrol: walk, turn at edges and walls. */
  patrol(world: World, dt: number, speed = this.opts.speed): void {
    const b = this.body;
    if (b.onGround && (!groundAhead(b, world.map, this.dir) || wallAhead(b, world.map, this.dir))) this.dir = -this.dir;
    b.vx = this.dir * speed;
    applyGravity(b, dt);
    stepBody(b, world.map, dt);
    if (b.hitWall) this.dir = -this.dir;
  }

  contact(world: World): void {
    if (overlaps(this.body, world.player)) world.player.hurt(world, this.centerX, this.opts.contactDamage ?? 1);
  }

  update(world: World, dt: number): void {
    if (this.flashTime > 0) this.flashTime -= dt;
    if (this.stunTime > 0) {
      this.stunTime -= dt;
      if (!this.opts.flying) {
        this.body.vx = 0;
        applyGravity(this.body, dt);
        stepBody(this.body, world.map, dt);
      }
      return;
    }
    this.think(world, dt);
    this.anim.update(dt);
    this.contact(world);
  }

  /** Override per enemy. */
  think(world: World, dt: number): void {
    this.patrol(world, dt);
  }

  draw(r: Renderer, cx: number, cy: number, alpha: number): void {
    const b = this.body;
    const s = this.anim.sprite;
    // hurt: white flash plus a one-pixel recoil
    const recoil = this.flashTime > 0 ? -this.dir : 0;
    const x = b.px + (b.x - b.px) * alpha - cx + b.w / 2 - s.w / 2 + recoil;
    const y = b.py + (b.y - b.py) * alpha - cy + b.h - s.h;
    const pal = this.flashTime > 0 ? FLASH_PAL : this.opts.pal;
    r.sprite(s, pal, x, y, this.dir > 0);
    if (this.stunTime > 0) r.marker('*', x + s.w / 2 - 4, y - 8, 'good');
  }
}

