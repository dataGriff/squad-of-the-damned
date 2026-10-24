/**
 * Menu (#62): a vertical list with a steady ► cursor. Items can carry a value column
 * (options, key bindings) and can be disabled (skipped by the cursor, drawn
 * faint). Left/right go to `onAdjust` for value rows.
 */
import type { Renderer } from '../../engine/render';
import type { InputState } from '../../engine/input';
import { audio } from '../../engine/audio';
import { FONT_W } from '../../engine/font';
import { write } from '../design/type';
import type { Colour } from '../design/tokens';

export interface MenuItem {
  label: string;
  value?: string;
  disabled?: boolean;
}

export interface MenuDrawOpts {
  /** Left-aligned at x (default), or each row centred on x. */
  align?: 'left' | 'center';
  /** Distance between rows. */
  rowHeight?: number;
  /** Where the value column starts, relative to x (left-aligned menus only). */
  valueX?: number;
  /** Colour of the selected label; unselected labels use `dim`. */
  colour?: Colour;
  dim?: Colour;
}

/** Cursor width: the ► glyph and a space. */
const CURSOR = FONT_W * 2;
export const ROW_HEIGHT = 12;

export class Menu {
  index = 0;
  items: MenuItem[];
  onAdjust?: (index: number, dx: number) => void;

  constructor(items: (string | MenuItem)[], public onPick: (i: number) => void, public onBack?: () => void) {
    this.items = items.map((it) => (typeof it === 'string' ? { label: it } : it));
    this.index = Math.max(0, this.items.findIndex((it) => !it.disabled));
  }

  /** Replace the items, keeping the cursor on a valid row. */
  setItems(items: (string | MenuItem)[]): void {
    this.items = items.map((it) => (typeof it === 'string' ? { label: it } : it));
    if (this.index >= this.items.length || this.items[this.index]?.disabled) this.index = Math.max(0, this.items.findIndex((it) => !it.disabled));
  }

  get selected(): MenuItem {
    return this.items[this.index];
  }

  /** Move the cursor by `dir`, wrapping and skipping disabled rows. */
  move(dir: 1 | -1): void {
    const n = this.items.length;
    for (let step = 1; step <= n; step++) {
      const i = (((this.index + dir * step) % n) + n) % n;
      if (!this.items[i].disabled) {
        this.index = i;
        return;
      }
    }
  }

  update(input: InputState): void {
    if (input.pressed('down')) {
      this.move(1);
      audio.play('menu');
    }
    if (input.pressed('up')) {
      this.move(-1);
      audio.play('menu');
    }
    const dx = (input.pressed('right') ? 1 : 0) - (input.pressed('left') ? 1 : 0);
    if (dx && this.onAdjust) this.onAdjust(this.index, dx);
    if (input.pressed('menu') || input.pressed('jump')) {
      if (this.selected?.disabled) audio.play('tick');
      else {
        audio.play('confirm');
        this.onPick(this.index);
      }
    } else if (input.pressed('pause') && this.onBack) this.onBack();
  }

  /** Width in pixels of the widest row (cursor, label and value column). */
  width(valueX = 0): number {
    return Math.max(...this.items.map((it) => CURSOR + (it.value && valueX ? Math.max(valueX - CURSOR, it.label.length * FONT_W) + it.value.length * FONT_W : it.label.length * FONT_W)));
  }

  height(rowHeight = ROW_HEIGHT): number {
    return this.items.length * rowHeight - (rowHeight - 8);
  }

  draw(r: Renderer, x: number, y: number, opts: MenuDrawOpts = {}): void {
    const rh = opts.rowHeight ?? ROW_HEIGHT;
    const on = opts.colour ?? 'text';
    const off = opts.dim ?? 'textDim';
    this.items.forEach((it, i) => {
      const sel = i === this.index;
      const colour: Colour = it.disabled ? 'textFaint' : sel ? on : off;
      const ry = y + i * rh;
      const w = CURSOR + it.label.length * FONT_W;
      const left = opts.align === 'center' ? Math.round(x - w / 2) : x;
      if (sel) r.text('►', left, ry, 'accent');
      write(r, 'body', it.label, left + CURSOR, ry, { colour });
      if (it.value && opts.align !== 'center') write(r, 'body', it.value, x + (opts.valueX ?? 0), ry, { colour: sel ? 'accent' : 'textSoft' });
    });
  }
}
