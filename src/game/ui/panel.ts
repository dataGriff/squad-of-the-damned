/**
 * Panels (#62): the NES-style box every menu, dialog and banner sits in.
 * A variant picks the fill and edge colours; the content rect comes back
 * inset by the standard padding so callers lay out inside it.
 */
import type { Renderer } from '../../engine/render';
import type { Colour } from '../design/tokens';
import { inset, type Rect } from '../design/layout';

export type PanelVariant = 'panel' | 'dialog' | 'paper';

export const PANEL_STYLES: Record<PanelVariant, { fill: Colour; border: Colour; shade: Colour }> = {
  /** Black box: menus over scenery, banners. */
  panel: { fill: 'panel', border: 'border', shade: 'shade' },
  /** Blue box: options, pause, confirm. */
  dialog: { fill: 'dialog', border: 'border', shade: 'shade' },
  /** Parchment: the page-found popup. */
  paper: { fill: 'paper', border: 'border', shade: 'inkSoft' },
};

/** Space between a panel's edge and its content. */
export const PANEL_PAD = 8;

/** Draw a panel and return its content rect. */
export function panel(r: Renderer, rect: Rect, variant: PanelVariant = 'panel'): Rect {
  const s = PANEL_STYLES[variant];
  r.box(rect.x, rect.y, rect.w, rect.h, s.fill, s.border, s.shade);
  return inset(rect, PANEL_PAD);
}
