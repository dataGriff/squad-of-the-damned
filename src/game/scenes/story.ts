/** Plays story chapters (#57): framed panel art, typewriter text, A to advance, START to skip. */
import type { Renderer } from '../../engine/render';
import { SCREEN_W } from '../../engine/constants';
import { audio } from '../../engine/audio';
import type { Game, Scene } from './scene';
import { BOX, type Chapter } from '../story';
import { SONGS } from '../music';
import { wrap } from './ui';

export const TEXT_COLS = 26;
const CPS = 32;

export class StoryScene implements Scene {
  private panels: { chapter: string; text: string; art: Chapter['panels'][number]['art'] }[];
  private index = 0;
  private shown = 0;
  private t = 0;
  private lastBlip = 0;
  private finished = false;

  constructor(private game: Game, chapters: Chapter[], private onDone: () => void) {
    this.panels = chapters.flatMap((c) => c.panels.map((p) => ({ chapter: c.id, ...p })));
  }

  enter(): void {
    audio.playSong(SONGS.hub);
    if (!this.panels.length) this.finish();
  }

  private get current() {
    return this.panels[Math.min(this.index, this.panels.length - 1)];
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    const seen = this.game.save.data.storySeen;
    for (const p of this.panels) if (!seen.includes(p.chapter)) seen.push(p.chapter);
    this.game.save.save();
    this.onDone();
  }

  update(dt: number): void {
    if (this.finished || !this.panels.length) return;
    this.t += dt;
    const input = this.game.input;
    const full = this.current.text.length;
    if (this.shown < full) {
      this.shown = Math.min(full, this.shown + dt * CPS);
      if (Math.floor(this.shown) - this.lastBlip >= 3) {
        this.lastBlip = Math.floor(this.shown);
        audio.play('tick');
      }
    }
    if (input.pressed('pause')) {
      audio.play('confirm');
      this.finish();
      return;
    }
    if (input.pressed('jump') || input.pressed('action')) {
      if (this.shown < full) this.shown = full;
      else {
        audio.play('menu');
        this.index++;
        this.shown = 0;
        this.lastBlip = 0;
        this.t = 0;
        if (this.index >= this.panels.length) this.finish();
      }
    }
  }

  draw(r: Renderer): void {
    r.clear('#000000');
    if (!this.panels.length) return;
    const p = this.current;
    // the picture, clipped to its frame
    r.ctx.save();
    r.ctx.beginPath();
    r.ctx.rect(BOX.x, BOX.y, BOX.w, BOX.h);
    r.ctx.clip();
    p.art(r, this.t);
    r.ctx.restore();
    // frame: a light border inset from a dark one, like the dialog boxes
    r.rect(BOX.x - 3, BOX.y - 3, BOX.w + 6, 2, '#bcbcbc');
    r.rect(BOX.x - 3, BOX.y + BOX.h + 1, BOX.w + 6, 2, '#7c7c7c');
    r.rect(BOX.x - 3, BOX.y - 1, 2, BOX.h + 2, '#bcbcbc');
    r.rect(BOX.x + BOX.w + 1, BOX.y - 1, 2, BOX.h + 2, '#7c7c7c');
    // typewriter text
    r.box(BOX.x - 3, 140, BOX.w + 6, 78, '#000000');
    const lines = wrap(p.text, TEXT_COLS);
    let left = Math.floor(this.shown);
    lines.forEach((line, i) => {
      const visible = line.slice(0, Math.max(0, left));
      left -= line.length + 1;
      r.text(visible, BOX.x + 6, 150 + i * 13, '#fcfcfc');
    });
    if (this.shown >= p.text.length && Math.floor(this.t * 3) % 2 === 0) r.text('▼', BOX.x + BOX.w - 12, 206, '#f8d878');
    r.text('START: SKIP', SCREEN_W - 92, 228, '#3c3c3c');
    r.text(`${this.index + 1}/${this.panels.length}`, BOX.x - 3, 228, '#3c3c3c');
  }
}
