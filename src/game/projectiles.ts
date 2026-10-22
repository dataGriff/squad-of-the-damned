/** Player projectiles (#15, #16) and boss-thrown things. */
import { applyGravity, makeBody, overlaps, stepBody, type Body } from '../engine/physics';
import type { Renderer } from '../engine/render';
import { Animator } from '../engine/sprites';
import { audio } from '../engine/audio';
import { BOULDER, BOULDER_PAL, CHARGED_SHOT, GARLIC_BOMB, GARLIC_PAL, PEBBLE, PROJ_PAL, SILVER_SHOT, STUN_CLOUD, BUBBLE, BUBBLE_PAL } from './art/items';
import type { Entity, World } from './world';
import type { Weakness } from './manual';
import { TILE } from '../engine/constants';
import { rand } from '../engine/random';

export type ShotKind = 'pebble' | 'silver' | 'charged';

export class Shot implements Entity {
  kind = 'shot';
  dead = false;
  body: Body;
  life = 1.2;
  constructor(x: number, y: number, dir: number, public shot: ShotKind, speed: number) {
    const s = shot === 'charged' ? 6 : 4;
    this.body = makeBody(x - s / 2, y - s / 2, s, s);
    this.body.vx = dir * speed;
    this.body.vy = shot === 'charged' ? 0 : -20;
  }
  get x() { return this.body.x; }
  get y() { return this.body.y; }
  get w() { return this.body.w; }
  get h() { return this.body.h; }
  update(world: World, dt: number): void {
    this.life -= dt;
    if (this.shot !== 'charged') applyGravity(this.body, dt, 0.15);
    stepBody(this.body, world.map, dt);
    if (this.body.hitWall || this.body.onGround || this.body.hitCeiling || this.life <= 0) {
      this.dead = true;
      world.particles.burst(this.body.x + 2, this.body.y + 2, 'lightGrey', 3, 40);
      return;
    }
    for (const t of world.hittables(this.body.x, this.body.y, this.body.w, this.body.h)) {
      const dmgKind: Weakness | 'pebble' = this.shot === 'pebble' ? 'pebble' : 'silver';
      const dmg = this.shot === 'charged' ? 2 : 1;
      if (t.hit(world, dmgKind, dmg, this.body.x)) {
        this.dead = true;
        world.particles.burst(this.body.x + 2, this.body.y + 2, this.shot === 'pebble' ? 'lightGrey' : 'white', 4, 60);
        return;
      }
    }
  }
  draw(r: Renderer, cx: number, cy: number, alpha: number): void {
    const b = this.body;
    const x = b.px + (b.x - b.px) * alpha - cx;
    const y = b.py + (b.y - b.py) * alpha - cy;
    r.sprite(this.shot === 'pebble' ? PEBBLE : this.shot === 'silver' ? SILVER_SHOT : CHARGED_SHOT, PROJ_PAL, x, y);
  }
}

export class GarlicBomb implements Entity {
  kind = 'bomb';
  dead = false;
  body: Body;
  bounces = 0;
  fuse = 1.4;
  anim = new Animator({ spin: GARLIC_BOMB }, 'spin');
  constructor(x: number, y: number, dir: number, speed: number) {
    this.body = makeBody(x - 4, y - 4, 8, 8);
    this.body.vx = dir * speed;
    this.body.vy = -200;
  }
  get x() { return this.body.x; }
  get y() { return this.body.y; }
  get w() { return this.body.w; }
  get h() { return this.body.h; }
  update(world: World, dt: number): void {
    this.fuse -= dt;
    this.anim.update(dt);
    applyGravity(this.body, dt, 0.8);
    const vy = this.body.vy;
    stepBody(this.body, world.map, dt);
    if (this.body.hitWall) {
      this.body.vx = -this.body.vx * 0.4;
    }
    if (this.body.onGround && vy > 40) {
      this.bounces++;
      this.body.vy = -vy * 0.4;
      this.body.vx *= 0.6;
      if (this.bounces >= 2) this.fuse = Math.min(this.fuse, 0.15);
    }
    // direct hit on an enemy also bursts
    const direct = world.hittables(this.body.x, this.body.y, this.body.w, this.body.h).length > 0;
    if (this.fuse <= 0 || direct) this.burst(world);
  }
  burst(world: World): void {
    this.dead = true;
    audio.play('bomb');
    world.camera.shake(2, 0.15);
    world.add(new StunCloud(this.body.x + 4, this.body.y + 4));
  }
  draw(r: Renderer, cx: number, cy: number, alpha: number): void {
    const b = this.body;
    r.sprite(this.anim.sprite, GARLIC_PAL, b.px + (b.x - b.px) * alpha - cx, b.py + (b.y - b.py) * alpha - cy);
  }
}

/** Area stun: hits everything in a radius once, lingers as a cloud. */
export class StunCloud implements Entity {
  kind = 'cloud';
  dead = false;
  w = 40;
  h = 40;
  x: number;
  y: number;
  life = 0.6;
  anim = new Animator({ puff: STUN_CLOUD }, 'puff');
  private applied = false;
  constructor(cx: number, cy: number) {
    this.x = cx - this.w / 2;
    this.y = cy - this.h / 2;
  }
  update(world: World, dt: number): void {
    this.anim.update(dt);
    this.life -= dt;
    if (!this.applied) {
      this.applied = true;
      for (const t of world.hittables(this.x, this.y, this.w, this.h)) {
        t.hit(world, 'garlic', 1, this.x + this.w / 2);
        t.stun?.(2.5);
      }
      for (let i = 0; i < 8; i++) world.particles.sparkle(this.x + rand() * this.w, this.y + rand() * this.h, 'mint');
    }
    if (this.life <= 0) this.dead = true;
  }
  draw(r: Renderer, cx: number, cy: number): void {
    const s = this.anim.sprite;
    const pal = GARLIC_PAL;
    for (let i = 0; i < 4; i++) {
      const ox = [0, 20, 10, 10][i];
      const oy = [10, 10, 0, 20][i];
      r.sprite(s, pal, this.x + ox + 4 - cx, this.y + oy + 4 - cy);
    }
  }
}

/** Thrown by the Giant; also lands as a pushable-ish obstacle briefly. */
export class Boulder implements Entity {
  kind = 'boulder';
  dead = false;
  body: Body;
  life = 4;
  constructor(x: number, y: number, vx: number, vy: number) {
    this.body = makeBody(x, y, 10, 10);
    this.body.vx = vx;
    this.body.vy = vy;
  }
  get x() { return this.body.x; }
  get y() { return this.body.y; }
  get w() { return this.body.w; }
  get h() { return this.body.h; }
  update(world: World, dt: number): void {
    this.life -= dt;
    applyGravity(this.body, dt);
    stepBody(this.body, world.map, dt);
    if (this.body.onGround || this.body.hitWall || this.life <= 0) {
      this.dead = true;
      world.particles.burst(this.body.x + 5, this.body.y + 5, 'grey', 6, 70);
      world.camera.shake(2, 0.1);
      return;
    }
    const p = world.player;
    if (overlaps(this.body, p)) {
      p.hurt(world, this.body.x);
    }
  }
  draw(r: Renderer, cx: number, cy: number, alpha: number): void {
    const b = this.body;
    r.sprite(BOULDER, BOULDER_PAL, b.px + (b.x - b.px) * alpha - cx, b.py + (b.y - b.py) * alpha - cy);
  }
}

/** Gill Creature's bubble: slow homing shot. */
export class Bubble implements Entity {
  kind = 'bubble';
  dead = false;
  w = 4;
  h = 4;
  life = 3;
  constructor(public x: number, public y: number, public vx: number, public vy: number) {}
  update(world: World, dt: number): void {
    this.life -= dt;
    const p = world.player;
    const dx = p.centerX - this.x;
    const dy = p.centerY - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.vx += (dx / d) * 60 * dt;
    this.vy += (dy / d) * 60 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.life <= 0 || world.map.rectSolid(this.x, this.y, this.w, this.h)) this.dead = true;
    if (overlaps(this, p)) {
      this.dead = true;
      p.hurt(world, this.x);
    }
    // the player can pop bubbles with any shot
    for (const s of world.all<Shot>('shot')) {
      if (overlaps(this, s)) {
        this.dead = true;
        s.dead = true;
        world.particles.burst(this.x, this.y, 'iceBlue', 4, 40);
      }
    }
  }
  draw(r: Renderer, cx: number, cy: number): void {
    r.sprite(BUBBLE, BUBBLE_PAL, this.x - cx, this.y - cy);
  }
}

export const TILE_PX = TILE;
