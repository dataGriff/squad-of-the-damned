import { DT } from './constants';

/**
 * Fixed-timestep loop (#2): the simulation always steps at exactly 60 Hz.
 * Rendering happens as often as the display allows and receives `alpha`,
 * the fraction of the way to the next sim tick, for interpolation.
 * The accumulator is clamped so a backgrounded tab does not spiral.
 */
export interface LoopHooks {
  update: (dt: number) => void;
  render: (alpha: number) => void;
}

export class FixedLoop {
  private acc = 0;
  private last = 0;
  private raf = 0;
  running = false;
  /** Max sim time consumed per frame (seconds). */
  maxFrame = 0.25;
  ticks = 0;

  constructor(private hooks: LoopHooks, private step = DT) {}

  /** Advance by `elapsed` seconds. Returns number of sim ticks run. Pure: usable in tests. */
  advance(elapsed: number): number {
    if (elapsed > this.maxFrame) elapsed = this.maxFrame;
    this.acc += elapsed;
    let n = 0;
    while (this.acc >= this.step) {
      this.hooks.update(this.step);
      this.acc -= this.step;
      n++;
      this.ticks++;
    }
    this.hooks.render(this.acc / this.step);
    return n;
  }

  get alpha(): number {
    return this.acc / this.step;
  }

  start(now: () => number = () => performance.now()): void {
    if (this.running) return;
    this.running = true;
    this.last = now();
    const frame = () => {
      if (!this.running) return;
      const t = now();
      this.advance((t - this.last) / 1000);
      this.last = t;
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.raf);
  }
}
