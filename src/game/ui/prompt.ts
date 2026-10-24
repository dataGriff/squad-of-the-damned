/**
 * Button prompts (#62): an icon for the button that does something, plus a
 * label. The icon follows the device the player last touched: a key cap with
 * the bound key on a keyboard, the A/B buttons or the START pill on a pad or
 * the touch screen.
 */
import type { Renderer } from '../../engine/render';
import type { Action, Bindings, Device } from '../../engine/input';
import { FONT_W } from '../../engine/font';
import { BUTTON_A, BUTTON_B, BUTTON_PAL, BUTTON_PILL, PILL_PAL } from '../art/icons';
import { measure, write, type StyleName } from '../design/type';
import type { Sprite } from '../../engine/sprites';
import type { SpritePalette } from '../palette';

export interface PromptContext {
  device: Device;
  bindings: Bindings;
}

type Glyph = { icon: Sprite; pal: SpritePalette } | { cap: string };

const KEY_NAMES: Record<string, string> = {
  ArrowLeft: '◄',
  ArrowRight: '►',
  ArrowUp: '▲',
  ArrowDown: '▼',
  Escape: 'ESC',
  ShiftLeft: 'SHIFT',
  ShiftRight: 'SHIFT',
  ControlLeft: 'CTRL',
  ControlRight: 'CTRL',
  Backspace: 'BKSP',
};

/** A short, drawable name for a key code. */
export function keyName(code: string): string {
  return KEY_NAMES[code] ?? code.replace(/^Key|^Digit|^Arrow/, '').toUpperCase().slice(0, 6);
}

const PAD: Record<Action, Glyph> = {
  jump: { icon: BUTTON_A, pal: BUTTON_PAL },
  menu: { icon: BUTTON_A, pal: BUTTON_PAL },
  action: { icon: BUTTON_B, pal: BUTTON_PAL },
  pause: { icon: BUTTON_PILL, pal: PILL_PAL },
  swap: { cap: 'RB' },
  left: { cap: '◄' },
  right: { cap: '►' },
  up: { cap: '▲' },
  down: { cap: '▼' },
};
const TOUCH: Partial<Record<Action, Glyph>> = { swap: { cap: 'SW' } };

function glyphFor(ctx: PromptContext, action: Action): Glyph {
  if (ctx.device === 'keyboard') return { cap: keyName(ctx.bindings.keys[action][0] ?? '?') };
  return (ctx.device === 'touch' && TOUCH[action]) || PAD[action];
}

/** Key caps are one 8px cell per character plus a 1px rim and 1px gap each side. */
function capWidth(label: string): number {
  return label.length * FONT_W + 3;
}
const CAP_H = 11;

function glyphWidth(g: Glyph): number {
  return 'cap' in g ? capWidth(g.cap) : g.icon.w;
}

const GAP = 4;

/** Width of a prompt in pixels. */
export function promptWidth(ctx: PromptContext, action: Action, label: string, style: StyleName = 'bodySoft'): number {
  return glyphWidth(glyphFor(ctx, action)) + (label ? GAP + measure(style, label) : 0);
}

/**
 * Draw `[button] label` with its top-left at (x, y), or centred / right-aligned
 * on x. The glyph is vertically centred on the 8px text line. Returns the width.
 */
export function prompt(r: Renderer, ctx: PromptContext, action: Action, label: string, x: number, y: number, opts: { align?: 'left' | 'center' | 'right'; style?: StyleName } = {}): number {
  const style = opts.style ?? 'bodySoft';
  const g = glyphFor(ctx, action);
  const w = promptWidth(ctx, action, label, style);
  let left = opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x;
  left = Math.round(left);
  if ('cap' in g) {
    const cw = capWidth(g.cap);
    const top = y - 2;
    // a rounded key cap: rim, darker bottom edge, black face
    r.rect(left + 1, top, cw - 2, 1, 'textSoft');
    r.rect(left, top + 1, 1, CAP_H - 2, 'textSoft');
    r.rect(left + cw - 1, top + 1, 1, CAP_H - 2, 'textSoft');
    r.rect(left + 1, top + CAP_H - 1, cw - 2, 1, 'shade');
    r.rect(left + 1, top + 1, cw - 2, CAP_H - 2, 'panel');
    r.text(g.cap, left + 2, top + 2, 'text');
  } else {
    r.sprite(g.icon, g.pal, left, y + Math.floor((7 - g.icon.h) / 2));
  }
  if (label) write(r, style, label, left + glyphWidth(g) + GAP, y);
  return w;
}
