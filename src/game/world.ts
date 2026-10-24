/**
 * The World: everything a night scene simulates. Entities are plain objects
 * with update/draw; the world owns the map, camera, particles, squad and the
 * event hooks the scene listens to.
 */
import type { Camera } from '../engine/camera';
import type { InputState } from '../engine/input';
import type { Particles } from '../engine/particles';
import type { Renderer } from '../engine/render';
import type { TileMap } from '../engine/tilemap';
import type { SaveStore } from '../engine/save';
import type { Squad } from './squad';
import type { Weakness } from './manual';
import type { Colour } from './design/tokens';

export interface Entity {
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  dead: boolean;
  /** Draw order; higher is drawn later. */
  layer?: number;
  update(world: World, dt: number): void;
  draw(r: Renderer, camX: number, camY: number, alpha: number): void;
}

export interface Damageable extends Entity {
  /** Returns true if the hit landed (did damage or triggered the object). */
  hit(world: World, kind: Weakness | 'melee' | 'pebble', damage: number, fromX: number): boolean;
  stun?(seconds: number): void;
  /** Targetable right now (hidden hands and spent props set this false). */
  hostile: boolean;
}

export function isDamageable(e: Entity): e is Damageable {
  return typeof (e as Damageable).hit === 'function';
}

export interface WorldEvents {
  onPlayerDeath(): void;
  onLevelComplete(): void;
  onBossDefeated(id: string): void;
  onPage(id: string): void;
  onCheckpoint(index: number): void;
  onSeal(count: number, total: number): void;
}

export interface Player extends Entity {
  facing: number;
  vx: number;
  vy: number;
  onGround: boolean;
  invuln: number;
  hurt(world: World, fromX: number, dmg?: number): boolean;
  respawn(x: number, y: number): void;
  readonly centerX: number;
  readonly centerY: number;
  readonly crouching: boolean;
}

export class World {
  entities: Entity[] = [];
  time = 0;
  /** Set during the freeze-frame on swap/hit: entities skip updates. */
  freeze = 0;
  flash = 0;
  flashColour: Colour = 'white';
  waterLevel: number | null = null;
  nightId: string;
  player!: Player;
  bossActive: string | null = null;
  readonly events: WorldEvents;

  constructor(
    public map: TileMap,
    public camera: Camera,
    public particles: Particles,
    public squad: Squad,
    public save: SaveStore,
    public input: InputState,
    events: WorldEvents,
    nightId: string,
  ) {
    this.events = events;
    this.nightId = nightId;
  }

  add<T extends Entity>(e: T): T {
    this.entities.push(e);
    return e;
  }

  hasPage(id: string): boolean {
    return this.save.hasPage(id);
  }

  find<T extends Entity>(kind: string): T | undefined {
    return this.entities.find((e) => e.kind === kind && !e.dead) as T | undefined;
  }
  all<T extends Entity>(kind: string): T[] {
    return this.entities.filter((e) => e.kind === kind && !e.dead) as T[];
  }

  freezeFrame(ticks: number, flash?: Colour): void {
    this.freeze = Math.max(this.freeze, ticks);
    if (flash) {
      this.flash = 3;
      this.flashColour = flash;
    }
  }

  update(dt: number): void {
    this.time += dt;
    if (this.freeze > 0) {
      this.freeze--;
      this.flash = Math.max(0, this.flash - 1);
      return;
    }
    this.flash = Math.max(0, this.flash - 1);
    for (const e of this.entities) if (!e.dead) e.update(this, dt);
    this.entities = this.entities.filter((e) => !e.dead);
    this.particles.update(dt);
  }

  /** Damageables overlapping a rect. */
  hittables(x: number, y: number, w: number, h: number): Damageable[] {
    const out: Damageable[] = [];
    for (const e of this.entities) {
      if (e.dead || !isDamageable(e) || !e.hostile) continue;
      if (x < e.x + e.w && x + w > e.x && y < e.y + e.h && y + h > e.y) out.push(e);
    }
    return out;
  }
}
