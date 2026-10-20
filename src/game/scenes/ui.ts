/** Title, hub, options, remap, manual, pause, game over, win (#30, #35, #44, #45, #47). */
import type { Renderer } from '../../engine/render';
import { SCREEN_H, SCREEN_W } from '../../engine/constants';
import { ACTIONS, rebindKey, type Action } from '../../engine/input';
import { audio } from '../../engine/audio';
import { Game, Menu, type Scene } from './scene';
import { SONGS } from '../music';
import { MANUAL_PAGES, pagesFound } from '../manual';
import { CREATURE_ART } from '../art/monsters';
import { KIDS, KID_ORDER } from '../squad';
import { KID_SHEETS } from '../art/kids';
import { NIGHTS } from '../levels/nights';
import { tileSprite, THEMES } from '../art/tiles';
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
    r.clear('#000000');
    // moon + skyline backdrop
    r.rect(0, 0, SCREEN_W, 150, '#0000a8');
    r.rect(190, 24, 28, 28, '#f8f8b8');
    r.rect(186, 28, 36, 20, '#f8f8b8');
    r.rect(190, 20, 28, 36, '#f8f8b8');
    for (let i = 0; i < 16; i++) r.rect(i * 16, 150 - ((i * 37) % 48), 16, 100, '#000000');
    const th = THEMES.graveyard;
    for (let x = 0; x < SCREEN_W; x += 16) {
      const t = tileSprite(1, 'graveyard');
      if (t) r.sprite(t.sprite, th.tiles, x, 208);
      const f = tileSprite(2, 'graveyard');
      if (f) r.sprite(f.sprite, th.tiles, x, 224);
    }
    const g = tileSprite(9, 'graveyard');
    if (g) {
      r.sprite(g.sprite, th.deco, 40, 192);
      r.sprite(g.sprite, th.deco, 200, 192);
    }
    // the squad standing on the ground
    KID_ORDER.forEach((id, i) => {
      const s = KID_SHEETS[id].anims.idle.frames[Math.floor(this.t * 2 + i) % 2];
      r.sprite(s, KIDS[id].palette, 88 + i * 22, 208 - s.h, false);
    });
    r.textCentered('SQUAD OF', 60, '#e40058');
    r.textCentered('THE DAMNED', 72, '#e40058');
    r.rect(72, 84, 112, 1, '#f8d878');
    if (!this.showMenu) {
      if (Math.floor(this.t * 2) % 2 === 0) r.textCentered('PRESS START', 120, '#fcfcfc');
    } else this.menu.draw(r, 110);
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
    r.rect(16, 90, SCREEN_W - 32, 60, '#000000');
    r.rect(17, 91, SCREEN_W - 34, 58, '#0000a8');
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
    r.clear('#0000a8');
    // tree + treehouse backdrop
    r.rect(0, 180, SCREEN_W, 60, '#007800');
    r.rect(112, 60, 32, 180, '#503000');
    r.rect(60, 40, 136, 60, '#2c1600');
    r.rect(64, 44, 128, 52, '#503000');
    const th = THEMES.hub;
    for (let x = 64; x < 192; x += 16) {
      const p = tileSprite(1, 'hub');
      if (p) r.sprite(p.sprite, th.tiles, x, 96);
    }
    const w = tileSprite(9, 'hub');
    if (w) {
      r.sprite(w.sprite, th.deco, 72, 56);
      r.sprite(w.sprite, th.deco, 168, 56);
    }
    const l = tileSprite(10, 'hub');
    if (l) for (let x = 40; x < 220; x += 16) r.sprite(l.sprite, th.deco, x, 28 + ((x / 16) % 2) * 4);
    r.rect(0, 0, SCREEN_W, 24, '#000000');
    r.textCentered('THE TREEHOUSE', 8, '#f8d878');
    const { found, total } = pagesFound(this.game.save.data.pages);
    r.text(`PAGES ${found}/${total}`, 8, 228, '#bcbcbc');
    r.text(`SILVER ${this.game.save.data.silver}`, 160, 228, '#bcbcbc');
    if (this.mode === 'main') {
      KID_ORDER.forEach((id, i) => {
        const s = KID_SHEETS[id].anims.idle.frames[Math.floor(this.t * 2 + i) % 2];
        r.sprite(s, KIDS[id].palette, 72 + i * 30, 96 - s.h, i > 1);
      });
      this.menu.draw(r, 130);
    } else if (this.mode === 'nights') {
      r.rect(8, 104, SCREEN_W - 16, 112, '#000000');
      this.nightMenu.draw(r, 110, '#fcfcfc', '#7c7c7c', false, 12);
      r.text('* = CLEARED', 12, 204, '#bcbcbc');
    } else {
      r.rect(8, 100, SCREEN_W - 16, 120, '#000000');
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
    r.rect(8, 24, SCREEN_W - 16, 192, '#000000');
    r.rect(9, 25, SCREEN_W - 18, 190, '#0000a8');
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
    r.rect(8, 24, SCREEN_W - 16, 192, '#000000');
    r.rect(9, 25, SCREEN_W - 18, 190, '#0000a8');
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
    // parchment
    r.rect(8, 20, SCREEN_W - 16, 200, '#2c1600');
    r.rect(12, 24, SCREEN_W - 24, 192, '#f8d8c8');
    r.rect(SCREEN_W / 2, 24, 1, 192, '#503000');
    const art = CREATURE_ART[page.art];
    const ax = 20 + 48 - art.sprite.w / 2;
    const ay = 40 + 48 - art.sprite.h / 2;
    r.sprite(art.sprite, found ? art.pal : GREY, ax, ay);
    r.text(found ? page.creature : '???', 20, 100, '#2c1600');
    r.text(page.night ? `NIGHT ${page.night}` : 'FIELD NOTES', 20, 112, '#503000');
    const lx = SCREEN_W / 2 + 8;
    if (found) {
      page.lore.forEach((line, i) => r.text(line, lx, 40 + i * 10, '#2c1600'));
      r.text('WEAKNESS:', lx, 84, '#e40058');
      r.text(page.weaknessText, lx, 96, '#2c1600');
      r.text(page.hint.slice(0, 14), lx, 106, '#2c1600');
      r.text(page.hint.slice(14, 28), lx, 116, '#2c1600');
      r.text(page.hint.slice(28, 42), lx, 126, '#2c1600');
    } else {
      r.text('PAGE NOT FOUND', lx, 40, '#7c7c7c');
      r.text('YET.', lx, 50, '#7c7c7c');
      r.text('LOOK BEHIND', lx, 70, '#7c7c7c');
      r.text('VENTS AND', lx, 80, '#7c7c7c');
      r.text('CRACKED WALLS.', lx, 90, '#7c7c7c');
    }
    const { found: f, total } = pagesFound(this.game.save.data.pages);
    r.text(`◄ ${this.index + 1}/${MANUAL_PAGES.length} ►`, 20, 200, '#503000');
    r.text(`FOUND ${f}/${total}`, 150, 200, '#503000');
  }
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
    r.rect(48, 80, SCREEN_W - 96, 80, '#000000');
    r.rect(49, 81, SCREEN_W - 98, 78, '#0000a8');
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
