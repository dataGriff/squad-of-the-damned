/**
 * Capture mode (#66): loaded instead of the real-time loop when the page has
 * `?capture`. The random source is seeded, the clock only moves when the game
 * is stepped and the save lives in memory, so a named shot always produces the
 * same 256×240 frame. `npm run test:visual` drives it through `window.__capture`.
 */
import type { Action } from './engine/input';
import { SaveStore } from './engine/save';
import { seedRandom } from './engine/random';
import { clock } from './engine/clock';
import type { Game } from './game/scenes/scene';
import { TitleScene, HubScene, OptionsScene, ManualScene, GameOverScene, WinScene, ConfirmScene } from './game/scenes/ui';
import { NightScene } from './game/scenes/night';
import { StoryScene } from './game/scenes/story';
import { CHAPTERS } from './game/story';
import { NIGHTS } from './game/levels/nights';
import { SAFE, contains } from './game/design/layout';
import { hasGlyph } from './engine/font';
import { displayGlyph } from './engine/display-font';
import { isRegisteredPair } from './game/art/registry';
import type { SpritePalette } from './game/palette';

const DT = 1 / 60;

export interface Shot {
  /** The 256×240 frame as a PNG data URL. */
  png: string;
  /** Text outside the safe area or missing glyphs (#61), sprites in unregistered palettes (#63). */
  problems: string[];
}

export interface CaptureApi {
  /** Names of every shot, in a stable order. */
  shots: string[];
  /** Reset to a fresh game and play the named shot's setup. */
  shoot(name: string): Shot;
}

/** Shot setups. Each starts from `reset()`: a fresh save, seed 1 and a clock at zero. */
function shotTable(c: Capturer): Record<string, () => void> {
  const g = c.game;
  const night = (i: number, at: number, pages: string[] = []) => {
    g.save.data.pages = pages;
    g.replace(new NightScene(g, NIGHTS[i]));
    c.step(10);
    c.press('menu');
    c.step(10);
    const d = (g.scene as NightScene).debug;
    const x = Math.round(d.map.pixelWidth * at);
    d.player.respawn(x, 208);
    d.world.camera.snapTo(x, 120, 1);
    c.step(45);
  };
  return {
    title: () => {
      g.replace(new TitleScene(g));
      c.step(120);
    },
    'title-menu': () => {
      g.save.data.nightsCleared = [1];
      g.replace(new TitleScene(g));
      c.step(30);
      c.press('menu');
      c.step(30);
    },
    confirm: () => {
      g.replace(new TitleScene(g));
      c.step(20);
      g.push(new ConfirmScene(g, 'ERASE SAVE AND START OVER?', () => {}));
      c.step(20);
    },
    hub: () => {
      g.replace(new HubScene(g));
      c.step(60);
    },
    'hub-nights': () => {
      g.save.data.nightsCleared = [1, 2];
      g.replace(new HubScene(g));
      c.step(20);
      c.press('jump');
      c.step(20);
    },
    'hub-squad': () => {
      g.save.data.kidsUnlocked = ['sling', 'garlic', 'big', 'little'];
      g.replace(new HubScene(g));
      c.step(20);
      c.press('down');
      c.step(2);
      c.press('jump');
      c.step(20);
    },
    options: () => {
      g.replace(new HubScene(g));
      c.step(10);
      g.push(new OptionsScene(g));
      c.step(20);
    },
    manual: () => {
      g.save.data.pages = ['vampire', 'bat'];
      g.replace(new HubScene(g));
      c.step(10);
      g.push(new ManualScene(g));
      c.step(20);
    },
    story: () => {
      g.replace(new StoryScene(g, [CHAPTERS.intro], () => {}));
      c.step(360);
    },
    night1: () => night(0, 0.3),
    night2: () => night(1, 0.45),
    night3: () => night(2, 0.6),
    night4: () => night(3, 0.3),
    night5: () => night(4, 0.5),
    boss: () => {
      night(2, 0, ['wolfman']);
      const d = (g.scene as NightScene).debug;
      const a = d.map.objectsOfType('arena')[0];
      d.player.respawn(a.x + 24, 208);
      d.world.camera.snapTo(a.x + 24, 120, 1);
      c.step(150);
    },
    pause: () => {
      night(0, 0.1);
      c.press('pause');
      c.step(20);
    },
    finale: () => {
      g.save.data.nightsCleared = [1, 2, 3, 4, 5];
      g.replace(new NightScene(g, null));
      c.step(10);
      c.press('menu');
      c.step(60);
    },
    'game-over': () => {
      night(0, 0.1);
      g.push(new GameOverScene(g, () => {}));
      c.step(20);
    },
    win: () => {
      g.replace(new WinScene(g));
      c.step(120);
    },
  };
}

class Capturer {
  private src: Set<Action>;
  constructor(public game: Game) {
    this.src = game.input.addSource();
  }
  reset(): void {
    seedRandom(1);
    clock.freeze(0);
    const g = this.game;
    while (g.stack.length) g.pop();
    g.save = new SaveStore(null);
    g.renderer.fader.start(0);
    g.idle = 0;
  }
  /** Hold `a` for one tick. */
  press(a: Action): void {
    this.src.add(a);
    this.step(1);
    this.src.delete(a);
  }
  step(frames: number): void {
    for (let i = 0; i < frames; i++) {
      this.game.update(DT);
      clock.advance(DT);
      this.game.renderer.fader.tick(DT);
    }
  }
  frame(): Shot {
    const r = this.game.renderer;
    r.textLog = [];
    const drawn = new Map<string, { name: string; pal: SpritePalette }>();
    r.atlas.onGet = (s, p) => drawn.set(`${s.name}|${p.join(',')}`, { name: s.name, pal: p });
    this.game.draw(1);
    r.present(0);
    r.atlas.onGet = null;
    const problems: string[] = [];
    // every sprite drawn must be in the art registry with the palette it was drawn in (#63)
    for (const { name, pal } of drawn.values()) if (!isRegisteredPair(name, pal)) problems.push(`sprite '${name}' drawn in unregistered palette ${pal.slice(1).join(' ')}`);
    for (const t of r.textLog) {
      if (!contains(SAFE, t)) problems.push(`'${t.text}' at ${t.x},${t.y} (${t.w}×${t.h}) is outside the safe area`);
      const missing = [...t.text].filter((ch) => ch !== ' ' && !hasGlyph(ch) && !(t.face === 'bold' && displayGlyph(ch)));
      if (missing.length) problems.push(`'${t.text}' has no glyph for ${missing.map((c) => `'${c}'`).join(', ')}`);
    }
    r.textLog = null;
    return { png: r.buffer.toDataURL('image/png'), problems };
  }
}

export function installCapture(game: Game): CaptureApi {
  const c = new Capturer(game);
  const table = shotTable(c);
  return {
    shots: Object.keys(table),
    shoot(name: string): Shot {
      const setup = table[name];
      if (!setup) throw new Error(`No capture shot '${name}'`);
      c.reset();
      setup();
      return c.frame();
    },
  };
}
