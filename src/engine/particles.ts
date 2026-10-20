/** Tiny particle pool (#9, #20): dust puffs, death bursts, sparkles, splashes. */
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
    const n = this.reduced ? 2 : 5;
    for (let i = 0; i < n; i++) {
      this.emit({ x: x + (Math.random() - 0.5) * 6, y, vx: (Math.random() - 0.5) * 40 - dir * 20, vy: -Math.random() * 30, life: 0.25 + Math.random() * 0.15, colour, size: 1 + Math.round(Math.random()), gravity: 60 });
    }
  }

  burst(x: number, y: number, colour: string, n = 10, speed = 90): void {
    if (this.reduced) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const s = speed * (0.5 + Math.random() * 0.5);
      this.emit({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.3, colour, size: 2, gravity: 200 });
    }
  }

  sparkle(x: number, y: number, colour = '#f8d878'): void {
    this.emit({ x, y, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 20, life: 0.5, colour, size: 1, gravity: -20 });
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

  draw(rect: (x: number, y: number, w: number, h: number, c: string) => void, camX: number, camY: number): void {
    for (const p of this.list) {
      const s = p.life < p.maxLife * 0.3 ? 1 : p.size;
      rect(p.x - camX, p.y - camY, s, s, p.colour);
    }
  }
}
