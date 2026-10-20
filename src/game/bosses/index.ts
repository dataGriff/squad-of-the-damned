/** The five bosses (#23–#27), each a small set of phases/states on the framework. */
import { overlaps } from '../../engine/physics';
import type { Renderer } from '../../engine/render';
import { audio } from '../../engine/audio';
import { TILE } from '../../engine/constants';
import { GIANT, GIANT_PAL, GILL, GILL_PAL, MUMMY, MUMMY_PAL, VAMPIRE, VAMPIRE_PAL, WOLFMAN, WOLF_PAL } from '../art/monsters';
import { BANDAGE, BANDAGE_PAL } from '../art/items';
import { Boss } from './base';
import type { BossPhase } from './machine';
import type { World } from '../world';
import type { Weakness } from '../manual';
import { Bat } from '../enemies/fodder';
import { Boulder, Bubble } from '../projectiles';
import type { Lantern, Sluice, Valve } from '../objects';

/* ------------------------------------------------------------------ */
/* Night 1: the Vampire Count (#23)                                     */
/* ------------------------------------------------------------------ */
export class VampireCount extends Boss {
  id = 'vampire';
  name = 'THE COUNT';
  weakness: Weakness = 'garlic';
  private bats: Bat[] = [];
  private hover = 0;
  private targetX = 0;
  constructor(x: number, y: number) {
    super(x, y - 32, 16, 30, VAMPIRE, VAMPIRE_PAL, 24, 32);
    this.body.ghost = true;
    const self = this;
    const common = {
      stunned: {
        vulnerable: true,
        enter() {
          self.anim.play('stun');
        },
        update(_c: VampireCount, m: { stateTime: number }) {
          self.body.vx = self.body.vy = 0;
          if (m.stateTime > 2.5) return 'float';
        },
      },
    };
    const phases: BossPhase<VampireCount>[] = [
      {
        name: 'cape',
        until: 0.5,
        initial: 'float',
        states: {
          float: {
            enter() {
              self.anim.play('idle');
              self.hover = 0;
            },
            update(c, m, dt) {
              c.hover += dt;
              c.facePlayer(c.world!);
              const b = c.body;
              b.vx = (c.targetX - b.x) * 2;
              b.vy = Math.sin(c.hover * 3) * 20;
              c.move(dt);
              if (m.stateTime > 1.8) return 'swoop';
            },
          },
          swoop: {
            telegraph: 0.6,
            enter() {
              self.anim.play('cape');
              self.facePlayer(self.world!);
            },
            update(c, m, dt) {
              const b = c.body;
              if (m.telegraphing) {
                b.vx = 0;
                b.vy = -10;
              } else {
                b.vx = c.dir * 170;
                b.vy = (c.world!.player.centerY - c.centerY) * 2;
              }
              c.move(dt);
              if (!m.telegraphing && (b.x <= c.arenaX + 4 || b.x + b.w >= c.arenaX + c.arenaW - 4)) {
                c.targetX = c.arenaX + 40 + Math.random() * (c.arenaW - 80);
                return 'float';
              }
            },
          },
          ...common,
        },
      },
      {
        name: 'bats',
        until: 0,
        initial: 'scatter',
        onEnter() {
          self.anim.play('cape');
        },
        states: {
          scatter: {
            enter() {
              // bat form: become a swarm, invulnerable
              self.hostile = false;
              const w = self.world!;
              self.bats = [];
              for (let i = 0; i < 4; i++) {
                const bat = new Bat(self.body.x, self.body.y + i * 6);
                bat.opts.contactDamage = 1;
                self.bats.push(w.add(bat));
              }
            },
            update(c, m) {
              // follow the swarm's centre; reform after a while or when all bats die
              const alive = c.bats.filter((b) => !b.dead);
              if (alive.length) {
                c.body.x = alive.reduce((s, b) => s + b.x, 0) / alive.length;
                c.body.y = alive.reduce((s, b) => s + b.y, 0) / alive.length;
              }
              if (m.stateTime > 4 || alive.length === 0) return 'reform';
            },
            exit() {
              for (const b of self.bats) b.dead = true;
              self.hostile = true;
            },
          },
          reform: {
            telegraph: 0.5,
            enter() {
              self.anim.play('idle');
            },
            update(c, m) {
              if (!m.telegraphing) {
                c.targetX = c.body.x;
                return 'float';
              }
            },
          },
          float: {
            enter() {
              self.anim.play('idle');
            },
            update(c, m, dt) {
              c.hover += dt;
              c.facePlayer(c.world!);
              c.body.vx = (c.targetX - c.body.x) * 2;
              c.body.vy = Math.sin(c.hover * 4) * 25;
              c.move(dt);
              if (m.stateTime > 1.2) return 'swoop';
            },
          },
          swoop: {
            telegraph: 0.4,
            enter() {
              self.anim.play('cape');
              self.facePlayer(self.world!);
            },
            update(c, m, dt) {
              const b = c.body;
              if (m.telegraphing) b.vx = b.vy = 0;
              else {
                b.vx = c.dir * 200;
                b.vy = (c.world!.player.centerY - c.centerY) * 2.5;
              }
              c.move(dt);
              if (!m.telegraphing && (b.x <= c.arenaX + 4 || b.x + b.w >= c.arenaX + c.arenaW - 4)) {
                c.targetX = c.arenaX + 40 + Math.random() * (c.arenaW - 80);
                return m.history.filter((h) => h === 'swoop').length % 3 === 0 ? 'scatter' : 'float';
              }
            },
          },
          ...common,
        },
      },
    ];
    this.init(phases, 6);
    this.targetX = x;
  }
  world: World | null = null;
  move(dt: number): void {
    const b = this.body;
    b.px = b.x;
    b.py = b.y;
    b.x = Math.max(this.arenaX + 2, Math.min(this.arenaX + this.arenaW - b.w - 2, b.x + b.vx * dt));
    b.y = Math.max(this.arenaTop + 24, Math.min(this.arenaTop + 180, b.y + b.vy * dt));
  }
  arenaTop = 0;
  update(world: World, dt: number): void {
    this.world = world;
    super.update(world, dt);
  }
  protected onHit(world: World, kind: string): void {
    // Garlic stuns him only once the page is known (#36); while stunned anything hurts.
    if (kind === 'garlic' && world.hasPage(this.id) && this.machine.state !== 'scatter' && this.machine.state !== 'stunned') {
      this.machine.transition('stunned');
      audio.play('stun');
    }
  }
  stun(): void {
    /* handled by onHit so the page gate applies */
  }
  contact(world: World): void {
    if (this.machine.state === 'stunned' || this.machine.state === 'scatter') return;
    super.contact(world);
  }
}

/* ------------------------------------------------------------------ */
/* Night 2: the Stitched Giant (#24) — redemption twist                  */
/* ------------------------------------------------------------------ */
export class StitchedGiant extends Boss {
  id = 'giant';
  name = 'THE STITCHED GIANT';
  weakness: Weakness = 'fire';
  burnTick = 0;
  redeemed = false;
  constructor(x: number, y: number) {
    super(x, y - 48, 24, 46, GIANT, GIANT_PAL, 32, 52);
    const self = this;
    const walk = (speed: number, throwAfter: number): BossPhase<StitchedGiant>['states'] => ({
      walk: {
        enter() {
          self.anim.play('walk');
        },
        update(c, m, dt) {
          c.facePlayer(c.world!);
          c.walk(c.world!, dt, c.dir * speed);
          if (m.stateTime > throwAfter) return 'throw';
        },
      },
      throw: {
        telegraph: 0.8,
        enter() {
          self.anim.play('throw');
          self.facePlayer(self.world!);
        },
        update(c, m, dt) {
          c.walk(c.world!, dt, 0);
          if (!m.telegraphing) {
            const p = c.world!.player;
            const dx = p.centerX - c.centerX;
            const n = speed > 25 ? 2 : 1;
            for (let i = 0; i < n; i++) c.world!.add(new Boulder(c.centerX + c.dir * 10, c.body.y + 8, dx * 1.1 + (i ? 40 * c.dir : 0), -220 - i * 40));
            audio.play('roar');
            return 'walk';
          }
        },
      },
      burn: {
        vulnerable: true,
        enter() {
          self.anim.play('burn');
        },
        update(c, m, dt) {
          c.walk(c.world!, dt, -c.dir * 15);
          if (m.stateTime > 1.5) return 'walk';
        },
      },
    });
    this.init(
      [
        { name: 'slow', until: 0.5, initial: 'walk', states: walk(20, 2.2) },
        { name: 'angry', until: 0, initial: 'walk', states: walk(32, 1.4) },
      ],
      6,
    );
  }
  world: World | null = null;
  update(world: World, dt: number): void {
    this.world = world;
    super.update(world, dt);
    if (this.defeatTime >= 0 || this.introTime > 0) return;
    // standing in lantern fire (#24): burns if the page is known
    this.burnTick -= dt;
    for (const l of world.all<Lantern>('lantern')) {
      const f = l.fireRect;
      if (f && overlaps(f, this.body) && this.burnTick <= 0) {
        this.burnTick = 0.5;
        if (this.machine.state !== 'burn' && world.hasPage(this.id)) this.machine.transition('burn');
        this.hit(world, 'fire', 1, f.x);
      }
    }
  }
  /** The twist: he doesn't die. He sits down, and later helps at the portal. */
  defeat(world: World): void {
    super.defeat(world);
    this.redeemed = true;
    world.save.data.giantAlly = true;
    world.save.save();
  }
  draw(r: Renderer, cx: number, cy: number, alpha: number): void {
    if (this.redeemed && this.defeatTime >= 0) {
      const b = this.body;
      r.ctx.globalAlpha = 1;
      r.sprite(GIANT.idle.frames[0], GIANT_PAL, b.x - cx + b.w / 2 - 16, b.y - cy + b.h - 52, this.dir > 0);
      if (this.defeatTime > 0.6) r.textCentered('...HE JUST WANTED A FRIEND.', 60, '#fcfcfc');
      return;
    }
    super.draw(r, cx, cy, alpha);
  }
  update2(): void {}
}

/* ------------------------------------------------------------------ */
/* Night 3: the Wolfman (#25) — two phases, howl summons bats           */
/* ------------------------------------------------------------------ */
export class Wolfman extends Boss {
  id = 'wolfman';
  name = 'THE WOLFMAN';
  weakness: Weakness = 'silver';
  constructor(x: number, y: number) {
    super(x, y - 30, 22, 28, WOLFMAN, WOLF_PAL, 32, 26);
    const self = this;
    const mk = (lungeSpeed: number, paceTime: number, howls: boolean): BossPhase<Wolfman>['states'] => ({
      pace: {
        enter() {
          self.anim.play('idle');
        },
        update(c, m, dt) {
          c.facePlayer(c.world!);
          const far = Math.abs(c.world!.player.centerX - c.centerX) > 70;
          c.walk(c.world!, dt, far ? c.dir * 45 : -c.dir * 30);
          if (m.stateTime > paceTime) {
            if (howls && m.history.filter((h) => h === 'lunge').length % 2 === 1) return 'howl';
            return 'lunge';
          }
        },
      },
      lunge: {
        telegraph: 0.55,
        enter() {
          self.anim.play('idle');
          self.facePlayer(self.world!);
        },
        update(c, m, dt) {
          if (m.telegraphing) {
            c.walk(c.world!, dt, 0);
            if (m.stateTime > 0.3) c.anim.play('lunge');
            return;
          }
          c.walk(c.world!, dt, c.dir * lungeSpeed);
          if (m.stateTime > 0.55 + 0.45 || c.body.hitWall) return 'recover';
        },
      },
      recover: {
        vulnerable: true,
        enter() {
          self.anim.play('stun');
        },
        update(c, m, dt) {
          c.walk(c.world!, dt, 0);
          if (m.stateTime > 1.2) return 'pace';
        },
      },
      howl: {
        telegraph: 0.7,
        enter() {
          self.anim.play('howl');
          audio.play('howl');
        },
        update(c, m, dt) {
          c.walk(c.world!, dt, 0);
          if (!m.telegraphing) {
            const w = c.world!;
            for (let i = 0; i < 2; i++) w.add(new Bat(c.arenaX + 40 + i * (c.arenaW - 96), c.body.y - 40));
            w.camera.shake(3, 0.3);
            return 'pace';
          }
        },
      },
    });
    this.init(
      [
        { name: 'prowl', until: 0.5, initial: 'pace', states: mk(210, 1.2, false) },
        { name: 'frenzy', until: 0, initial: 'pace', states: mk(260, 0.8, true) },
      ],
      6,
    );
  }
  world: World | null = null;
  update(world: World, dt: number): void {
    this.world = world;
    super.update(world, dt);
  }
  /** Silver only lands in the recovery window; pebbles just annoy him. */
  hit(world: World, kind: Weakness | 'melee' | 'pebble', damage: number, fromX: number): boolean {
    if (kind === 'silver' && !this.vulnerable) {
      world.particles.burst(fromX < this.centerX ? this.body.x : this.body.x + this.body.w, this.centerY, '#fcfcfc', 3, 40);
      audio.play('tick');
      return false;
    }
    return super.hit(world, kind, damage, fromX);
  }
}

/* ------------------------------------------------------------------ */
/* Night 4: the Mummy (#26) — bandage grapple, water weakness           */
/* ------------------------------------------------------------------ */
export class Mummy extends Boss {
  id = 'mummy';
  name = 'THE MUMMY';
  weakness: Weakness = 'water';
  wet = 0;
  bandageLen = 0;
  grabbed = false;
  constructor(x: number, y: number) {
    super(x, y - 30, 16, 30, MUMMY, MUMMY_PAL, 24, 32);
    const self = this;
    const mk = (speed: number, reach: number, shuffleTime: number): BossPhase<Mummy>['states'] => ({
      shuffle: {
        enter() {
          self.anim.play('idle');
          self.bandageLen = 0;
          self.grabbed = false;
        },
        update(c, m, dt) {
          c.facePlayer(c.world!);
          c.walk(c.world!, dt, c.dir * (c.wet > 0 ? speed * 0.4 : speed));
          if (m.stateTime > shuffleTime && c.wet <= 0 && Math.abs(c.world!.player.centerY - c.centerY) < 24) return 'grapple';
        },
      },
      grapple: {
        telegraph: 0.5,
        enter() {
          self.anim.play('grapple');
          self.facePlayer(self.world!);
        },
        update(c, m, dt) {
          c.walk(c.world!, dt, 0);
          if (m.telegraphing) return;
          const p = c.world!.player;
          if (!c.grabbed) {
            c.bandageLen = Math.min(reach, c.bandageLen + 220 * dt);
            const bx = c.dir > 0 ? c.centerX : c.centerX - c.bandageLen;
            const rect = { x: bx, y: c.body.y + 8, w: c.bandageLen, h: 6 };
            if (overlaps(rect, p)) {
              c.grabbed = true;
              audio.play('hit');
            }
            if (c.bandageLen >= reach && m.stateTime > 0.5 + reach / 220 + 0.2) return 'shuffle';
          } else {
            // reel the player in
            const pb = (p as unknown as { body: { x: number; vx: number; vy: number } }).body;
            pb.x += (c.centerX - p.centerX) * 6 * dt;
            pb.vx = 0;
            c.bandageLen = Math.abs(p.centerX - c.centerX);
            if (Math.abs(p.centerX - c.centerX) < 14) {
              p.hurt(c.world!, c.centerX);
              return 'shuffle';
            }
            if (m.stateTime > 2.5) return 'shuffle';
          }
        },
      },
      soaked: {
        vulnerable: true,
        enter() {
          self.anim.play('wet');
          self.bandageLen = 0;
          self.grabbed = false;
        },
        update(c, m, dt) {
          c.walk(c.world!, dt, -c.dir * 10);
          if (c.wet <= 0) return 'shuffle';
          if (m.stateTime > 4) return 'shuffle';
        },
      },
    });
    this.init(
      [
        { name: 'dusty', until: 0.5, initial: 'shuffle', states: mk(28, 80, 1.2) },
        { name: 'unravelling', until: 0, initial: 'shuffle', states: mk(40, 110, 0.7) },
      ],
      6,
    );
  }
  world: World | null = null;
  update(world: World, dt: number): void {
    this.world = world;
    super.update(world, dt);
    if (this.defeatTime >= 0 || this.introTime > 0) return;
    if (this.wet > 0) this.wet -= dt;
    for (const v of world.all<Valve>('valve')) {
      const s = v.sprayRect;
      if (s && overlaps(s, this.body)) {
        if (this.wet <= 0 && world.hasPage(this.id)) {
          audio.play('splash');
          this.machine.transition('soaked');
        }
        this.wet = 3;
      }
    }
    this.machine.forcedVulnerable = this.wet > 0 && world.hasPage(this.id);
  }
  /** Water damage comes from standing in the spray: any hit while wet hurts. */
  protected matchesWeakness(): boolean {
    return false;
  }
  contact(world: World): void {
    if (this.machine.state === 'grapple' && this.grabbed) return;
    super.contact(world);
  }
  draw(r: Renderer, cx: number, cy: number, alpha: number): void {
    super.draw(r, cx, cy, alpha);
    if (this.bandageLen > 0) {
      const y = this.body.y + 9 - cy;
      for (let i = 0; i < this.bandageLen; i += 4) {
        const x = this.dir > 0 ? this.centerX + i : this.centerX - i - 4;
        r.sprite(BANDAGE, BANDAGE_PAL, x - cx, y + Math.round(Math.sin((i + this.world!.time * 100) / 6)));
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Night 5: the Gill Creature (#27) — drain the arena to beat it        */
/* ------------------------------------------------------------------ */
export class GillCreature extends Boss {
  id = 'gill';
  name = 'THE GILL CREATURE';
  weakness: Weakness = 'drain';
  drained = false;
  arenaTop = 0;
  constructor(x: number, y: number) {
    super(x, y - 30, 20, 28, GILL, GILL_PAL, 32, 32);
    const self = this;
    this.init(
      [
        {
          name: 'swimming',
          until: 0.5,
          initial: 'lurk',
          states: {
            lurk: {
              enter() {
                self.anim.play('idle');
              },
              update(c, m, dt) {
                c.swim(dt, true);
                if (m.stateTime > 1.5) return Math.random() < 0.5 ? 'leap' : 'spit';
              },
            },
            leap: {
              telegraph: 0.5,
              enter() {
                self.facePlayer(self.world!);
              },
              update(c, m, dt) {
                if (m.telegraphing) {
                  c.swim(dt, true);
                  return;
                }
                if (m.stateTime < 0.5 + dt * 1.5) {
                  c.anim.play('attack');
                  c.body.vy = -260;
                  c.body.vx = c.dir * 120;
                  audio.play('splash');
                }
                c.fly(dt);
                if (m.stateTime > 1.6) return 'lurk';
              },
            },
            spit: {
              telegraph: 0.4,
              enter() {
                self.facePlayer(self.world!);
                self.anim.play('attack');
              },
              update(c, m, dt) {
                c.swim(dt, false);
                if (!m.telegraphing && m.stateTime < 0.4 + dt * 1.5) {
                  for (let i = -1; i <= 1; i++) c.world!.add(new Bubble(c.centerX, c.body.y, c.dir * 50, -70 + i * 30));
                }
                if (m.stateTime > 1.2) return 'lurk';
              },
            },
            gasp: {
              vulnerable: true,
              enter() {
                self.anim.play('gasp');
              },
              update(c, m, dt) {
                c.walk(c.world!, dt, c.dir * 20);
                if (c.body.hitWall) c.dir = -c.dir;
                if (m.stateTime > 3 && !c.drained) return 'lurk';
              },
            },
          },
        },
        {
          name: 'thrashing',
          until: 0,
          initial: 'lurk',
          states: {
            lurk: {
              enter() {
                self.anim.play('idle');
              },
              update(c, m, dt) {
                c.swim(dt, true);
                if (m.stateTime > 0.9) return 'leap';
              },
            },
            leap: {
              telegraph: 0.35,
              enter() {
                self.facePlayer(self.world!);
              },
              update(c, m, dt) {
                if (m.telegraphing) {
                  c.swim(dt, true);
                  return;
                }
                if (m.stateTime < 0.35 + dt * 1.5) {
                  c.anim.play('attack');
                  c.body.vy = -280;
                  c.body.vx = c.dir * 150;
                  audio.play('splash');
                  for (let i = -1; i <= 1; i += 2) c.world!.add(new Bubble(c.centerX, c.body.y, i * 60, -40));
                }
                c.fly(dt);
                if (m.stateTime > 1.5) return 'lurk';
              },
            },
            gasp: {
              vulnerable: true,
              enter() {
                self.anim.play('gasp');
              },
              update(c, m, dt) {
                c.walk(c.world!, dt, c.dir * 35);
                if (c.body.hitWall) c.dir = -c.dir;
                if (m.stateTime > 2.5 && !c.drained) return 'lurk';
              },
            },
          },
        },
      ],
      6,
    );
  }
  world: World | null = null;
  /** Swim along the water surface toward (or away from) the player. */
  swim(dt: number, chase: boolean): void {
    const w = this.world!;
    const b = this.body;
    const surface = (w.waterLevel ?? this.arenaTop + 160) - 10;
    this.facePlayer(w);
    b.px = b.x;
    b.py = b.y;
    b.vx = chase ? this.dir * 40 : 0;
    b.x = Math.max(this.arenaX + 2, Math.min(this.arenaX + this.arenaW - b.w - 2, b.x + b.vx * dt));
    b.y += (surface - b.y) * 4 * dt + Math.sin(w.time * 3) * 6 * dt;
    if (Math.random() < 0.1) w.particles.emit({ x: b.x + Math.random() * b.w, y: surface + 10, vx: 0, vy: -20, life: 0.4, colour: '#a4e4fc', size: 1, gravity: 0 });
  }
  fly(dt: number): void {
    const b = this.body;
    b.px = b.x;
    b.py = b.y;
    b.vy += 500 * dt;
    b.x = Math.max(this.arenaX + 2, Math.min(this.arenaX + this.arenaW - b.w - 2, b.x + b.vx * dt));
    b.y += b.vy * dt;
  }
  update(world: World, dt: number): void {
    this.world = world;
    super.update(world, dt);
    if (this.defeatTime >= 0 || this.introTime > 0) return;
    const sluice = world.find<Sluice>('sluice');
    if (sluice?.broken && !this.drained) {
      this.drained = true;
      if (world.hasPage(this.id)) this.machine.transition('gasp');
    }
    if (this.drained) {
      // keep him beached on the floor
      this.body.ghost = false;
      this.machine.forcedVulnerable = world.hasPage(this.id);
      if (this.machine.state !== 'gasp' && world.hasPage(this.id)) this.machine.transition('gasp');
    } else this.body.ghost = true;
  }
  protected matchesWeakness(): boolean {
    return false;
  }
}

export function spawnBoss(id: string, x: number, y: number): Boss | null {
  switch (id) {
    case 'vampire':
      return new VampireCount(x, y);
    case 'giant':
      return new StitchedGiant(x, y);
    case 'wolfman':
      return new Wolfman(x, y);
    case 'mummy':
      return new Mummy(x, y);
    case 'gill':
      return new GillCreature(x, y);
    default:
      return null;
  }
}

export const TILE_SIZE = TILE;
