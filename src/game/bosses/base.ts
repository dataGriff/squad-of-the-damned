/** Shared boss entity: body, animation, machine, weakness gating (#36), HP bar. */
import { applyGravity, makeBody, overlaps, stepBody, type Body } from '../../engine/physics';
import type { Renderer } from '../../engine/render';
import { Animator, type AnimDef } from '../../engine/sprites';
import { audio } from '../../engine/audio';
import { SCREEN_W } from '../../engine/constants';
import type { SpritePalette } from '../palette';
import type { Damageable, World } from '../world';
import { weaknessMultiplier, type Weakness } from '../manual';
import { BossMachine, type BossPhase } from './machine';
import { WHITE } from '../enemies/base';

export abstract class Boss implements Damageable {
  kind = 'boss';
  dead = false;
  hostile = true;
  layer = 4;
  body: Body;
  dir = -1;
  anim: Animator;
  machine!: BossMachine<this>;
  flashTime = 0;
  /** Seconds since defeat started (death animation). */
  defeatTime = -1;
  introTime = 1.5;
  abstract id: string;
  abstract name: string;
  abstract weakness: Weakness;
  arenaX = 0;
  arenaW = SCREEN_W;

  constructor(x: number, y: number, w: number, h: number, anims: Record<string, AnimDef>, public pal: SpritePalette, public sw: number, public sh: number) {
    this.body = makeBody(x, y, w, h);
    this.anim = new Animator(anims, 'idle');
  }
  protected init(phases: BossPhase<this>[], hp: number): void {
    this.machine = new BossMachine<this>(phases, hp, this);
  }

  get x() { return this.body.x; }
  get y() { return this.body.y; }
  get w() { return this.body.w; }
  get h() { return this.body.h; }
  get centerX() { return this.body.x + this.body.w / 2; }
  get centerY() { return this.body.y + this.body.h / 2; }
  get vulnerable(): boolean {
    return this.machine.vulnerable;
  }

  /** Does this attack kind count as the weakness for this boss? */
  protected matchesWeakness(kind: Weakness | 'melee' | 'pebble'): boolean {
    return kind === this.weakness;
  }

  /**
   * Damage rules (#36): the weakness only works once the page is found, and
   * only during vulnerability windows. Everything else just sparks off.
   */
  hit(world: World, kind: Weakness | 'melee' | 'pebble', damage: number, fromX: number): boolean {
    if (this.dead || this.defeatTime >= 0 || this.introTime > 0) return false;
    const hasPage = world.hasPage(this.id);
    let dmg = 0;
    if (this.matchesWeakness(kind)) dmg = damage * weaknessMultiplier(this.id, kind as Weakness, (id) => world.hasPage(id));
    else if (this.vulnerable && hasPage) dmg = damage; // open window: anything hurts
    this.onHit(world, kind, dmg, fromX);
    if (dmg > 0) {
      audio.play('bossHit');
      this.flashTime = 0.12;
      world.camera.shake(2, 0.12);
      world.particles.burst(this.centerX, this.centerY, '#fcfcfc', 6, 70);
      const phaseChanged = this.machine.damage(dmg);
      if (phaseChanged) this.onPhaseChange(world);
      if (this.machine.dead) this.defeat(world);
    } else {
      world.particles.burst(fromX < this.centerX ? this.body.x : this.body.x + this.body.w, this.centerY, '#bcbcbc', 3, 40);
      audio.play('tick');
    }
    return true;
  }
  /** Hook for bosses that react to specific hit kinds (stun, wet, etc.). */
  protected onHit(_world: World, _kind: string, _dmg: number, _fromX: number): void {}
  protected onPhaseChange(world: World): void {
    audio.play('roar');
    world.camera.shake(4, 0.3);
  }
  stun(seconds: number): void {
    this.machine.stun(seconds);
  }

  defeat(world: World): void {
    this.defeatTime = 0;
    this.hostile = false;
    audio.play('bossDie');
    world.camera.shake(5, 0.6);
  }

  update(world: World, dt: number): void {
    if (this.flashTime > 0) this.flashTime -= dt;
    if (this.introTime > 0) {
      this.introTime -= dt;
      this.anim.update(dt);
      return;
    }
    if (this.defeatTime >= 0) {
      this.defeatTime += dt;
      if (Math.random() < 0.4) world.particles.burst(this.body.x + Math.random() * this.body.w, this.body.y + Math.random() * this.body.h, '#fcfcfc', 2, 50);
      if (this.defeatTime > 2) {
        this.dead = true;
        world.events.onBossDefeated(this.id);
      }
      return;
    }
    this.machine.update(dt);
    this.anim.update(dt);
    this.contact(world);
  }

  contact(world: World): void {
    if (this.machine.stunTime > 0) return;
    if (overlaps(this.body, world.player)) world.player.hurt(world, this.centerX);
  }

  /** Ground movement helper. */
  walk(world: World, dt: number, vx: number): void {
    const b = this.body;
    b.vx = vx;
    applyGravity(b, dt);
    stepBody(b, world.map, dt);
    // keep inside the arena
    if (b.x < this.arenaX) b.x = this.arenaX;
    if (b.x + b.w > this.arenaX + this.arenaW) b.x = this.arenaX + this.arenaW - b.w;
  }

  facePlayer(world: World): void {
    this.dir = world.player.centerX < this.centerX ? -1 : 1;
  }

  draw(r: Renderer, cx: number, cy: number, alpha: number): void {
    const b = this.body;
    const s = this.anim.sprite;
    const x = b.px + (b.x - b.px) * alpha - cx + b.w / 2 - this.sw / 2;
    const y = b.py + (b.y - b.py) * alpha - cy + b.h - s.h;
    let pal: SpritePalette = this.pal;
    if (this.flashTime > 0) pal = WHITE;
    else if (this.defeatTime >= 0 && Math.floor(this.defeatTime * 12) % 2 === 0) pal = WHITE;
    if (this.defeatTime >= 0 && this.defeatTime > 1.5) r.ctx.globalAlpha = Math.max(0, 1 - (this.defeatTime - 1.5) * 2);
    r.sprite(s, pal, x, y, this.dir > 0);
    r.ctx.globalAlpha = 1;
    if (this.machine.stunTime > 0) r.text('* * *', x + this.sw / 2 - 20, y - 10, '#b8f8d8');
    else if (this.machine.telegraphing) r.text('!', x + this.sw / 2 - 4, y - 10, '#f8d878');
  }

  /** Boss HP bar at the top of the screen. */
  drawHud(r: Renderer): void {
    if (this.introTime > 0) {
      r.textCentered(this.name, 100, '#e40058');
      return;
    }
    const w = 96;
    const x = (SCREEN_W - w) / 2;
    r.rect(x - 1, 17, w + 2, 6, '#000000');
    r.rect(x, 18, Math.round(w * this.machine.hpFraction), 4, this.vulnerable ? '#f8d878' : '#e40058');
  }
}
