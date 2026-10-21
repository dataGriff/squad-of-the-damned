/** Title, hub, options, remap, manual, pause, game over, win (#30, #35, #44, #45, #47). */
import type { Renderer } from '../../engine/render';
import { SCREEN_H, SCREEN_W } from '../../engine/constants';
import { ACTIONS, rebindKey, type Action } from '../../engine/input';
import { audio } from '../../engine/audio';
import { Game, Menu, type Scene } from './scene';
import { SONGS } from '../music';
import { MANUAL_PAGES, pagesFound } from '../manual';
import { KIDS, KID_ORDER } from '../squad';
import { KID_SHEETS } from '../art/kids';
import { NIGHTS } from '../levels/nights';
import { tileSprite } from '../art/tiles';
import { AIR_U } from '../art/autotiles';
import { drawBackdrop } from '../backdrop';
import { BAT, BAT_PAL, CREATURE_ART } from '../art/monsters';
import { DRIP, DRIP_PAL, OAK_CANOPY, OAK_CANOPY_PAL, OAK_TRUNK, OAK_TRUNK_PAL, ROPE_LADDER, ROPE_PAL, TREEHOUSE, TREEHOUSE_PAL } from '../art/scenery';
import { NightScene } from './night';

const GREY: readonly [null, string, string, string] = [null, '#3c3c3c', '#3c3c3c', '#3c3c3c'];

export class TitleScene implements Scene {
  private t = 0;
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
    drawBackdrop(r, 'graveyard', this.t * 10, this.t);
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
      const s = KID_SHEETS[id].anims.idle.frames[Math.floor(this.t * 2 + i) % 2];
      r.sprite(s, KIDS[id].palette, 84 + i * 24, 208 - s.h, false);
    });
    // logo: a dithered dark band behind it, then the small line and the big dripping title
    r.dither(0, 28, SCREEN_W, 68, '#000000');
    r.dither(0, 36, SCREEN_W, 52, '#000000', 1);
    const small = 'SQUAD OF';
    r.bigText(small, (SCREEN_W - r.bigTextWidth(small)) / 2, 34, '#fcfcfc', '#bcbcbc');
    const big = 'THE DAMNED';
    const bw = r.bigTextWidth(big, 3);
    const bx = Math.round((SCREEN_W - bw) / 2);
    r.bigText(big, bx, 56, '#e40058', '#a80020', 3);
    for (let i = 0; i < 7; i++) {
      const x = bx + 6 + i * 11 + ((i * 7) % 5);
      const len = ((this.t * 9 + i * 13) % 26) - 4;
      if (len > 0) {
        r.rect(x, 82, 1, Math.min(len, 14), '#a80020');
        if (len > 14) r.sprite(DRIP, DRIP_PAL, x - 1, 82 + len - 2);
      }
    }
    if (!this.showMenu) {
      if (Math.floor(this.t * 2) % 2 === 0) r.textShadow('PRESS START', SCREEN_W / 2 - 44, 132, '#fcfcfc');
    } else {
      r.box(SCREEN_W / 2 - 60, 118, 120, this.menu.items.length * 12 + 12, '#000000');
      this.menu.draw(r, 124);
    }
    r.rect(0, 228, SCREEN_W, 12, '#000000');
    r.textCentered('HUNGOVERCODERS 2026', 230, '#bcbcbc');
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
    r.box(16, 90, SCREEN_W - 32, 60, '#0000a8');
    r.textCentered(this.text, 100, '#fcfcfc');
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
    this.menu = new Menu(['PICK A NIGHT', 'THE SQUAD', 'MONSTER MANUAL', 'OPTIONS', 'TITLE SCREEN'], (i) => {
      if (i === 0) this.mode = 'nights';
      else if (i === 1) this.mode = 'squad';
      else if (i === 2) game.push(new ManualScene(game));
      else if (i === 3) game.push(new OptionsScene(game));
      else game.replace(new TitleScene(game));
    });
    this.nightMenu = new Menu([], (i) => this.pickNight(i), () => (this.mode = 'main'));
    this.refreshNights();
  }
  private refreshNights(): void {
    const cleared = this.game.save.data.nightsCleared;
    const items = NIGHTS.map((n) => `${cleared.includes(n.number) ? '*' : ' '} ${n.title}`);
    const allClear = NIGHTS.every((n) => cleared.includes(n.number));
    items.push(allClear ? (this.game.save.data.gameComplete ? '* MIDNIGHT: THE PORTAL' : '  MIDNIGHT: THE PORTAL') : '  ??? (CLEAR ALL NIGHTS)');
    items.push('  BACK');
    this.nightMenu.items = items;
  }
  private pickNight(i: number): void {
    if (i < NIGHTS.length) {
      this.game.replace(new NightScene(this.game, NIGHTS[i]));
      return;
    }
    if (i === NIGHTS.length) {
      const allClear = NIGHTS.every((n) => this.game.save.data.nightsCleared.includes(n.number));
      if (allClear) this.game.replace(new NightScene(this.game, null));
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
    r.sprite(TREEHOUSE, TREEHOUSE_PAL, 60, 32);
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
      if (Math.sin(this.t * 3 + i * 1.7) > -0.2) r.rect(fx, fy, 1, 1, '#f8d878');
    }
    r.box(0, 0, SCREEN_W, 18, '#000000');
    r.textCentered('THE TREEHOUSE', 5, '#f8d878');
    const { found, total } = pagesFound(this.game.save.data.pages);
    r.textShadow(`PAGES ${found}/${total}`, 8, 228, '#fcfcfc');
    r.textShadow(`SILVER ${this.game.save.data.silver}`, 160, 228, '#fcfcfc');
    if (this.mode === 'main') {
      KID_ORDER.forEach((id, i) => {
        const s = KID_SHEETS[id].anims.idle.frames[Math.floor(this.t * 2 + i) % 2];
        r.sprite(s, KIDS[id].palette, 76 + i * 28, 92 - s.h, i > 1);
      });
      r.box(SCREEN_W / 2 - 76, 136, 152, 72, '#000000');
      this.menu.draw(r, 144);
    } else if (this.mode === 'nights') {
      r.box(4, 100, SCREEN_W - 8, 120, '#000000');
      this.nightMenu.draw(r, 108, '#fcfcfc', '#7c7c7c', false, 12);
      r.text('* = CLEARED', 12, 204, '#bcbcbc');
    } else {
      r.box(4, 96, SCREEN_W - 8, 128, '#000000');
      KID_ORDER.forEach((id, i) => {
        const k = KIDS[id];
        const s = KID_SHEETS[id].anims.idle.frames[0];
        const y = 104 + i * 28;
        r.sprite(s, k.palette, 16 + 8 - s.w / 2, y + 24 - s.h);
        r.text(k.name, 40, y + 2, '#f8d878');
        r.text(k.blurb.slice(0, 26), 40, y + 12, '#bcbcbc');
      });
      r.text('START TO GO BACK', 12, 212, '#7c7c7c');
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
    r.box(8, 24, SCREEN_W - 16, 192, '#0000a8');
    r.textCentered('OPTIONS', 32, '#f8d878');
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
      r.text((sel ? '►' : ' ') + it, 20, 52 + i * 14, sel ? '#fcfcfc' : '#bcbcbc');
      r.text(vals[it], 150, 52 + i * 14, sel ? '#f8d878' : '#bcbcbc');
    });
    r.text('LEFT/RIGHT TO CHANGE', 20, 190, '#7c7c7c');
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
    r.box(8, 24, SCREEN_W - 16, 192, '#0000a8');
    r.textCentered('REMAP KEYS', 32, '#f8d878');
    this.actions.forEach((a, i) => {
      const sel = i === this.index;
      r.text((sel ? '►' : ' ') + a.toUpperCase(), 20, 52 + i * 14, sel ? '#fcfcfc' : '#bcbcbc');
      const keys = this.game.bindings.keys[a].map(pretty).join(' ');
      r.text(sel && this.waiting ? 'PRESS A KEY...' : keys, 110, 52 + i * 14, sel ? '#f8d878' : '#bcbcbc');
    });
    const backSel = this.index === this.actions.length;
    r.text((backSel ? '►' : ' ') + 'BACK', 20, 52 + this.actions.length * 14, backSel ? '#fcfcfc' : '#bcbcbc');
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
    r.rect(6, 18, SCREEN_W - 12, 204, '#2c1600');
    r.rect(8, 20, SCREEN_W - 16, 200, '#503000');
    r.rect(12, 24, SCREEN_W - 24, 192, '#f8d8c8');
    r.dither(SCREEN_W / 2 - 6, 24, 6, 192, '#f0d0b0');
    r.dither(SCREEN_W / 2 + 1, 24, 6, 192, '#f0d0b0', 1);
    r.rect(SCREEN_W / 2, 24, 1, 192, '#503000');
    // framed hint art, pixel-doubled when it fits
    const art = CREATURE_ART[page.art];
    const scale = Math.max(1, Math.min(3, Math.floor(Math.min(84 / art.sprite.w, 80 / art.sprite.h))));
    r.rect(18, 30, 98, 88, '#503000');
    r.rect(20, 32, 94, 84, found ? '#000000' : '#3c3c3c');
    r.spriteScaled(art.sprite, found ? art.pal : GREY, 67 - (art.sprite.w * scale) / 2, 112 - art.sprite.h * scale, scale);
    wrap(found ? page.creature : '???', 12).forEach((l, i) => r.text(l, 18, 124 + i * 10, '#2c1600'));
    r.text(page.night ? `NIGHT ${page.night}` : 'FIELD NOTES', 18, 148, '#a80020');
    const lx = SCREEN_W / 2 + 8;
    const col = 13;
    if (found) {
      let y = 32;
      for (const l of wrap(page.lore.join(' '), col)) {
        r.text(l, lx, y, '#2c1600');
        y += 10;
      }
      y += 6;
      r.text('WEAKNESS:', lx, y, '#a80020');
      y += 12;
      for (const l of wrap(`${page.weaknessText} ${page.hint}`, col)) {
        r.text(l, lx, y, '#2c1600');
        y += 10;
      }
    } else {
      wrap('PAGE NOT FOUND YET. LOOK BEHIND VENTS AND CRACKED WALLS.', col).forEach((l, i) => r.text(l, lx, 32 + i * 10, '#7c7c7c'));
    }
    const { found: f, total } = pagesFound(this.game.save.data.pages);
    r.text(`◄ ${this.index + 1}/${MANUAL_PAGES.length} ►`, 20, 200, '#503000');
    r.text(`FOUND ${f}/${total}`, 150, 200, '#503000');
  }
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
    r.box(44, 78, SCREEN_W - 88, 84, '#0000a8');
    r.textCentered('PAUSED', 88, '#f8d878');
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
    r.clear('#000000');
    r.textCentered('THE SQUAD IS DOWN', 80, '#e40058');
    r.textCentered('...BUT THE NIGHT IS NOT OVER', 96, '#bcbcbc');
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
    r.clear('#000000');
    const scroll = Math.max(0, Math.min(this.lines.length * 12 - 100, (this.t - 1) * 12));
    this.lines.forEach((l, i) => {
      const y = 120 + i * 12 - scroll;
      if (y > 20 && y < SCREEN_H - 30) r.textCentered(l, y, i === 9 ? '#e40058' : '#fcfcfc');
    });
    KID_ORDER.forEach((id, i) => {
      const s = KID_SHEETS[id].anims.run.frames[Math.floor(this.t * 8 + i) % 4];
      r.sprite(s, KIDS[id].palette, 60 + i * 36 + Math.sin(this.t + i) * 4, SCREEN_H - 16 - s.h);
    });
  }
}
