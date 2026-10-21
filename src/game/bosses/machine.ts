/**
 * Boss state machine framework (#22). Pure and data-driven:
 *  - phases are chosen by HP fraction (`until`: phase is active while hp/max > until)
 *  - each phase has named states; a state can declare a telegraph (wind-up)
 *    duration and whether the boss is vulnerable while in it
 *  - `update` returns the name of the next state, or nothing to stay
 */
export interface BossState<C> {
  /** Seconds of wind-up before the state's action lands; `telegraphing` is true during it. */
  telegraph?: number;
  vulnerable?: boolean;
  enter?(ctx: C, m: BossMachine<C>): void;
  update(ctx: C, m: BossMachine<C>, dt: number): string | void;
  exit?(ctx: C, m: BossMachine<C>): void;
}

export interface BossPhase<C> {
  name: string;
  /** Phase stays active while hp fraction is strictly greater than this. */
  until: number;
  initial: string;
  states: Record<string, BossState<C>>;
  onEnter?(ctx: C, m: BossMachine<C>): void;
}

export class BossMachine<C> {
  phaseIndex = 0;
  state = '';
  stateTime = 0;
  hp: number;
  /** Externally forced vulnerability (e.g. stunned, wet, dry). */
  forcedVulnerable = false;
  /** Seconds of stun remaining; the machine pauses while stunned. */
  stunTime = 0;
  history: string[] = [];

  constructor(public phases: BossPhase<C>[], public maxHp: number, private ctx: C) {
    if (!phases.length) throw new Error('Boss needs at least one phase');
    this.hp = maxHp;
    this.enterPhase(0);
  }

  get phase(): BossPhase<C> {
    return this.phases[this.phaseIndex];
  }
  get current(): BossState<C> {
    return this.phase.states[this.state];
  }
  get telegraphing(): boolean {
    const t = this.current.telegraph ?? 0;
    return t > 0 && this.stateTime < t;
  }
  get vulnerable(): boolean {
    return this.forcedVulnerable || !!this.current.vulnerable;
  }
  get hpFraction(): number {
    return this.hp / this.maxHp;
  }
  get dead(): boolean {
    return this.hp <= 0;
  }

  private enterPhase(i: number): void {
    this.phaseIndex = i;
    this.phase.onEnter?.(this.ctx, this);
    this.transition(this.phase.initial);
  }

  transition(name: string): void {
    if (!this.phase.states[name]) throw new Error(`Boss phase ${this.phase.name} has no state ${name}`);
    this.current?.exit?.(this.ctx, this);
    this.state = name;
    this.stateTime = 0;
    this.history.push(name);
    if (this.history.length > 50) this.history.shift();
    this.current.enter?.(this.ctx, this);
  }

  /** Apply damage; may advance the phase. Returns true if the phase changed. */
  damage(n: number): boolean {
    this.hp = Math.max(0, this.hp - n);
    const want = this.phaseFor(this.hpFraction);
    if (want !== this.phaseIndex && !this.dead) {
      this.enterPhase(want);
      return true;
    }
    return false;
  }

  phaseFor(frac: number): number {
    for (let i = 0; i < this.phases.length; i++) if (frac > this.phases[i].until) return i;
    return this.phases.length - 1;
  }

  stun(seconds: number): void {
    this.stunTime = Math.max(this.stunTime, seconds);
  }

  update(dt: number): void {
    if (this.dead) return;
    if (this.stunTime > 0) {
      this.stunTime -= dt;
      return;
    }
    this.stateTime += dt;
    const next = this.current.update(this.ctx, this, dt);
    if (next) this.transition(next);
  }
}
