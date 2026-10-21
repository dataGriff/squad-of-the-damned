/**
 * The player (#8, #10, #11, #12, #14–#18). One entity that wears whichever kid
 * is active: hitbox, speed, jump and ability come from the Squad's current Kid.
 */
import { applyGravity, makeBody, stepBody, type Body } from '../engine/physics';
import type { Renderer } from '../engine/render';
import { Animator } from '../engine/sprites';
import { audio } from '../engine/audio';
import { TILE } from '../engine/constants';
import { KID_SHEETS } from './art/kids';
import { GarlicBomb, Shot } from './projectiles';
import { TUNING as T } from './tuning';
import type { Kid, KidId } from './squad';
import type { Player as IPlayer, World } from './world';
import type { Crate } from './objects';

export class Player implements IPlayer {
  kind = 'player';
  dead = false;
  layer = 5;
  body: Body;
  facing = 1;
  anim: Animator;
  private kidId: KidId;
  // jump tuning
  private coyote = 0;
  private buffer = 0;
  private jumpHeld = false;
  private jumpsLeft = 0;
  // state
  crouching = false;
  climbing = false;
  hitStun = 0;
  invuln = 0;
  charge = 0;
  cooldown = 0;
  abilityAnim = 0;
  pushing = false;
  holdToJump = false;
  reducedFlash = false;
  private wasOnGround = true;
  private lastVy = 0;

  constructor(x: number, y: number, kid: Kid) {
    this.kidId = kid.id;
    this.body = makeBody(x, y - kid.h, kid.w, kid.h);
    this.body.small = kid.small;
    this.anim = new Animator(KID_SHEETS[kid.id].anims, 'idle');
  }

  get x() { return this.body.x; }
  get y() { return this.body.y; }
  get w() { return this.body.w; }
  get h() { return this.body.h; }
  get vx() { return this.body.vx; }
  get vy() { return this.body.vy; }
  get onGround() { return this.body.onGround; }
  get centerX() { return this.body.x + this.body.w / 2; }
  get centerY() { return this.body.y + this.body.h / 2; }

  respawn(x: number, y: number): void {
    this.body.x = x;
    this.body.y = y - this.body.h;
    this.body.px = this.body.x;
    this.body.py = this.body.y;
    this.body.vx = this.body.vy = 0;
    this.hitStun = 0;
    this.invuln = 1;
    this.climbing = false;
    this.crouching = false;
  }

  /** Change the worn kid: keep feet planted, resize hitbox. Fails if the new body wouldn't fit. */
  wear(world: World, kid: Kid): boolean {
    const b = this.body;
    const feet = b.y + b.h;
    const cx = b.x + b.w / 2;
    const h = this.crouching ? kid.crouchH : kid.h;
    const nx = cx - kid.w / 2;
    const ny = feet - h;
    if (world.map.rectSolid(nx, ny, kid.w, h, kid.small)) {
      // try crouched
      if (!this.crouching && !world.map.rectSolid(nx, feet - kid.crouchH, kid.w, kid.crouchH, kid.small)) {
        this.crouching = true;
        b.y = feet - kid.crouchH;
        b.h = kid.crouchH;
      } else return false;
    } else {
      b.y = ny;
      b.h = h;
    }
    b.x = nx;
    b.w = kid.w;
    b.small = kid.small;
    this.kidId = kid.id;
    const cur = this.anim.current;
    this.anim = new Animator(KID_SHEETS[kid.id].anims, cur in KID_SHEETS[kid.id].anims ? cur : 'idle');
    this.jumpsLeft = kid.doubleJump && !b.onGround ? 1 : 0;
    return true;
  }

  hurt(world: World, fromX: number, dmg = 1): boolean {
    if (this.invuln > 0 || this.dead) return false;
    const died = world.squad.damage(dmg);
    this.hitStun = T.hitStun;
    this.invuln = T.invulnTime;
    const dir = this.centerX < fromX ? -1 : 1;
    this.body.vx = dir * T.knockbackX;
    this.body.vy = T.knockbackY;
    this.climbing = false;
    this.charge = 0;
    this.anim.play('hurt', true);
    audio.play('hurt');
    world.camera.shake(3, 0.2);
    world.freezeFrame(3, this.reducedFlash ? undefined : '#e40058');
    if (navigator.vibrate) navigator.vibrate(60);
    if (died) {
      this.dead = true;
      audio.play('die');
      world.particles.burst(this.centerX, this.centerY, '#fcfcfc', 14, 110);
      world.save.recordDeath(world.nightId, this.centerX, this.centerY);
      world.events.onPlayerDeath();
    }
    return true;
  }

  update(world: World, dt: number): void {
    const kid = world.squad.kid;
    const input = world.input;
    const b = this.body;
    const map = world.map;
    world.squad.tick();
    if (this.invuln > 0) this.invuln -= dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.abilityAnim > 0) this.abilityAnim -= dt;
    if (this.hitStun > 0) this.hitStun -= dt;
    const stunned = this.hitStun > 0;

    // --- swap (#14): not during hit-stun ---
    if (input.pressed('swap') && !stunned) {
      const prev = world.squad.active;
      if (world.squad.swap(1)) {
        if (!this.wear(world, world.squad.kid)) {
          world.squad.swapTo(prev);
          world.squad.swapFreeze = 0;
          world.squad.swapFlash = 0;
        } else {
          audio.play('swap');
          world.freezeFrame(T.swapFreezeTicks, this.reducedFlash ? undefined : '#fcfcfc');
          world.particles.burst(this.centerX, this.centerY, '#fcfcfc', 6, 50);
          return;
        }
      }
    }

    // --- ladders (#11) ---
    const onLadderTile = map.rectHas(b.x + 2, b.y, b.w - 4, b.h, 'ladder');
    const ladderBelow = map.kindAtPx(this.centerX, b.y + b.h + 1) === 'ladder';
    if (!stunned && !this.climbing && onLadderTile && (input.isDown('up') || (input.isDown('down') && !b.onGround))) this.startClimb(b);
    if (!stunned && !this.climbing && ladderBelow && b.onGround && input.isDown('down') && !onLadderTile) {
      this.startClimb(b);
      b.y += 2;
    }
    if (this.climbing) {
      if (!map.rectHas(b.x + 2, b.y, b.w - 4, b.h, 'ladder') && !ladderBelow) this.climbing = false;
      else if (input.pressed('jump')) {
        this.climbing = false;
        b.vy = -kid.jump * 0.6;
      } else {
        b.vy = input.axisY * T.climbSpeed;
        b.vx = input.axisX * T.climbSpeed * 0.6;
        b.ghost = true;
        stepBody(b, map, dt);
        b.ghost = false;
        if (map.rectSolid(b.x, b.y, b.w, b.h, b.small)) {
          // climbed into a solid: undo vertical move
          b.y = b.py;
        }
        if (input.axisY === 0 && input.axisX === 0) this.anim.update(0);
        else {
          this.anim.play('climb');
          this.anim.update(dt);
        }
        // standing on ground at the ladder's foot ends climbing
        if (input.axisY > 0 && map.rectSolid(b.x, b.y + 1, b.w, b.h, b.small)) this.climbing = false;
        this.wasOnGround = b.onGround;
        return;
      }
    }

    // --- crouch / crawl (#12) ---
    const wantCrouch = !stunned && b.onGround && input.isDown('down') && input.axisY > 0 && !this.climbing;
    if (wantCrouch && !this.crouching) {
      this.crouching = true;
      b.y += kid.h - kid.crouchH;
      b.h = kid.crouchH;
    } else if (!wantCrouch && this.crouching) {
      const ny = b.y - (kid.h - kid.crouchH);
      if (!map.rectSolid(b.x, ny, b.w, kid.h, b.small)) {
        this.crouching = false;
        b.y = ny;
        b.h = kid.h;
      }
    }

    // --- horizontal movement ---
    const ax = stunned ? 0 : input.axisX;
    let speed = kid.speed * (this.crouching ? T.crawlSpeed : 1);
    if (this.charge > 0 && kid.ability === 'slingshot') speed *= 0.5;
    const target = ax * speed;
    const rate = (b.onGround ? (ax === 0 ? T.decel : T.accel) : T.accel * T.airControl) * dt;
    if (!stunned || b.onGround) {
      if (b.vx < target) b.vx = Math.min(target, b.vx + rate);
      else if (b.vx > target) b.vx = Math.max(target, b.vx - rate);
    }
    if (ax !== 0 && !stunned) {
      if (this.facing !== ax && b.onGround) world.particles.dust(this.centerX, b.y + b.h, this.facing);
      this.facing = ax;
    }

    // --- jump (#8): coyote, buffer, variable height, double jump (#18) ---
    if (b.onGround) {
      this.coyote = T.coyoteTime;
      this.jumpsLeft = kid.doubleJump ? 1 : 0;
    } else this.coyote -= dt;
    if (input.pressed('jump') || (this.holdToJump && input.isDown('jump') && b.onGround && !this.jumpHeld)) this.buffer = T.jumpBuffer;
    else this.buffer -= dt;
    const dropThrough = input.isDown('down') && input.pressed('jump') && b.onGround && !this.crouching;
    if (dropThrough && map.rectHas(b.x, b.y + b.h, b.w, 2, 'oneway') && !map.rectSolid(b.x, b.y + b.h + 1, b.w, 1, b.small)) {
      b.dropThrough = true;
      b.y += 1;
      b.onGround = false;
      this.buffer = 0;
      this.coyote = 0;
    } else if (this.buffer > 0 && !stunned && !this.crouching) {
      if (this.coyote > 0) {
        this.doJump(world, kid.jump);
      } else if (this.jumpsLeft > 0 && input.pressed('jump')) {
        this.jumpsLeft--;
        this.doJump(world, kid.jump * 0.9);
        world.particles.dust(this.centerX, b.y + b.h, 0, '#f8d878');
      }
    }
    if (input.isDown('jump')) this.jumpHeld = true;
    else {
      if (this.jumpHeld && b.vy < 0 && !stunned) b.vy *= T.shortHopCut;
      this.jumpHeld = false;
    }
    if (!input.isDown('down')) b.dropThrough = false;

    // --- abilities (#15–#17) ---
    if (!stunned) this.ability(world, kid, dt);

    // --- physics ---
    const vyBefore = b.vy;
    applyGravity(b, dt, world.waterLevel !== null && b.y + b.h > world.waterLevel ? 0.4 : 1);
    stepBody(b, map, dt);
    if (b.dropThrough && !map.rectHas(b.x, b.y - 2, b.w, b.h + 4, 'oneway')) b.dropThrough = false;
    if (b.onGround && !this.wasOnGround && vyBefore > 120) {
      audio.play('land');
      world.particles.dust(this.centerX, b.y + b.h, 0);
      this.landSquash = 0.12;
    }
    if (this.landSquash > 0) this.landSquash -= dt;
    this.wasOnGround = b.onGround;
    this.lastVy = b.vy;

    // --- hazards ---
    if (map.rectHas(b.x + 2, b.y + b.h - 4, b.w - 4, 4, 'spike')) this.hurt(world, this.centerX - this.facing * 10);
    if (b.y > map.pixelHeight + 32) {
      // fell out of the level
      this.invuln = 0;
      this.hurt(world, this.centerX, world.squad.hp);
    }

    // --- crates (#17) ---
    this.pushing = false;
    if (kid.ability === 'strength' && b.onGround && ax !== 0) {
      for (const c of world.all<Crate>('crate')) {
        const touching = c.body.y < b.y + b.h && c.body.y + c.body.h > b.y && (ax > 0 ? Math.abs(c.body.x - (b.x + b.w)) < 2 : Math.abs(c.body.x + c.body.w - b.x) < 2);
        if (touching) {
          c.push(world, ax, dt);
          this.pushing = true;
        }
      }
    }

    // --- animation ---
    this.pickAnim(stunned, ax);
    this.anim.update(dt);
  }

  private landSquash = 0;

  private startClimb(b: Body): void {
    this.climbing = true;
    this.crouching = false;
    b.vx = 0;
    b.vy = 0;
    // snap to ladder column
    const tx = Math.floor((b.x + b.w / 2) / TILE);
    b.x = tx * TILE + (TILE - b.w) / 2;
  }

  private doJump(world: World, v: number): void {
    this.body.vy = -v;
    this.buffer = 0;
    this.coyote = 0;
    this.body.onGround = false;
    audio.play('jump');
    world.particles.dust(this.centerX, this.body.y + this.body.h, 0);
  }

  private ability(world: World, kid: Kid, dt: number): void {
    const input = world.input;
    const b = this.body;
    const sx = this.facing > 0 ? b.x + b.w : b.x;
    const sy = b.y + (this.crouching ? b.h / 2 : 8);
    switch (kid.ability) {
      case 'slingshot': {
        if (input.isDown('action') && this.cooldown <= 0) {
          if (this.charge === 0) audio.play('charge');
          this.charge += dt;
        }
        if (input.released('action') && this.cooldown <= 0) {
          const squad = world.squad;
          if (this.charge >= T.chargeTime) {
            world.add(new Shot(sx, sy, this.facing, 'charged', T.chargedSpeed));
            world.camera.shake(1, 0.08);
          } else if (input.isDown('up') && squad.silver > 0) {
            squad.silver--;
            world.add(new Shot(sx, sy, this.facing, 'silver', T.silverSpeed));
          } else {
            world.add(new Shot(sx, sy, this.facing, 'pebble', T.pebbleSpeed));
          }
          audio.play('shoot');
          this.charge = 0;
          this.cooldown = 0.18;
          this.abilityAnim = 0.2;
          this.anim.play('ability', true);
        }
        if (!input.isDown('action')) this.charge = 0;
        break;
      }
      case 'garlic': {
        if (input.pressed('action') && this.cooldown <= 0) {
          world.add(new GarlicBomb(sx, b.y + 4, this.facing, T.bombSpeed));
          audio.play('lob');
          this.cooldown = T.bombCooldown;
          this.abilityAnim = 0.25;
          this.anim.play('ability', true);
        }
        break;
      }
      case 'strength': {
        if (input.pressed('action') && this.cooldown <= 0) {
          this.cooldown = T.punchCooldown;
          this.abilityAnim = 0.25;
          this.anim.play('ability', true);
          const px = this.facing > 0 ? b.x + b.w : b.x - 12;
          const py = b.y + 4;
          // break cracked tiles in reach
          let broke = false;
          for (let ty = Math.floor(py / TILE); ty <= Math.floor((py + b.h - 8) / TILE); ty++) {
            const tx = Math.floor((px + 6) / TILE);
            if (world.map.kindAt(tx, ty) === 'cracked') {
              world.map.setTile(tx, ty, 0);
              world.particles.burst(tx * TILE + 8, ty * TILE + 8, '#bcbcbc', 10, 90);
              broke = true;
            }
          }
          if (broke) {
            audio.play('break');
            world.camera.shake(3, 0.15);
          } else audio.play('push');
          for (const t of world.hittables(px, py, 12, b.h - 4)) t.hit(world, 'melee', 1, this.centerX);
        }
        break;
      }
      case 'small':
        // Pip's abilities are passive: small body, double jump.
        break;
    }
  }

  private pickAnim(stunned: boolean, ax: number): void {
    const b = this.body;
    if (stunned) return this.anim.play('hurt');
    if (this.abilityAnim > 0) return this.anim.play(this.anim.current === 'ability' ? 'ability' : 'ability');
    if (this.crouching) return this.anim.play('crouch');
    if (this.pushing && this.anim.anims.push) return this.anim.play('push');
    if (!b.onGround) return this.anim.play(b.vy < 0 ? 'jump' : 'fall');
    if (ax !== 0) return this.anim.play('run');
    this.anim.play('idle');
  }

  draw(r: Renderer, cx: number, cy: number, alpha: number): void {
    if (this.dead) return;
    // i-frame flicker (#10); reduced-flash mode uses a steadier 1-in-4 skip
    if (this.invuln > 0) {
      const t = Math.floor(this.invuln * 30);
      if (this.reducedFlash ? t % 4 === 0 : t % 2 === 0) return;
    }
    const b = this.body;
    const sheet = KID_SHEETS[this.kidId];
    const sprite = this.anim.sprite;
    const x = b.px + (b.x - b.px) * alpha - cx;
    const y = b.py + (b.y - b.py) * alpha - cy;
    const sx = x + b.w / 2 - sheet.w / 2;
    const sy = y + b.h - sprite.h;
    const pal = (this.worldRef?.squad.swapFlash ?? 0) > 0 ? FLASH_PAL : (this.worldRef?.squad.kid.palette ?? FLASH_PAL);
    if (this.landSquash > 0 || this.lastVy < -200) {
      // squash/stretch (#9): draw scaled around the feet
      const sq = this.landSquash > 0 ? 0.8 : 1.1;
      const ctx = r.ctx;
      ctx.save();
      ctx.translate(Math.round(x + b.w / 2), Math.round(y + b.h));
      ctx.scale(this.facing < 0 ? -1 / sq : 1 / sq, sq);
      ctx.drawImage(r.atlas.get(sprite, pal, false), -Math.round(sheet.w / 2), -sprite.h);
      ctx.restore();
      return;
    }
    r.sprite(sprite, pal, sx, sy, this.facing < 0);
  }

  /** Set by the scene so draw can read the squad palette without a world param. */
  worldRef: World | null = null;
}

const FLASH_PAL: readonly [null, string, string, string] = [null, '#fcfcfc', '#fcfcfc', '#fcfcfc'];
