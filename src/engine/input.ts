/**
 * Input abstraction (#6). Sources (keyboard, Gamepad API, on-screen touch pad) all
 * set logical actions on an `InputState`. Game code only ever reads actions.
 * Bindings are remappable and serialisable.
 */
export const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'action', 'swap', 'pause', 'menu'] as const;
export type Action = (typeof ACTIONS)[number];

export interface Bindings {
  keys: Record<Action, string[]>;
  /** Gamepad button indices (standard mapping). */
  pad: Record<Action, number[]>;
}

export const DEFAULT_BINDINGS: Bindings = {
  keys: {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    jump: ['KeyZ', 'Space', 'KeyK'],
    action: ['KeyX', 'KeyJ', 'ShiftLeft'],
    swap: ['KeyC', 'KeyL', 'Tab'],
    pause: ['Enter', 'Escape', 'KeyP'],
    menu: ['Enter', 'KeyZ', 'Space'],
  },
  pad: {
    left: [14],
    right: [15],
    up: [12],
    down: [13],
    jump: [0],
    action: [2],
    swap: [1, 5],
    pause: [9],
    menu: [0, 9],
  },
};

/** The kind of device the player last used, so prompts can show its buttons (#62). */
export type Device = 'keyboard' | 'gamepad' | 'touch';

export class InputState {
  /** Updated by the sources on real input; defaults to the keyboard. */
  device: Device = 'keyboard';
  private down = new Set<Action>();
  private prev = new Set<Action>();
  /** Raw per-source states merged each tick. */
  private sources: Set<Action>[] = [];
  /** Actions tapped since the last tick; guaranteed to read as down for one tick. */
  private pulses = new Set<Action>();

  /** Record a tap that may have started and ended between two sim ticks. */
  pulse(a: Action): void {
    this.pulses.add(a);
    this.activity = true;
  }
  /** Real human activity since the last tick (scripted demo input never sets this). */
  private activity = false;
  hadActivity = false;
  markActivity(): void {
    this.activity = true;
  }

  /** Register a source; returns the set it should mutate. */
  addSource(): Set<Action> {
    const s = new Set<Action>();
    this.sources.push(s);
    return s;
  }

  /** Call once per sim tick, before reading. */
  tick(): void {
    this.prev = new Set(this.down);
    this.down = new Set<Action>();
    for (const s of this.sources) for (const a of s) this.down.add(a);
    for (const a of this.pulses) if (!this.prev.has(a)) this.down.add(a);
    this.pulses.clear();
    this.hadActivity = this.activity;
    this.activity = false;
  }

  isDown(a: Action): boolean {
    return this.down.has(a);
  }
  pressed(a: Action): boolean {
    return this.down.has(a) && !this.prev.has(a);
  }
  released(a: Action): boolean {
    return !this.down.has(a) && this.prev.has(a);
  }
  /** -1, 0, 1 */
  get axisX(): number {
    return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
  }
  get axisY(): number {
    return (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0);
  }
  anyPressed(): boolean {
    for (const a of this.down) if (!this.prev.has(a)) return true;
    return false;
  }
}

/** Keyboard source: maps `code` values through bindings. */
export class KeyboardSource {
  private held = new Set<string>();
  constructor(private out: Set<Action>, public bindings: Bindings, private state: InputState, target: EventTarget = window) {
    target.addEventListener('keydown', (e) => this.onKey(e as KeyboardEvent, true));
    target.addEventListener('keyup', (e) => this.onKey(e as KeyboardEvent, false));
    window.addEventListener('blur', () => {
      this.held.clear();
      this.out.clear();
    });
  }
  private onKey(e: KeyboardEvent, down: boolean): void {
    if (e.repeat) return;
    if (down) {
      this.state.device = 'keyboard';
      this.held.add(e.code);
      for (const a of ACTIONS) if (this.bindings.keys[a].includes(e.code)) this.state.pulse(a);
    } else this.held.delete(e.code);
    const bound = Object.values(this.bindings.keys).some((codes) => codes.includes(e.code));
    if (bound || e.code === 'Tab' || e.code === 'Space') e.preventDefault();
    this.refresh();
  }
  refresh(): void {
    this.out.clear();
    for (const a of ACTIONS) if (this.bindings.keys[a].some((c) => this.held.has(c))) this.out.add(a);
  }
  /** Last physical key pressed, for remapping UI. */
  lastCode(): string | undefined {
    let last: string | undefined;
    for (const c of this.held) last = c;
    return last;
  }
}

/** Gamepad source: polled each tick. */
export class GamepadSource {
  deadzone = 0.4;
  constructor(private out: Set<Action>, public bindings: Bindings, private state?: InputState) {}
  poll(): void {
    this.out.clear();
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      for (const a of ACTIONS) {
        if (this.bindings.pad[a].some((i) => p.buttons[i]?.pressed)) this.out.add(a);
      }
      const x = p.axes[0] ?? 0;
      const y = p.axes[1] ?? 0;
      if (x < -this.deadzone) this.out.add('left');
      if (x > this.deadzone) this.out.add('right');
      if (y < -this.deadzone) this.out.add('up');
      if (y > this.deadzone) this.out.add('down');
    }
    if (this.out.size) {
      this.state?.markActivity();
      if (this.state) this.state.device = 'gamepad';
    }
  }
}

/** On-screen touch pad: d-pad on the left, two buttons on the right, swap/pause small. */
export class TouchSource {
  readonly el: HTMLElement;
  constructor(private out: Set<Action>, parent: HTMLElement, private state?: InputState) {
    this.el = document.createElement('div');
    this.el.className = 'touchpad';
    const mk = (cls: string, actions: Action[], label: string) => {
      const b = document.createElement('div');
      b.className = `tbtn ${cls}`;
      b.textContent = label;
      const press = (e: Event) => {
        e.preventDefault();
        if (this.state) this.state.device = 'touch';
        actions.forEach((a) => {
          this.out.add(a);
          this.state?.pulse(a);
        });
        b.classList.add('on');
      };
      const release = (e: Event) => {
        e.preventDefault();
        actions.forEach((a) => this.out.delete(a));
        b.classList.remove('on');
      };
      b.addEventListener('touchstart', press, { passive: false });
      b.addEventListener('touchend', release, { passive: false });
      b.addEventListener('touchcancel', release, { passive: false });
      b.addEventListener('pointerdown', press);
      b.addEventListener('pointerup', release);
      b.addEventListener('pointerleave', release);
      this.el.appendChild(b);
      return b;
    };
    mk('dl', ['left'], '◀');
    mk('dr', ['right'], '▶');
    mk('du', ['up'], '▲');
    mk('dd', ['down'], '▼');
    mk('bj', ['jump', 'menu'], 'A');
    mk('ba', ['action'], 'B');
    mk('bs', ['swap'], 'SW');
    mk('bp', ['pause'], '||');
    parent.appendChild(this.el);
  }
  show(v: boolean): void {
    this.el.style.display = v ? '' : 'none';
  }
}

export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

/** Replace the key binding list of an action with one code (used by the remap screen). */
export function rebindKey(b: Bindings, action: Action, code: string): Bindings {
  const keys = { ...b.keys, [action]: [code] };
  return { ...b, keys };
}
