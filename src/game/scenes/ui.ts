/** Title, hub, options, remap, manual, pause, game over, win (#30, #35, #44, #45, #47). */
import type { Renderer } from '../../engine/render';
import { SCREEN_H, SCREEN_W } from '../../engine/constants';
import { ACTIONS, rebindKey, type Action } from '../../engine/input';
import { audio } from '../../engine/audio';
import { Game, type Scene } from './scene';
import { SONGS } from '../music';
import { MANUAL_PAGES, pagesFound } from '../manual';
import { KIDS, KID_ORDER, type KidId } from '../squad';
import { KID_SHEETS } from '../art/kids';
import { NIGHTS } from '../levels/nights';
import { tileSprite } from '../art/tiles';
import { AIR_U } from '../art/autotiles';
import { drawBackdrop, Storm } from '../backdrop';
import { BAT, BAT_PAL, CREATURE_ART } from '../art/monsters';
import { cycled } from '../palette';
import { DRIP, DRIP_PAL, OAK_CANOPY, OAK_CANOPY_PAL, OAK_TRUNK, OAK_TRUNK_PAL, ROPE_LADDER, ROPE_PAL, TREEHOUSE, TREEHOUSE_FLICKER, TREEHOUSE_PAL } from '../art/scenery';
import { SILHOUETTE_PAL } from '../art/common';
import { NightScene } from './night';
import { StoryScene } from './story';
import { CHAPTERS, beforeChapter, storySoFar } from '../story';
import { measure, paragraph, wrapTo, write } from '../design/type';
import { SAFE, centred } from '../design/layout';
import { Menu, ROW_HEIGHT } from '../ui/menu';
import { Dialog } from '../ui/dialog';
import { panel } from '../ui/panel';
import { keyName, prompt } from '../ui/prompt';

const SAFE_RIGHT = SAFE.x + SAFE.w;
const SAFE_BOTTOM = SAFE.y + SAFE.h;
/** The y of a line of text sitting on the bottom of the safe area. */
const FOOTER_Y = SAFE_BOTTOM - 8;

export class TitleScene implements Scene {
  private t = 0;
  private storm = new Storm(6, 12);
  private menu: Menu;
  private showMenu = false;
  constructor(private game: Game) {
    const hasSave = game.save.data.nightsCleared.length > 0 || game.save.data.pages.length > 0;
    this.menu = new Menu(hasSave ? ['CONTINUE', 'NEW GAME', 'OPTIONS'] : ['NEW GAME', 'OPTIONS'], (i) => {
      const item = this.menu.items[i].label;
      if (item === 'CONTINUE') game.replace(new HubScene(game));
      else if (item === 'NEW GAME') {
        if (hasSave) game.push(new ConfirmScene(game, 'ERASE SAVE AND START OVER?', () => {
          game.save.reset();
          game.save.save();
          game.replace(new HubScene(game));
        }));
        else game.replace(new HubScene(game));
      } else game.push(new OptionsScene(game));
    });
  }
  enter(): void {
    audio.playSong(SONGS.title);
    this.game.idle = 0;
  }
  update(dt: number): void {
    this.t += dt;
    if (this.storm.update(dt).thunder) audio.play('thunder');
    const input = this.game.input;
    if (!this.showMenu) {
      if (input.pressed('menu') || input.pressed('pause') || input.pressed('jump')) {
        this.showMenu = true;
        audio.play('confirm');
      }
    } else this.menu.update(input);
    // attract mode (#44): after 15s idle, run a demo night
    if (this.game.idle > 15) {
      this.game.idle = 0;
      this.game.push(new NightScene(this.game, NIGHTS[0], { demo: true }));
    }
  }
  draw(r: Renderer): void {
    // the graveyard backdrop, drifting slowly
    drawBackdrop(r, 'graveyard', this.t * 10, this.t, this.storm.state(this.game.save.data.options.reducedFlash));
    // bats crossing the moon
    for (let i = 0; i < 3; i++) {
      const bx = ((this.t * (22 + i * 7) + i * 97) % 320) - 32;
      const by = 40 + i * 18 + Math.sin(this.t * 2 + i) * 6;
      r.sprite(BAT.frames[Math.floor(this.t * 12 + i) % BAT.frames.length], BAT_PAL, bx, by);
    }
    // ground: one row of auto-tiled turf over solid fill
    for (let x = 0; x < SCREEN_W; x += 16) {
      const v = (x / 16) % 4;
      const top = tileSprite(1, 'graveyard', 0, AIR_U, v);
      const fill = tileSprite(2, 'graveyard', 0, 0, (v + 1) % 4);
      if (top) r.sprite(top.sprite, top.pal, x, 208);
      if (fill) r.sprite(fill.sprite, fill.pal, x, 224);
    }
    // the squad standing on the ground
    KID_ORDER.forEach((id, i) => {
      const s = kidFrame(id, 'idle', this.t, i);
      r.sprite(s, KIDS[id].palette, 84 + i * 24, 208 - s.h, false);
    });
    // logo: a dithered dark band behind it, then the small line and the big dripping title
    r.dither(0, 28, SCREEN_W, 68, 'black');
    r.dither(0, 36, SCREEN_W, 52, 'black', 1);
    write(r, 'subtitle', 'SQUAD OF', SCREEN_W / 2, 34, { align: 'center' });
    const big = 'THE DAMNED';
    const bx = Math.round((SCREEN_W - measure('title', big)) / 2);
    write(r, 'title', big, bx, 56);
    for (let i = 0; i < 7; i++) {
      const x = bx + 6 + i * 11 + ((i * 7) % 5);
      const len = ((this.t * 9 + i * 13) % 26) - 4;
      if (len > 0) {
        r.rect(x, 82, 1, Math.min(len, 14), 'dangerShade');
        if (len > 14) r.sprite(DRIP, DRIP_PAL, x - 1, 82 + len - 2);
      }
    }
    if (!this.showMenu) {
      if (Math.floor(this.t * 2) % 2 === 0) write(r, 'display', 'PRESS START', SCREEN_W / 2, 132, { align: 'center' });
    } else {
      const box = centred(120, this.menu.height() + 16, { x: 0, y: 118, w: SCREEN_W, h: this.menu.height() + 16 });
      panel(r, box);
      this.menu.draw(r, SCREEN_W / 2, box.y + 8, { align: 'center' });
    }
    // credit on a black band over the lower half of the ground, inside the safe area
    r.rect(0, FOOTER_Y - 4, SCREEN_W, SCREEN_H - FOOTER_Y + 4, 'black');
    write(r, 'bodySoft', 'HUNGOVERCODERS 2026', SCREEN_W / 2, FOOTER_Y, { align: 'center' });
  }
}

export class ConfirmScene implements Scene {
  overlay = true;
  private dialog: Dialog;
  constructor(private game: Game, text: string, onYes: () => void) {
    this.dialog = new Dialog(text, ['NO', 'YES'], (i) => {
      game.pop();
      if (i === 1) onYes();
    }, () => game.pop());
  }
  update(): void {
    this.dialog.update(this.game.input);
  }
  draw(r: Renderer): void {
    this.dialog.draw(r);
  }
}

/** Treehouse hub (#30): night select, squad, manual, options. */
export class HubScene implements Scene {
  private menu: Menu;
  private mode: 'main' | 'nights' | 'squad' = 'main';
  private nightMenu: Menu;
  private t = 0;
  constructor(private game: Game) {
    this.menu = new Menu(['PICK A NIGHT', 'THE SQUAD', 'MONSTER MANUAL', 'STORY SO FAR', 'OPTIONS', 'TITLE SCREEN'], (i) => {
      if (i === 0) this.mode = 'nights';
      else if (i === 1) this.mode = 'squad';
      else if (i === 2) game.push(new ManualScene(game));
      else if (i === 3) {
        const seen = storySoFar(game.save.data.storySeen);
        game.replace(new StoryScene(game, seen.length ? seen : [CHAPTERS.intro], () => game.replace(new HubScene(game))));
      } else if (i === 4) game.push(new OptionsScene(game));
      else game.replace(new TitleScene(game));
    });
    this.nightMenu = new Menu([], (i) => this.pickNight(i), () => (this.mode = 'main'));
    this.refreshNights();
  }
  private refreshNights(): void {
    const cleared = this.game.save.data.nightsCleared;
    const allClear = NIGHTS.every((n) => cleared.includes(n.number));
    this.nightMenu.setItems([
      ...NIGHTS.map((n) => ({ label: `NIGHT ${n.number}  ${n.short}`, value: cleared.includes(n.number) ? '*' : '' })),
      allClear ? { label: 'MIDNIGHT: THE PORTAL', value: this.game.save.data.gameComplete ? '*' : '' } : { label: '??? (CLEAR ALL NIGHTS)', disabled: true },
      { label: 'BACK' },
    ]);
  }
  /** Start a night, playing its story chapter first if it hasn't been seen (#57). */
  private startNight(night: (typeof NIGHTS)[number] | null): void {
    const game = this.game;
    const go = () => game.replace(new NightScene(game, night));
    const ch = beforeChapter(night ? night.number : null);
    if (ch && !game.save.data.storySeen.includes(ch)) game.replace(new StoryScene(game, [CHAPTERS[ch]], go));
    else go();
  }
  private pickNight(i: number): void {
    if (i < NIGHTS.length) this.startNight(NIGHTS[i]);
    else if (i === NIGHTS.length) this.startNight(null);
    else this.mode = 'main';
  }
  enter(): void {
    audio.playSong(SONGS.hub);
    this.refreshNights();
  }
  update(dt: number): void {
    this.t += dt;
    const input = this.game.input;
    if (this.mode === 'main') this.menu.update(input);
    else if (this.mode === 'nights') this.nightMenu.update(input);
    else if (input.pressed('pause') || input.pressed('menu') || input.pressed('jump')) this.mode = 'main';
  }
  draw(r: Renderer): void {
    // night sky, stars, moon and the far rooftops from the suburb set
    drawBackdrop(r, 'suburb', 0, this.t);
    // the oak and the treehouse
    r.sprite(OAK_TRUNK, OAK_TRUNK_PAL, 92, 72);
    r.sprite(OAK_CANOPY, OAK_CANOPY_PAL, 0, 6);
    r.sprite(TREEHOUSE, cycled(TREEHOUSE_PAL, 3, TREEHOUSE_FLICKER, this.t, 3), 60, 32);
    r.sprite(ROPE_LADDER, ROPE_PAL, 150, 100);
    // grass
    for (let x = 0; x < SCREEN_W; x += 16) {
      const top = tileSprite(1, 'suburb', 0, AIR_U, (x / 16) % 4);
      const fill = tileSprite(2, 'suburb', 0, 0, (x / 16 + 2) % 4);
      if (top) r.sprite(top.sprite, top.pal, x, 208);
      if (fill) r.sprite(fill.sprite, fill.pal, x, 224);
    }
    // fireflies
    for (let i = 0; i < 9; i++) {
      const fx = (i * 53 + Math.sin(this.t * 0.7 + i) * 20 + 256) % 256;
      const fy = 120 + ((i * 31) % 80) + Math.cos(this.t * 0.9 + i * 2) * 8;
      if (Math.sin(this.t * 3 + i * 1.7) > -0.2) r.rect(fx, fy, 1, 1, 'yellow');
    }
    // title bar, reaching down into the safe area
    r.box(0, 0, SCREEN_W, SAFE.y + 18, 'panel');
    write(r, 'heading', 'THE TREEHOUSE', SCREEN_W / 2, SAFE.y + 2, { align: 'center' });
    const { found, total } = pagesFound(this.game.save.data.pages);
    write(r, 'label', `PAGES ${found}/${total}`, SAFE.x, FOOTER_Y);
    write(r, 'label', `SILVER ${this.game.save.data.silver}`, SAFE_RIGHT, FOOTER_Y, { align: 'right' });
    if (this.mode === 'main') {
      KID_ORDER.forEach((id, i) => {
        const s = kidFrame(id, 'idle', this.t, i);
        r.sprite(s, KIDS[id].palette, 76 + i * 28, 92 - s.h, i > 1);
      });
      const box = { x: SCREEN_W / 2 - 76, y: 128, w: 152, h: this.menu.height() + 16 };
      panel(r, box);
      this.menu.draw(r, SCREEN_W / 2, box.y + 8, { align: 'center' });
    } else if (this.mode === 'nights') {
      const box = { x: SAFE.x, y: 100, w: SAFE.w, h: 112 };
      const inner = panel(r, box);
      this.nightMenu.draw(r, inner.x, inner.y, { valueX: inner.w - 8 });
      write(r, 'hint', '* = CLEARED', inner.x, inner.y + inner.h - 8);
    } else {
      // the squad: who does what, two lines each
      const box = { x: SAFE.x, y: 56, w: SAFE.w, h: SAFE_BOTTOM - 16 - 56 };
      const inner = panel(r, box);
      KID_ORDER.forEach((id, i) => {
        const k = KIDS[id];
        const s = KID_SHEETS[id].anims.idle.frames[0];
        const y = inner.y + i * 34;
        r.sprite(s, k.palette, inner.x + 8 - s.w / 2, y + 28 - s.h);
        write(r, 'heading', k.name, inner.x + 24, y);
        paragraph(r, 'bodySoft', k.blurb, inner.x + 24, y + 12, inner.w - 24);
      });
      prompt(r, this.game.prompts, 'pause', 'BACK', inner.x + inner.w, inner.y + inner.h - 8, { align: 'right' });
    }
  }
}

/** Options (#44, #47). */
export class OptionsScene implements Scene {
  overlay = true;
  private menu: Menu;
  private static ITEMS = ['MUSIC', 'SOUND', 'CRT FILTER', 'HOLD TO JUMP', 'REDUCED FLASH', 'TOUCH PAD', 'REMAP KEYS', 'ERASE SAVE', 'BACK'];
  constructor(private game: Game) {
    this.menu = new Menu(OptionsScene.ITEMS, (i) => this.act(OptionsScene.ITEMS[i], 0, true), () => game.pop());
    this.menu.onAdjust = (i, dx) => this.act(OptionsScene.ITEMS[i], dx, false);
  }
  private act(item: string, dx: number, go: boolean): void {
    const o = this.game.save.data.options;
    const toggle = dx !== 0 || go;
    switch (item) {
      case 'MUSIC':
        if (dx) o.musicVolume = Math.max(0, Math.min(1, o.musicVolume + dx * 0.1));
        break;
      case 'SOUND':
        if (dx) {
          o.sfxVolume = Math.max(0, Math.min(1, o.sfxVolume + dx * 0.1));
          this.game.applyOptions();
          audio.play('hit');
        }
        break;
      case 'CRT FILTER':
        if (toggle) o.crt = !o.crt;
        break;
      case 'HOLD TO JUMP':
        if (toggle) o.holdToJump = !o.holdToJump;
        break;
      case 'REDUCED FLASH':
        if (toggle) o.reducedFlash = !o.reducedFlash;
        break;
      case 'TOUCH PAD': {
        const modes = ['auto', 'on', 'off'] as const;
        if (toggle) o.touchControls = modes[(modes.indexOf(o.touchControls) + (dx || 1) + 3) % 3];
        break;
      }
      case 'REMAP KEYS':
        if (go) this.game.push(new RemapScene(this.game));
        break;
      case 'ERASE SAVE':
        if (go) this.game.push(new ConfirmScene(this.game, 'ERASE ALL PROGRESS?', () => {
          this.game.save.reset();
          this.game.save.save();
          this.game.applyOptions();
        }));
        break;
      case 'BACK':
        if (go) this.game.pop();
        break;
    }
    if (toggle) {
      this.game.save.save();
      this.game.applyOptions();
    }
  }
  update(): void {
    this.menu.update(this.game.input);
  }
  draw(r: Renderer): void {
    const o = this.game.save.data.options;
    const vals: Record<string, string> = {
      MUSIC: bar(o.musicVolume),
      SOUND: bar(o.sfxVolume),
      'CRT FILTER': o.crt ? 'ON' : 'OFF',
      'HOLD TO JUMP': o.holdToJump ? 'ON' : 'OFF',
      'REDUCED FLASH': o.reducedFlash ? 'ON' : 'OFF',
      'TOUCH PAD': o.touchControls.toUpperCase(),
    };
    this.menu.items.forEach((it) => (it.value = vals[it.label]));
    const inner = dialogFrame(r, 'OPTIONS');
    this.menu.draw(r, inner.x, inner.y, { rowHeight: 14, valueX: 136, dim: 'textSoft' });
    prompt(r, this.game.prompts, 'left', '', inner.x, inner.y + inner.h - 8);
    prompt(r, this.game.prompts, 'right', 'CHANGE', inner.x + 14, inner.y + inner.h - 8);
  }
}
function bar(v: number): string {
  const n = Math.round(v * 10);
  return '●'.repeat(n) + '○'.repeat(10 - n);
}

/** A full dialog panel with a heading; returns the content rect under the heading. */
function dialogFrame(r: Renderer, title: string) {
  const box = { x: SAFE.x, y: 24, w: SAFE.w, h: 192 };
  const inner = panel(r, box, 'dialog');
  write(r, 'heading', title, SCREEN_W / 2, inner.y, { align: 'center' });
  return { x: inner.x + 4, y: inner.y + 20, w: inner.w - 8, h: inner.h - 20 };
}

/** Key remapping (#6). */
export class RemapScene implements Scene {
  overlay = true;
  private waiting = false;
  private actions: Action[] = ACTIONS.filter((a) => a !== 'menu');
  private menu: Menu;
  constructor(private game: Game) {
    this.menu = new Menu([...this.actions.map((a) => a.toUpperCase()), 'BACK'], (i) => {
      if (i === this.actions.length) this.game.pop();
      else this.waiting = true;
    }, () => game.pop());
  }
  update(): void {
    const kb = this.game.keyboard;
    if (this.waiting) {
      const code = kb?.lastCode();
      if (code && code !== 'Escape') {
        this.game.bindings = rebindKey(this.game.bindings, this.actions[this.menu.index], code);
        if (kb) kb.bindings = this.game.bindings;
        this.game.save.data.bindings = this.game.bindings;
        this.game.save.save();
        this.waiting = false;
        audio.play('confirm');
      } else if (code === 'Escape') this.waiting = false;
      return;
    }
    this.menu.update(this.game.input);
  }
  draw(r: Renderer): void {
    this.actions.forEach((a, i) => {
      const keys = this.game.bindings.keys[a].map(keyName).join(' ');
      this.menu.items[i].value = i === this.menu.index && this.waiting ? 'PRESS A KEY...' : keys;
    });
    const inner = dialogFrame(r, 'REMAP KEYS');
    this.menu.draw(r, inner.x, inner.y, { rowHeight: 14, valueX: 88, dim: 'textSoft' });
  }
}

/** In-game manual (#35): found pages fill in, unfound stay silhouettes. */
export class ManualScene implements Scene {
  overlay = true;
  private index = 0;
  constructor(private game: Game) {}
  update(): void {
    const input = this.game.input;
    const n = MANUAL_PAGES.length;
    if (input.pressed('right') || input.pressed('down')) {
      this.index = (this.index + 1) % n;
      audio.play('menu');
    }
    if (input.pressed('left') || input.pressed('up')) {
      this.index = (this.index - 1 + n) % n;
      audio.play('menu');
    }
    if (input.pressed('pause') || input.pressed('menu') || input.pressed('action')) this.game.pop();
  }
  draw(r: Renderer): void {
    const page = MANUAL_PAGES[this.index];
    const found = this.game.save.hasPage(page.id);
    // open book: leather cover, two parchment pages, a gutter shadow
    r.rect(6, 18, SCREEN_W - 12, 204, 'ink');
    r.rect(8, 20, SCREEN_W - 16, 200, 'inkSoft');
    r.rect(12, 24, SCREEN_W - 24, 192, 'paper');
    r.dither(SCREEN_W / 2 - 6, 24, 6, 192, 'paperShade');
    r.dither(SCREEN_W / 2 + 1, 24, 6, 192, 'paperShade', 1);
    r.rect(SCREEN_W / 2, 24, 1, 192, 'inkSoft');
    // framed hint art, pixel-doubled when it fits
    const art = CREATURE_ART[page.art];
    const scale = Math.max(1, Math.min(3, Math.floor(Math.min(84 / art.sprite.w, 80 / art.sprite.h))));
    r.rect(18, 30, 98, 88, 'inkSoft');
    r.rect(20, 32, 94, 84, found ? 'panel' : 'edge');
    r.spriteScaled(art.sprite, found ? art.pal : SILHOUETTE_PAL, 67 - (art.sprite.w * scale) / 2, 112 - art.sprite.h * scale, scale);
    wrapTo('paperHeading', found ? page.creature : '???', 96).forEach((l, i) => write(r, 'paperHeading', l, 18, 123 + i * 11));
    write(r, 'paperAccent', page.night ? `NIGHT ${page.night}` : 'FIELD NOTES', 18, 148);
    const lx = SCREEN_W / 2 + 8;
    const width = 104;
    if (found) {
      let y = 32;
      y += paragraph(r, 'paperBody', page.lore.join(' '), lx, y, width) + 6;
      write(r, 'paperAlert', 'WEAKNESS:', lx, y);
      y += 12;
      paragraph(r, 'paperBody', `${page.weaknessText} ${page.hint}`, lx, y, width);
    } else {
      paragraph(r, 'hint', 'PAGE NOT FOUND YET. LOOK BEHIND VENTS AND CRACKED WALLS.', lx, 32, width);
    }
    const { found: f, total } = pagesFound(this.game.save.data.pages);
    write(r, 'paperNote', `◄ ${this.index + 1}/${MANUAL_PAGES.length} ►`, 20, 200);
    write(r, 'paperNote', `FOUND ${f}/${total}`, 150, 200);
  }
}

/** The frame of a kid animation at time t, offset per kid so the squad isn't in lockstep. */
function kidFrame(id: KidId, name: string, t: number, i: number) {
  const a = KID_SHEETS[id].anims[name];
  return a.frames[Math.floor(t * a.fps + i * 3) % a.frames.length];
}

export class PauseScene implements Scene {
  overlay = true;
  private menu: Menu;
  constructor(private game: Game, onQuit: () => void) {
    this.menu = new Menu(['RESUME', 'MONSTER MANUAL', 'OPTIONS', 'QUIT TO TREEHOUSE'], (i) => {
      if (i === 0) game.pop();
      else if (i === 1) game.push(new ManualScene(game));
      else if (i === 2) game.push(new OptionsScene(game));
      else {
        game.pop();
        onQuit();
      }
    }, () => game.pop());
  }
  update(): void {
    this.menu.update(this.game.input);
  }
  draw(r: Renderer): void {
    const box = centred(168, 20 + this.menu.height() + 16);
    const inner = panel(r, box, 'dialog');
    write(r, 'heading', 'PAUSED', SCREEN_W / 2, inner.y, { align: 'center' });
    this.menu.draw(r, SCREEN_W / 2, inner.y + 20, { align: 'center' });
  }
}

export class GameOverScene implements Scene {
  private menu: Menu;
  private t = 0;
  constructor(private game: Game, onContinue: () => void) {
    this.menu = new Menu(['CONTINUE', 'QUIT TO TREEHOUSE'], (i) => {
      if (i === 0) onContinue();
      else game.replace(new HubScene(game));
    });
  }
  enter(): void {
    audio.playSong(SONGS.gameover);
  }
  update(dt: number): void {
    this.t += dt;
    if (this.t > 0.8) this.menu.update(this.game.input);
  }
  draw(r: Renderer): void {
    r.clear('screen');
    write(r, 'alert', 'THE SQUAD IS DOWN', SCREEN_W / 2, 80, { align: 'center' });
    write(r, 'bodySoft', '...BUT THE NIGHT IS NOT OVER', SCREEN_W / 2, 96, { align: 'center' });
    if (this.t > 0.8) this.menu.draw(r, SCREEN_W / 2, 130, { align: 'center' });
  }
}

/** Credits: the lines scroll up through a window above the squad running along the bottom. */
export class WinScene implements Scene {
  private t = 0;
  private lines = [
    'THE PORTAL IS CLOSED.',
    '',
    'THE COUNT WENT BACK TO ELM ST.',
    'THE GIANT HAS FRIENDS NOW.',
    'MR GREY DELIVERS BY DAY.',
    'THE MUMMY IS BACK ON DISPLAY.',
    'THE DRAIN IS JUST A DRAIN.',
    '',
    'THANKS FOR PLAYING',
    'SQUAD OF THE DAMNED',
    '',
    'A HUNGOVERCODERS GAME',
    '',
    'PRESS START',
  ];
  /** The credits window: from the top of the safe area to just above the kids. */
  private static WINDOW = { top: SAFE.y + 8, bottom: 168 };
  constructor(private game: Game) {}
  enter(): void {
    audio.playSong(SONGS.win);
    this.game.save.data.gameComplete = true;
    this.game.save.save();
  }
  update(dt: number): void {
    this.t += dt;
    if (this.t > 3 && (this.game.input.pressed('menu') || this.game.input.pressed('pause'))) this.game.replace(new HubScene(this.game));
  }
  draw(r: Renderer): void {
    r.clear('screen');
    const { top, bottom } = WinScene.WINDOW;
    const step = ROW_HEIGHT;
    // scroll until the last line rests in the middle of the window
    const scroll = Math.max(0, Math.min(this.lines.length * step - (bottom - top) / 2, (this.t - 1) * step));
    this.lines.forEach((l, i) => {
      const y = bottom - 24 + i * step - scroll;
      if (y >= top && y <= bottom - 8) write(r, i === 9 ? 'alert' : 'body', l, SCREEN_W / 2, y, { align: 'center' });
    });
    const ground = SAFE_BOTTOM - 16;
    KID_ORDER.forEach((id, i) => {
      const s = kidFrame(id, 'run', this.t, i);
      r.sprite(s, KIDS[id].palette, 60 + i * 36 + Math.sin(this.t + i) * 4, ground - s.h);
    });
  }
}
