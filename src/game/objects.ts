/** Level objects: pickups, checkpoints, crates, doors, boss-arena props, finale seals. */
import { applyGravity, makeBody, overlaps, stepBody, type Body } from '../engine/physics';
import type { Renderer } from '../engine/render';
import { Animator } from '../engine/sprites';
import { audio } from '../engine/audio';
import { TILE } from '../engine/constants';
import * as A from './art/items';
import { drawGlint } from './effects';
import type { Entity, World } from './world';
import type { MapObject } from '../engine/tilemap';

abstract class Static implements Entity {
  abstract kind: string;
  dead = false;
  constructor(public x: number, public y: number, public w: number, public h: number) {}
  abstract update(world: World, dt: number): void;
  abstract draw(r: Renderer, cx: number, cy: number, alpha: number): void;
  touching(world: World): boolean {
    return overlaps(this, world.player);
  }
}

/** Manual page pickup (#34). */
export class PagePickup extends Static {
  kind = 'page';
  anim = new Animator({ float: A.PAGE }, 'float');
  constructor(x: number, y: number, public pageId: string) {
    super(x + 2, y + 2, 12, 12);
  }
  update(world: World, dt: number): void {
    this.anim.update(dt);
    if (this.touching(world)) {
      this.dead = true;
      audio.play('page');
      for (let i = 0; i < 10; i++) world.particles.sparkle(this.x + Math.random() * 12, this.y + Math.random() * 12);
      world.events.onPage(this.pageId);
    }
  }
  draw(r: Renderer, cx: number, cy: number): void {
    r.sprite(this.anim.sprite, A.PAGE_PAL, this.x - cx, this.y - 2 - cy);
    drawGlint(r, this.x + 10 - cx, this.y - cy, this.x);
  }
}

/** Streetlamp checkpoint (#33). */
export class Lamp extends Static {
  kind = 'lamp';
  lit = false;
  layer = -1;
  constructor(x: number, y: number, public index: number) {
    super(x + 2, y, 12, 32);
  }
  update(world: World): void {
    if (!this.lit && this.touching(world)) {
      this.lit = true;
      audio.play('checkpoint');
      for (let i = 0; i < 6; i++) world.particles.sparkle(this.x + 6, this.y + 4, '#f8f8b8');
      world.events.onCheckpoint(this.index);
    }
  }
  draw(r: Renderer, cx: number, cy: number): void {
    if (this.lit) r.sprite(A.LAMP_GLOW, A.LAMP_GLOW_PAL, this.x - 2 + 8 - 24 - cx, this.y + 8 - 8 - cy);
    r.sprite(this.lit ? A.LAMP_ON : A.LAMP_OFF, A.LAMP_PAL, this.x - 2 - cx, this.y - cy);
  }
}

/** Pushable crate (#17): only Bruno can move it; it falls with gravity. */
export class Crate implements Entity {
  kind = 'crate';
  dead = false;
  body: Body;
  constructor(x: number, y: number) {
    this.body = makeBody(x, y, 16, 16);
  }
  get x() { return this.body.x; }
  get y() { return this.body.y; }
  get w() { return this.body.w; }
  get h() { return this.body.h; }
  push(world: World, dir: number, dt: number): void {
    this.body.vx = dir * 40;
    stepBody(this.body, world.map, dt);
    this.body.vx = 0;
    if (world.time % 0.3 < dt) audio.play('push');
  }
  update(world: World, dt: number): void {
    applyGravity(this.body, dt);
    const vx = this.body.vx;
    this.body.vx = 0;
    stepBody(this.body, world.map, dt);
    this.body.vx = vx;
    // crates are solid for the player: stand on top / blocked at sides
    const p = world.player;
    const pb = (p as unknown as { body: Body }).body;
    if (overlaps(pb, this.body)) {
      const dyTop = pb.y + pb.h - this.body.y;
      if (pb.vy >= 0 && dyTop < 8) {
        pb.y = this.body.y - pb.h;
        pb.vy = 0;
        pb.onGround = true;
      } else if (pb.x + pb.w / 2 < this.body.x + 8) {
        pb.x = this.body.x - pb.w;
        if (pb.vx > 0) pb.vx = 0;
      } else {
        pb.x = this.body.x + this.body.w;
        if (pb.vx < 0) pb.vx = 0;
      }
    }
    // pressure plates (finale seals) check for crates themselves
  }
  draw(r: Renderer, cx: number, cy: number, alpha: number): void {
    const b = this.body;
    r.sprite(A.CRATE, A.CRATE_PAL, b.px + (b.x - b.px) * alpha - cx, b.py + (b.y - b.py) * alpha - cy);
  }
}

export class SilverPickup extends Static {
  kind = 'silver';
  anim = new Animator({ spin: A.SILVER }, 'spin');
  constructor(x: number, y: number) {
    super(x + 3, y + 4, 10, 8);
  }
  update(world: World, dt: number): void {
    this.anim.update(dt);
    if (this.touching(world)) {
      this.dead = true;
      world.squad.silver = Math.min(99, world.squad.silver + 3);
      audio.play('pickup');
    }
  }
  draw(r: Renderer, cx: number, cy: number): void {
    r.sprite(this.anim.sprite, A.SILVER_PAL, this.x - cx, this.y - cy);
    drawGlint(r, this.x + 7 - cx, this.y + 1 - cy, this.x);
  }
}

export class HeartPickup extends Static {
  kind = 'heart';
  constructor(x: number, y: number) {
    super(x + 3, y + 6, 9, 8);
  }
  update(world: World): void {
    if (this.touching(world)) {
      this.dead = true;
      world.squad.heal(2);
      audio.play('pickup');
    }
  }
  draw(r: Renderer, cx: number, cy: number): void {
    r.sprite(A.HEART, A.HEART_PAL, this.x - cx, this.y - cy + Math.round(Math.sin(performance.now() / 200)));
    drawGlint(r, this.x + 2 - cx, this.y + 1 - cy, this.x);
  }
}

/** Exit door: ends the night when the boss is dead (or no boss exists). */
export class Exit extends Static {
  kind = 'exit';
  layer = -1;
  open = false;
  constructor(x: number, y: number) {
    super(x, y, 16, 32);
  }
  update(world: World): void {
    this.open = world.bossActive === null;
    if (this.open && this.touching(world) && world.input.isDown('up')) {
      this.dead = true;
      world.events.onLevelComplete();
    }
  }
  draw(r: Renderer, cx: number, cy: number): void {
    r.sprite(A.EXIT, A.DOOR_PAL, this.x - cx, this.y - cy);
    if (this.open) r.text('▲', this.x + 4 - cx, this.y - 10 - cy + Math.round(Math.sin(performance.now() / 250) * 2), '#f8d878');
  }
}

/** Mummy arena valve (#26): shoot the valve or its pipe; water sprays down for a few seconds. */
export class Valve extends Static {
  kind = 'valve';
  hostile = true; // targetable by shots
  spray = 0;
  anim = new Animator({ s: A.SPRAY }, 's');
  private valveY: number;
  private floorY = 0;
  constructor(x: number, y: number) {
    super(x + 4, y + 4, 8, 12);
    this.valveY = y + 4;
  }
  hit(world: World): boolean {
    if (this.spray > 0) return false;
    this.spray = 3;
    audio.play('splash');
    world.camera.shake(1, 0.1);
    return true;
  }
  update(world: World, dt: number): void {
    if (!this.floorY) {
      // the pipe runs from the valve to the floor and is the thing you shoot
      let ty = Math.floor(this.valveY / TILE) + 1;
      while (ty < world.map.height && !world.map.isSolidKind(world.map.kindAt(Math.floor((this.x + 4) / TILE), ty))) ty++;
      this.floorY = ty * TILE;
      this.h = this.floorY - this.y;
    }
    this.anim.update(dt);
    if (this.spray > 0) {
      this.spray -= dt;
      if (Math.random() < 0.5) world.particles.emit({ x: this.x + 4, y: this.valveY + 12, vx: (Math.random() - 0.5) * 30, vy: 60 + Math.random() * 40, life: 0.5, colour: '#a4e4fc', size: 1, gravity: 100 });
    }
  }
  /** Rect of the falling water column below the valve. */
  get sprayRect(): { x: number; y: number; w: number; h: number } | null {
    return this.spray > 0 ? { x: this.x - 4, y: this.valveY + 12, w: 16, h: Math.max(16, this.floorY - this.valveY - 12) } : null;
  }
  draw(r: Renderer, cx: number, cy: number): void {
    for (let y = this.valveY + 12; y < this.floorY; y += 2) r.rect(this.x + 3 - cx, y - cy, 2, 1, '#3c3c3c');
    r.sprite(A.VALVE, A.VALVE_PAL, this.x - 2 - cx, this.valveY - 4 - cy);
    if (this.spray > 0) {
      for (let y = this.valveY + 12; y < this.floorY; y += 8) r.sprite(this.anim.sprite, A.WATER_PAL, this.x - cx, y - cy);
    }
  }
}

/** Giant arena lantern (#24): shoot the chain to drop it; it burns where it lands. */
export class Lantern extends Static {
  kind = 'lantern';
  hostile = true; // targetable by shots
  falling = false;
  burning = 0;
  vy = 0;
  anim = new Animator({ l: A.LANTERN, f: A.FIRE }, 'l');
  private restY: number;
  /** y of the lantern itself; the entity rect spans the chain too. */
  lanternY: number;
  constructor(x: number, y: number) {
    // hit zone: the chain above plus a forgiving 40px below the lantern itself
    super(x + 4, 0, 8, y + 12 + 40);
    this.lanternY = y + 4;
    this.restY = this.lanternY;
  }
  hit(world: World): boolean {
    if (this.falling || this.burning > 0) return false;
    this.falling = true;
    audio.play('break');
    world.particles.burst(this.x + 4, this.lanternY + 4, '#f8d878', 4, 40);
    return true;
  }
  update(world: World, dt: number): void {
    this.anim.update(dt);
    if (this.falling) {
      this.vy += 600 * dt;
      this.lanternY += this.vy * dt;
      if (world.map.rectSolid(this.x, this.lanternY + 8, this.w, 1)) {
        this.falling = false;
        this.burning = 4;
        this.lanternY = Math.floor((this.lanternY + 8) / TILE) * TILE - 8;
        this.anim.play('f');
        audio.play('bomb');
      }
    } else if (this.burning > 0) {
      this.burning -= dt;
      if (Math.random() < 0.3) world.particles.emit({ x: this.x + Math.random() * 8, y: this.lanternY, vx: 0, vy: -30, life: 0.4, colour: '#f8d878', size: 1, gravity: -40 });
      if (this.burning <= 0) {
        this.dead = true;
        world.add(new LanternRespawn(this.x - 4, this.restY - 4, 6));
      }
    }
  }
  get fireRect(): { x: number; y: number; w: number; h: number } | null {
    return this.burning > 0 ? { x: this.x - 12, y: this.lanternY - 8, w: 32, h: 16 } : null;
  }
  draw(r: Renderer, cx: number, cy: number): void {
    if (this.burning > 0) r.sprite(this.anim.sprite, A.FIRE_PAL, this.x - cx, this.lanternY - cy);
    else {
      for (let y = 0; y < this.lanternY; y += 2) r.rect(this.x + 3 - cx, y - cy, 2, 1, '#3c3c3c');
      r.sprite(this.anim.sprite, A.LANTERN_PAL, this.x - cx, this.lanternY - cy);
    }
  }
}
class LanternRespawn implements Entity {
  kind = 'lantern_respawn';
  dead = false;
  w = 0;
  h = 0;
  constructor(public x: number, public y: number, private t: number) {}
  update(world: World, dt: number): void {
    this.t -= dt;
    if (this.t <= 0) {
      this.dead = true;
      world.add(new Lantern(this.x, this.y));
    }
  }
  draw(): void {}
}

/** Gill arena sluice gate (#27): Bruno breaks it, draining the arena. */
export class Sluice implements Entity {
  kind = 'sluice';
  dead = false;
  hostile = true;
  broken = false;
  hp = 3;
  constructor(public x: number, public y: number, public w = 16, public h = 32) {}
  hit(world: World, kind: string): boolean {
    if (this.broken || kind !== 'melee') return false;
    this.hp--;
    audio.play('break');
    world.camera.shake(2, 0.1);
    world.particles.burst(this.x + 8, this.y + 16, '#bcbcbc', 6, 60);
    if (this.hp <= 0) {
      this.broken = true;
      this.hostile = false;
      audio.play('splash');
      world.camera.shake(4, 0.4);
    }
    return true;
  }
  update(world: World): void {
    if (!this.broken) {
      const p = world.player;
      if (overlaps(this, p) && p.centerX < this.x + 8) {
        const pb = (p as unknown as { body: Body }).body;
        pb.x = this.x - pb.w;
        if (pb.vx > 0) pb.vx = 0;
      }
    }
  }
  draw(r: Renderer, cx: number, cy: number): void {
    r.sprite(this.broken ? A.SLUICE_BROKEN : A.SLUICE, A.SLUICE_PAL, this.x - cx, this.y - cy);
  }
}

/**
 * Finale seals (#28): each one needs a specific kid's ability.
 *  shot   – hit it with the slingshot
 *  bomb   – stun cloud touches it
 *  crate  – a crate pushed onto it
 *  vent   – Pip reaches it (it sits behind a vent)
 */
export type SealKind = 'shot' | 'bomb' | 'crate' | 'vent';
export class Seal extends Static {
  kind = 'seal';
  hostile = true;
  done = false;
  constructor(x: number, y: number, public need: SealKind) {
    super(x + 2, y + 2, 12, 12);
  }
  hit(world: World, kind: string): boolean {
    if (this.done) return false;
    if ((this.need === 'shot' && (kind === 'pebble' || kind === 'silver')) || (this.need === 'bomb' && kind === 'garlic')) {
      this.complete(world);
      return true;
    }
    return false;
  }
  complete(world: World): void {
    this.done = true;
    this.hostile = false;
    audio.play('checkpoint');
    for (let i = 0; i < 12; i++) world.particles.sparkle(this.x + Math.random() * 12, this.y + Math.random() * 12, '#9878f8');
    const seals = world.all<Seal>('seal');
    world.events.onSeal(seals.filter((s) => s.done).length, seals.length);
  }
  update(world: World): void {
    if (this.done) return;
    if (this.need === 'crate') {
      for (const c of world.all<Crate>('crate')) if (overlaps(this, c) && c.body.onGround) this.complete(world);
    } else if (this.need === 'vent' && this.touching(world)) this.complete(world);
  }
  draw(r: Renderer, cx: number, cy: number): void {
    r.sprite(this.done ? A.SEAL_ON : A.SEAL_OFF, A.SEAL_PAL, this.x - 2 - cx, this.y - 2 - cy);
  }
}

export class Portal extends Static {
  kind = 'portal';
  layer = -2;
  anim = new Animator({ p: A.PORTAL }, 'p');
  closing = 0;
  spawnTimer = 2;
  constructor(x: number, y: number) {
    super(x, y, 32, 48);
  }
  update(world: World, dt: number): void {
    this.anim.update(dt);
    if (this.closing > 0) {
      this.closing -= dt;
      if (Math.random() < 0.6) world.particles.emit({ x: this.x + 16, y: this.y + 24, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0.5, colour: '#9878f8', size: 2, gravity: 0 });
      if (this.closing <= 0) this.dead = true;
      return;
    }
    this.spawnTimer -= dt;
  }
  draw(r: Renderer, cx: number, cy: number): void {
    const s = this.anim.sprite;
    if (this.closing > 0) {
      const k = Math.max(0.05, this.closing / 2);
      r.ctx.save();
      r.ctx.translate(this.x + 16 - cx, this.y + 24 - cy);
      r.ctx.scale(k, 1);
      r.ctx.drawImage(r.atlas.get(s, A.PORTAL_PAL), -16, -24);
      r.ctx.restore();
    } else r.sprite(s, A.PORTAL_PAL, this.x - cx, this.y - cy);
  }
}

/** The redeemed Giant (#24): stands by the portal holding it shut during the finale. */
export class GiantAlly implements Entity {
  kind = 'giant_ally';
  dead = false;
  w = 32;
  h = 48;
  layer = -1;
  private t = 0;
  constructor(public x: number, public y: number) {}
  update(_w: World, dt: number): void {
    this.t += dt;
  }
  draw(r: Renderer, cx: number, cy: number): void {
    // drawn by the night scene using the GIANT sheet; kept as an entity for positioning
    const frame = Math.floor(this.t * 2) % 2;
    r.sprite(GIANT_FRAMES[frame], GIANT_PAL_REF, this.x - cx, this.y - cy);
  }
}
import { GIANT, GIANT_PAL } from './art/monsters';
const GIANT_FRAMES = GIANT.walk.frames;
const GIANT_PAL_REF = GIANT_PAL;

/** Secret-room marker (#32): reveals bonus pickups once the player enters its rect. */
export class Secret extends Static {
  kind = 'secret';
  found = false;
  constructor(x: number, y: number, w: number, h: number) {
    super(x, y, w, h);
  }
  update(world: World): void {
    if (!this.found && this.touching(world)) {
      this.found = true;
      audio.play('confirm');
      this.dead = true;
    }
  }
  draw(): void {}
}

/** Build entities for every object in the map; the scene wires special ones. */
export function spawnObject(o: MapObject, nightPage: string): Entity | null {
  switch (o.type) {
    case 'page':
      return new PagePickup(o.x, o.y, String(o.props.page ?? nightPage));
    case 'lamp':
      return new Lamp(o.x, o.y, Number(o.props.index ?? o.id));
    case 'crate':
      return new Crate(o.x, o.y);
    case 'silver':
      return new SilverPickup(o.x, o.y);
    case 'heart':
      return new HeartPickup(o.x, o.y);
    case 'exit':
      return new Exit(o.x, o.y);
    case 'valve':
      return new Valve(o.x, o.y);
    case 'lantern':
      return new Lantern(o.x, o.y);
    case 'sluice':
      return new Sluice(o.x, o.y);
    case 'seal':
      return new Seal(o.x, o.y, String(o.props.need ?? 'shot') as SealKind);
    case 'portal':
      return new Portal(o.x, o.y);
    case 'giant_ally':
      return new GiantAlly(o.x, o.y);
    case 'secret':
      return new Secret(o.x, o.y, o.w, o.h);
    default:
      return null;
  }
}
