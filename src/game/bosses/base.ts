/** Shared boss entity: body, animation, machine, weakness gating (#36), HP bar. */
import { applyGravity, makeBody, overlaps, stepBody, type Body } from '../../engine/physics';
import type { Renderer } from '../../engine/render';
import { Animator, type AnimDef, type Sprite } from '../../engine/sprites';
import { audio } from '../../engine/audio';
import { SCREEN_W } from '../../engine/constants';
import type { SpritePalette } from '../palette';
import type { Damageable, World } from '../world';
import { weaknessMultiplier, type Weakness } from '../manual';
import { BossMachine, type BossPhase } from './machine';
import { FLASH_PAL } from '../art/common';
import { SKULL, SKULL_PAL } from '../art/icons';
import { rand } from '../../engine/random';
import { HUD_H } from '../hud';
import { write } from '../design/type';

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
  /** state -> [wind-up animation, main animation]; swapped automatically around telegraphs. */
  protected windups: Record<string, [string, string]> = {};
  /** Seconds left on the hit-reaction frame. */
  hitReact = 0;
  protected defeatLength = 2;

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
   * only during vulnerability windows. Everything else sparks off and returns
   * false, so shots keep flying (you can shoot a lantern chain past the Giant).
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
      this.hitReact = 0.2;
      world.camera.shake(2, 0.12);
      world.particles.burst(this.centerX, this.centerY, 'white', 6, 70);
      const phaseChanged = this.machine.damage(dmg);
      if (phaseChanged) this.onPhaseChange(world);
      if (this.machine.dead) this.defeat(world);
      return true;
    }
    world.particles.burst(fromX < this.centerX ? this.body.x : this.body.x + this.body.w, this.centerY, 'lightGrey', 3, 40);
    audio.play('tick');
    return false;
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
    this.onDefeatStart(world);
  }

  /** Hook for a boss's defeat scene (spawn effects, change animation). */
  protected onDefeatStart(_world: World): void {}

  /**
   * The frame to show at `t` seconds into the defeat: a sprite, null to hide,
   * or undefined for the default flash-and-flicker.
   */
  protected defeatSprite(_t: number): Sprite | null | undefined {
    return undefined;
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
      this.anim.update(dt);
      if (this.defeatSprite(this.defeatTime) === undefined && rand() < 0.4)
        world.particles.burst(this.body.x + rand() * this.body.w, this.body.y + rand() * this.body.h, 'white', 2, 50);
      if (this.defeatTime > this.defeatLength) {
        this.dead = true;
        world.events.onBossDefeated(this.id);
      }
      return;
    }
    if (this.hitReact > 0) this.hitReact -= dt;
    this.machine.update(dt);
    const w = this.windups[this.machine.state];
    if (w && w[0] in this.anim.anims) this.anim.play(this.machine.telegraphing ? w[0] : w[1]);
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
    const scene = this.defeatTime >= 0 ? this.defeatSprite(this.defeatTime) : undefined;
    if (scene === null) return;
    const hit = this.hitReact > 0 && this.defeatTime < 0 && 'hit' in this.anim.anims ? this.anim.anims.hit.frames[0] : null;
    const s = scene ?? hit ?? this.anim.sprite;
    const recoil = hit ? -this.dir * 2 : 0;
    const x = b.px + (b.x - b.px) * alpha - cx + b.w / 2 - this.sw / 2 + recoil;
    const y = b.py + (b.y - b.py) * alpha - cy + b.h - s.h;
    let pal: SpritePalette = this.pal;
    if (this.flashTime > 0) pal = FLASH_PAL;
    else if (this.defeatTime >= 0 && (scene === undefined || this.defeatTime < 0.25) && Math.floor(this.defeatTime * 12) % 2 === 0) pal = FLASH_PAL;
    // default ending: flicker out, skipping more frames as it goes (no alpha on a NES)
    const fading = scene === undefined && this.defeatTime > 1.5 ? (this.defeatTime - 1.5) * 2 : 0;
    if (!fading || Math.floor(this.defeatTime * 60) % 4 >= Math.ceil(fading * 4)) r.sprite(s, pal, x, y, this.dir > 0);
    if (this.machine.stunTime > 0) r.marker('* * *', x + this.sw / 2 - 20, y - 10, 'good');
    else if (this.machine.telegraphing) r.marker('!', x + this.sw / 2 - 4, y - 10, 'accent');
  }

  /** Boss HP bar under the HUD: a skull, a framed bar, gold while vulnerable (#58). */
  drawHud(r: Renderer): void {
    if (this.introTime > 0) {
      r.box(40, 92, SCREEN_W - 80, 24, 'panel');
      write(r, 'alert', this.name, SCREEN_W / 2, 100, { align: 'center' });
      return;
    }
    const w = 100;
    const x = (SCREEN_W - w) / 2;
    const y = HUD_H + 3;
    r.sprite(SKULL, SKULL_PAL, x - 11, y);
    r.rect(x - 1, y, w + 2, 7, 'panel');
    r.rect(x - 1, y, w + 2, 1, 'shade');
    r.rect(x - 1, y + 6, w + 2, 1, 'edge');
    const filled = Math.round(w * this.machine.hpFraction);
    r.rect(x + filled, y + 2, w - filled, 3, 'edge');
    r.rect(x, y + 2, filled, 3, this.vulnerable ? 'accent' : 'danger');
    r.rect(x, y + 2, filled, 1, this.vulnerable ? 'white' : 'pink');
  }

}
