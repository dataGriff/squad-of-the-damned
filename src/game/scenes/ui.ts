/** Title, hub, options, remap, manual, pause, game over, win (#30, #35, #44, #45, #47). */
import type { Renderer } from '../../engine/render';
import { SCREEN_H, SCREEN_W } from '../../engine/constants';
import { ACTIONS, rebindKey, type Action } from '../../engine/input';
import { audio } from '../../engine/audio';
import { Game, Menu, type Scene } from './scene';
import { SONGS } from '../music';
import { MANUAL_PAGES, pagesFound } from '../manual';
import { KIDS, KID_ORDER, type KidId } from '../squad';
import { KID_SHEETS } from '../art/kids';
import { NIGHTS } from '../levels/nights';
import { tileSprite } from '../art/tiles';
import { AIR_U } from '../art/autotiles';
import { drawBackdrop, Storm } from '../backdrop';
import { BAT, BAT_PAL, CREATURE_ART } from '../art/monsters';
import { cycled, cycleList } from '../palette';

const WINDOW_FLICKER = cycleList(['yellow', 'yellow', 'sand', 'yellow', 'amber', 'yellow']);
import { DRIP, DRIP_PAL, OAK_CANOPY, OAK_CANOPY_PAL, OAK_TRUNK, OAK_TRUNK_PAL, ROPE_LADDER, ROPE_PAL, TREEHOUSE, TREEHOUSE_PAL } from '../art/scenery';
import { NightScene } from './night';
import { StoryScene } from './story';
import { CHAPTERS, beforeChapter, storySoFar } from '../story';
import { solid } from '../design/tokens';

const GREY = solid('darkGrey');

export class TitleScene implements Scene {
  private t = 0;
  private storm = new Storm(6, 12);
  private menu: Menu;
  private showMenu = false;
  constructor(private game: Game) {
    const hasSave = game.save.data.nightsCleared.length > 0 || game.save.data.pages.length > 0;
    this.menu = new Menu(hasSave ? ['CONTINUE', 'NEW GAME', 'OPTIONS'] : ['NEW GAME', 'OPTIONS'], (i) => {
      const item = this.menu.items[i];
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
    r.dither(0, 28, SCREEN_W, 68, 'panel');
    r.dither(0, 36, SCREEN_W, 52, 'panel', 1);
    const small = 'SQUAD OF';
    r.bigText(small, (SCREEN_W - r.bigTextWidth(small)) / 2, 34, 'white', 'lightGrey');
    const big = 'THE DAMNED';
    const bw = r.bigTextWidth(big, 3);
    const bx = Math.round((SCREEN_W - bw) / 2);
    r.bigText(big, bx, 56, 'danger', 'dangerShade', 3);
    for (let i = 0; i < 7; i++) {
      const x = bx + 6 + i * 11 + ((i * 7) % 5);
      const len = ((this.t * 9 + i * 13) % 26) - 4;
      if (len > 0) {
        r.rect(x, 82, 1, Math.min(len, 14), 'dangerShade');
        if (len > 14) r.sprite(DRIP, DRIP_PAL, x - 1, 82 + len - 2);
      }
    }
    if (!this.showMenu) {
      if (Math.floor(this.t * 2) % 2 === 0) r.headingCentered('PRESS START', 132, 'text');
    } else {
      r.box(SCREEN_W / 2 - 60, 118, 120, this.menu.items.length * 12 + 12, 'panel');
      this.menu.draw(r, 124);
    }
    r.rect(0, 228, SCREEN_W, 12, 'panel');
    r.textCentered('HUNGOVERCODERS 2026', 230, 'textSoft');
  }
}

export class ConfirmScene implements Scene {
  overlay = true;
  private menu: Menu;
  constructor(private game: Game, private text: string, onYes: () => void) {
    this.menu = new Menu(['NO', 'YES'], (i) => {
      game.pop();
      if (i === 1) onYes();
    }, () => game.pop());
  }
  update(): void {
    this.menu.update(this.game.input);
  }
  draw(r: Renderer): void {
    r.box(16, 90, SCREEN_W - 32, 60, 'dialog');
    r.textCentered(this.text, 100, 'text');
    this.menu.draw(r, 118);
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
    const items = NIGHTS.map((n) => `${cleared.includes(n.number) ? '*' : ' '} NIGHT ${n.number}  ${n.short}`);
    const allClear = NIGHTS.every((n) => cleared.includes(n.number));
    items.push(allClear ? (this.game.save.data.gameComplete ? '* MIDNIGHT: THE PORTAL' : '  MIDNIGHT: THE PORTAL') : '  ??? (CLEAR ALL NIGHTS)');
    items.push('  BACK');
    this.nightMenu.items = items;
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
    if (i < NIGHTS.length) {
      this.startNight(NIGHTS[i]);
      return;
    }
    if (i === NIGHTS.length) {
      const allClear = NIGHTS.every((n) => this.game.save.data.nightsCleared.includes(n.number));
      if (allClear) this.startNight(null);
      else audio.play('tick');
      return;
    }
    this.mode = 'main';
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
    r.sprite(TREEHOUSE, cycled(TREEHOUSE_PAL, 3, WINDOW_FLICKER, this.t, 3), 60, 32);
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
      if (Math.sin(this.t * 3 + i * 1.7) > -0.2) r.rect(fx, fy, 1, 1, 'accent');
    }
    r.box(0, 0, SCREEN_W, 18, 'panel');
    r.headingCentered('THE TREEHOUSE', 5, 'accent');
    const { found, total } = pagesFound(this.game.save.data.pages);
    r.textShadow(`PAGES ${found}/${total}`, 8, 228, 'text');
    r.textShadow(`SILVER ${this.game.save.data.silver}`, 160, 228, 'text');
    if (this.mode === 'main') {
      KID_ORDER.forEach((id, i) => {
        const s = kidFrame(id, 'idle', this.t, i);
        r.sprite(s, KIDS[id].palette, 76 + i * 28, 92 - s.h, i > 1);
      });
      r.box(SCREEN_W / 2 - 76, 128, 152, 84, 'panel');
      this.menu.draw(r, 136);
    } else if (this.mode === 'nights') {
      r.box(4, 100, SCREEN_W - 8, 120, 'panel');
      this.nightMenu.draw(r, 108, 'text', 'textDim', false, 12);
      r.text('* = CLEARED', 12, 204, 'textSoft');
    } else {
      r.box(4, 96, SCREEN_W - 8, 128, 'panel');
      KID_ORDER.forEach((id, i) => {
        const k = KIDS[id];
        const s = KID_SHEETS[id].anims.idle.frames[0];
        const y = 104 + i * 28;
        r.sprite(s, k.palette, 16 + 8 - s.w / 2, y + 24 - s.h);
        r.heading(k.name, 40, y + 1, 'accent');
        r.text(k.blurb.slice(0, 26), 40, y + 12, 'textSoft');
      });
      r.text('START TO GO BACK', 12, 212, 'textDim');
    }
  }
}

/** Options (#44, #47). */
export class OptionsScene implements Scene {
  overlay = true;
  private index = 0;
  private items = ['MUSIC', 'SOUND', 'CRT FILTER', 'HOLD TO JUMP', 'REDUCED FLASH', 'TOUCH PAD', 'REMAP KEYS', 'ERASE SAVE', 'BACK'];
  constructor(private game: Game) {}
  update(): void {
    const input = this.game.input;
    const o = this.game.save.data.options;
    if (input.pressed('down')) {
      this.index = (this.index + 1) % this.items.length;
      audio.play('menu');
    }
    if (input.pressed('up')) {
      this.index = (this.index - 1 + this.items.length) % this.items.length;
      audio.play('menu');
    }
    const dx = (input.pressed('right') ? 1 : 0) - (input.pressed('left') ? 1 : 0);
    const go = input.pressed('menu') || input.pressed('jump');
    const toggle = dx !== 0 || go;
    switch (this.items[this.index]) {
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
    if (input.pressed('pause')) this.game.pop();
  }
  draw(r: Renderer): void {
    const o = this.game.save.data.options;
    r.box(8, 24, SCREEN_W - 16, 192, 'dialog');
    r.headingCentered('OPTIONS', 32, 'accent');
    const vals: Record<string, string> = {
      MUSIC: bar(o.musicVolume),
      SOUND: bar(o.sfxVolume),
      'CRT FILTER': o.crt ? 'ON' : 'OFF',
      'HOLD TO JUMP': o.holdToJump ? 'ON' : 'OFF',
      'REDUCED FLASH': o.reducedFlash ? 'ON' : 'OFF',
      'TOUCH PAD': o.touchControls.toUpperCase(),
      'REMAP KEYS': '',
      'ERASE SAVE': '',
      BACK: '',
    };
    this.items.forEach((it, i) => {
      const sel = i === this.index;
      r.text((sel ? '►' : ' ') + it, 20, 52 + i * 14, sel ? 'text' : 'textSoft');
      r.text(vals[it], 150, 52 + i * 14, sel ? 'accent' : 'textSoft');
    });
    r.text('LEFT/RIGHT TO CHANGE', 20, 190, 'textDim');
  }
}
function bar(v: number): string {
  const n = Math.round(v * 10);
  return '●'.repeat(n) + '○'.repeat(10 - n);
}

/** Key remapping (#6). */
export class RemapScene implements Scene {
  overlay = true;
  private index = 0;
  private waiting = false;
  private actions: Action[] = ACTIONS.filter((a) => a !== 'menu');
  constructor(private game: Game) {}
  update(): void {
    const input = this.game.input;
    const kb = this.game.keyboard;
    if (this.waiting) {
      const code = kb?.lastCode();
      if (code && code !== 'Escape') {
        this.game.bindings = rebindKey(this.game.bindings, this.actions[this.index], code);
        if (kb) kb.bindings = this.game.bindings;
        this.game.save.data.bindings = this.game.bindings;
        this.game.save.save();
        this.waiting = false;
        audio.play('confirm');
      } else if (code === 'Escape') this.waiting = false;
      return;
    }
    if (input.pressed('down')) this.index = (this.index + 1) % (this.actions.length + 1);
    if (input.pressed('up')) this.index = (this.index - 1 + this.actions.length + 1) % (this.actions.length + 1);
    if (input.pressed('menu') || input.pressed('jump')) {
      if (this.index === this.actions.length) this.game.pop();
      else {
        this.waiting = true;
        audio.play('menu');
      }
    }
    if (input.pressed('pause')) this.game.pop();
  }
  draw(r: Renderer): void {
    r.box(8, 24, SCREEN_W - 16, 192, 'dialog');
    r.headingCentered('REMAP KEYS', 32, 'accent');
    this.actions.forEach((a, i) => {
      const sel = i === this.index;
      r.text((sel ? '►' : ' ') + a.toUpperCase(), 20, 52 + i * 14, sel ? 'text' : 'textSoft');
      const keys = this.game.bindings.keys[a].map(pretty).join(' ');
      r.text(sel && this.waiting ? 'PRESS A KEY...' : keys, 110, 52 + i * 14, sel ? 'accent' : 'textSoft');
    });
    const backSel = this.index === this.actions.length;
    r.text((backSel ? '►' : ' ') + 'BACK', 20, 52 + this.actions.length * 14, backSel ? 'text' : 'textSoft');
  }
}
function pretty(code: string): string {
  return code.replace('Key', '').replace('Arrow', '').replace('Digit', '').toUpperCase().slice(0, 6);
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
    r.spriteScaled(art.sprite, found ? art.pal : GREY, 67 - (art.sprite.w * scale) / 2, 112 - art.sprite.h * scale, scale);
    wrap(found ? page.creature : '???', 12).forEach((l, i) => r.heading(l, 18, 123 + i * 11, 'ink', 'paperShade'));
    r.text(page.night ? `NIGHT ${page.night}` : 'FIELD NOTES', 18, 148, 'inkAccent');
    const lx = SCREEN_W / 2 + 8;
    const col = 13;
    if (found) {
      let y = 32;
      for (const l of wrap(page.lore.join(' '), col)) {
        r.text(l, lx, y, 'ink');
        y += 10;
      }
      y += 6;
      r.heading('WEAKNESS:', lx, y, 'inkAccent', 'paperShade');
      y += 12;
      for (const l of wrap(`${page.weaknessText} ${page.hint}`, col)) {
        r.text(l, lx, y, 'ink');
        y += 10;
      }
    } else {
      wrap('PAGE NOT FOUND YET. LOOK BEHIND VENTS AND CRACKED WALLS.', col).forEach((l, i) => r.text(l, lx, 32 + i * 10, 'textDim'));
    }
    const { found: f, total } = pagesFound(this.game.save.data.pages);
    r.text(`◄ ${this.index + 1}/${MANUAL_PAGES.length} ►`, 20, 200, 'inkSoft');
    r.text(`FOUND ${f}/${total}`, 150, 200, 'inkSoft');
  }
}

/** The frame of a kid animation at time t, offset per kid so the squad isn't in lockstep. */
function kidFrame(id: KidId, name: string, t: number, i: number) {
  const a = KID_SHEETS[id].anims[name];
  return a.frames[Math.floor(t * a.fps + i * 3) % a.frames.length];
}

/** Word-wrap to lines of at most `width` characters. */
export function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!line) line = word;
    else if (line.length + 1 + word.length <= width) line += ' ' + word;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out;
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
    r.box(44, 78, SCREEN_W - 88, 84, 'dialog');
    r.headingCentered('PAUSED', 87, 'accent');
    this.menu.draw(r, 106);
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
    r.headingCentered('THE SQUAD IS DOWN', 80, 'danger');
    r.textCentered('...BUT THE NIGHT IS NOT OVER', 96, 'textSoft');
    if (this.t > 0.8) this.menu.draw(r, 130);
  }
}

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
    const scroll = Math.max(0, Math.min(this.lines.length * 12 - 100, (this.t - 1) * 12));
    this.lines.forEach((l, i) => {
      const y = 120 + i * 12 - scroll;
      if (y > 20 && y < SCREEN_H - 30) r.textCentered(l, y, i === 9 ? 'danger' : 'text');
    });
    KID_ORDER.forEach((id, i) => {
      const s = kidFrame(id, 'run', this.t, i);
      r.sprite(s, KIDS[id].palette, 60 + i * 36 + Math.sin(this.t + i) * 4, SCREEN_H - 16 - s.h);
    });
  }
}
