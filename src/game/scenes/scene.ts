/** Scene stack and shared context. */
import type { Renderer } from '../../engine/render';
import type { InputState, KeyboardSource, TouchSource, Bindings } from '../../engine/input';
import type { SaveStore } from '../../engine/save';
import { audio } from '../../engine/audio';
import type { PromptContext } from '../ui/prompt';

export interface Scene {
  /** Transparent scenes let the scene beneath draw first (pause menus). */
  overlay?: boolean;
  enter?(): void;
  exit?(): void;
  update(dt: number): void;
  draw(r: Renderer, alpha: number): void;
}

export class Game {
  stack: Scene[] = [];
  /** Seconds since the last input, for attract mode. */
  idle = 0;
  constructor(
    public renderer: Renderer,
    public input: InputState,
    public save: SaveStore,
    public keyboard: KeyboardSource | null,
    public touch: TouchSource | null,
    public bindings: Bindings,
  ) {}

  /** What button prompts need: the device in use and the key bindings (#62). */
  get prompts(): PromptContext {
    return { device: this.input.device, bindings: this.bindings };
  }
  get scene(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }
  push(s: Scene): void {
    this.stack.push(s);
    if (!s.overlay) this.renderer.fader.start(0.3);
    s.enter?.();
  }
  pop(): void {
    const s = this.stack.pop();
    s?.exit?.();
  }
  replace(s: Scene): void {
    while (this.stack.length) this.pop();
    this.push(s);
  }
  update(dt: number): void {
    this.input.tick();
    if (this.input.hadActivity) this.idle = 0;
    else this.idle += dt;
    this.scene?.update(dt);
  }
  draw(alpha: number): void {
    // find the lowest scene that must be drawn (first non-overlay from the top)
    let i = this.stack.length - 1;
    while (i > 0 && this.stack[i].overlay) i--;
    for (; i < this.stack.length; i++) this.stack[i].draw(this.renderer, alpha);
  }
  applyOptions(): void {
    const o = this.save.data.options;
    audio.musicVolume = o.musicVolume;
    audio.sfxVolume = o.sfxVolume;
    audio.applyVolumes();
    this.renderer.crt = o.crt;
    this.touch?.show(o.touchControls === 'on' || (o.touchControls === 'auto' && isTouch()));
    document.body.classList.toggle('reduced-flash', o.reducedFlash);
  }
}

function isTouch(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
