/**
 * Dialog (#62): a message and a short list of choices in a blue panel,
 * sized to its content and centred in the safe area.
 */
import type { Renderer } from '../../engine/render';
import type { InputState } from '../../engine/input';
import { SAFE, centred, type Rect } from '../design/layout';
import { lineHeightOf, wrapTo, write } from '../design/type';
import { Menu } from './menu';
import { panel, PANEL_PAD } from './panel';

export interface DialogLayout {
  panel: Rect;
  lines: string[];
  textY: number;
  menuY: number;
}

const GAP = 8;

export class Dialog {
  readonly menu: Menu;
  constructor(public message: string, choices: string[], onPick: (i: number) => void, onBack?: () => void) {
    this.menu = new Menu(choices, onPick, onBack);
  }

  /** Where everything goes: pure, so tests can check it fits. */
  layout(): DialogLayout {
    const maxInner = SAFE.w - PANEL_PAD * 2 - 16;
    const lines = wrapTo('body', this.message, maxInner);
    const textW = Math.max(...lines.map((l) => l.length * 8), this.menu.width());
    const textH = lines.length * lineHeightOf('body');
    const w = Math.min(SAFE.w, textW + PANEL_PAD * 2 + 16);
    const h = PANEL_PAD + textH + GAP + this.menu.height() + PANEL_PAD + 4;
    const p = centred(w, h, SAFE);
    return { panel: p, lines, textY: p.y + PANEL_PAD + 2, menuY: p.y + PANEL_PAD + 2 + textH + GAP };
  }

  update(input: InputState): void {
    this.menu.update(input);
  }

  draw(r: Renderer): void {
    const l = this.layout();
    panel(r, l.panel, 'dialog');
    const cx = l.panel.x + l.panel.w / 2;
    l.lines.forEach((line, i) => write(r, 'body', line, cx, l.textY + i * lineHeightOf('body'), { align: 'center' }));
    this.menu.draw(r, cx, l.menuY, { align: 'center' });
  }
}
