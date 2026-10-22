/**
 * Particle pool (#9, #20; sprite particles for #58). Each particle can be a
 * tiny animated sprite (dust puff, spark, tumbling chip, water drop) in a
 * single colour, so effects look drawn rather than like coloured squares.
 */
import { defineSprite, type Sprite } from './sprites';
import type { Renderer } from './render';

export type ParticleKind = 'square' | 'puff' | 'spark' | 'chip' | 'drop';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  colour: string;
  size: number;
  gravity: number;
  kind?: ParticleKind;
}

/** Frames per kind, played over the particle's life (chips tumble instead). */
export const PARTICLE_FRAMES: Record<Exclude<ParticleKind, 'square'>, Sprite[]> = {
  puff: [
    defineSprite('pt_puff_0', ['.1.', '111', '.1.']),
    defineSprite('pt_puff_1', ['.11.', '1111', '1111', '.11.']),
    defineSprite('pt_puff_2', ['.1.1.', '1...1', '.....', '1...1', '.1.1.']),
  ],
  spark: [
    defineSprite('pt_spark_0', ['1']),
    defineSprite('pt_spark_1', ['.1.', '111', '.1.']),
    defineSprite('pt_spark_2', ['..1..', '..1..', '11.11', '..1..', '..1..']),
    defineSprite('pt_spark_3', ['1.1', '...', '1.1']),
  ],
  chip: [defineSprite('pt_chip_0', ['11', '1.']), defineSprite('pt_chip_1', ['.1', '11']), defineSprite('pt_chip_2', ['1.', '11']), defineSprite('pt_chip_3', ['11', '.1'])],
  drop: [defineSprite('pt_drop_0', ['1', '1']), defineSprite('pt_drop_1', ['1', '1']), defineSprite('pt_drop_2', ['1'])],
};

export function allParticleSprites(): Sprite[] {
  return Object.values(PARTICLE_FRAMES).flat();
}

export class Particles {
  list: Particle[] = [];
  max = 200;
  reduced = false;

  emit(p: Omit<Particle, 'maxLife'>): void {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({ ...p, maxLife: p.life });
  }

  dust(x: number, y: number, dir = 0, colour = '#bcbcbc'): void {
    const n = this.reduced ? 2 : 4;
    for (let i = 0; i < n; i++) {
      this.emit({ x: x + (Math.random() - 0.5) * 8, y: y - 2, vx: (Math.random() - 0.5) * 40 - dir * 20, vy: -Math.random() * 25, life: 0.3 + Math.random() * 0.15, colour, size: 1, gravity: 40, kind: 'puff' });
    }
  }

  burst(x: number, y: number, colour: string, n = 10, speed = 90): void {
    if (this.reduced) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const s = speed * (0.5 + Math.random() * 0.5);
      this.emit({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.3, colour, size: 2, gravity: 200, kind: 'chip' });
    }
  }

  sparkle(x: number, y: number, colour = '#f8d878'): void {
    this.emit({ x, y, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 20, life: 0.5, colour, size: 1, gravity: -20, kind: 'spark' });
  }

  update(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  /** The sprite frame for a particle right now (null for plain squares). */
  frameOf(p: Particle): Sprite | null {
    if (!p.kind || p.kind === 'square') return null;
    const frames = PARTICLE_FRAMES[p.kind];
    if (p.kind === 'chip') return frames[Math.floor((p.maxLife - p.life) * 20) % frames.length];
    const age = 1 - p.life / p.maxLife;
    return frames[Math.min(frames.length - 1, Math.floor(age * frames.length))];
  }

  draw(r: Renderer, camX: number, camY: number): void {
    for (const p of this.list) {
      const f = this.frameOf(p);
      if (f) {
        r.sprite(f, [null, p.colour, p.colour, p.colour], p.x - camX - Math.floor(f.w / 2), p.y - camY - Math.floor(f.h / 2));
        continue;
      }
      const s = p.life < p.maxLife * 0.3 ? 1 : p.size;
      r.rect(p.x - camX, p.y - camY, s, s, p.colour);
    }
  }
}
