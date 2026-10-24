/** Bootstrap: renderer, input sources, save, scenes, fixed loop. */
import { FixedLoop } from './engine/loop';
import { Renderer } from './engine/render';
import { DEFAULT_BINDINGS, GamepadSource, InputState, KeyboardSource, TouchSource, type Bindings } from './engine/input';
import { SaveStore } from './engine/save';
import { audio } from './engine/audio';
import { GifRecorder } from './engine/gif';
import { SCREEN_H, SCREEN_W } from './engine/constants';
import { MASTER_PALETTE } from './game/palette';
import { Game } from './game/scenes/scene';
import { TitleScene } from './game/scenes/ui';
import { NightScene } from './game/scenes/night';
import { NIGHTS } from './game/levels/nights';
import './style.css';

// ?capture: deterministic frames for the visual tests (#66), no real-time loop
const capture = new URLSearchParams(location.search).has('capture');
const root = document.getElementById('app')!;
const renderer = new Renderer(root);
const save = new SaveStore(capture ? null : undefined);
renderer.fader.setPalette(Object.values(MASTER_PALETTE));
const bindings: Bindings = save.data.bindings ? { ...DEFAULT_BINDINGS, ...save.data.bindings } : DEFAULT_BINDINGS;
const input = new InputState();
const keyboard = new KeyboardSource(input.addSource(), bindings, input);
const gamepad = new GamepadSource(input.addSource(), bindings, input);
const touch = new TouchSource(input.addSource(), root, input);
const game = new Game(renderer, input, save, keyboard, touch, bindings);
game.applyOptions();
game.push(new TitleScene(game));

// Audio needs a gesture; also resume when the tab comes back.
const unlock = () => audio.unlock();
window.addEventListener('keydown', unlock, { once: false });
window.addEventListener('pointerdown', unlock);
window.addEventListener('touchstart', unlock);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') audio.unlock();
});

// Dev keys: F3 death heatmap, F9 record GIF.
const gif = new GifRecorder(SCREEN_W, SCREEN_H);
window.addEventListener('keydown', (e) => {
  if (e.code === 'F3') {
    const s = game.scene;
    if (s instanceof NightScene) s.heatmap = !s.heatmap;
    e.preventDefault();
  }
  if (e.code === 'F9') {
    if (gif.recording) {
      const bytes = gif.stop();
      const blob = new Blob([bytes as BlobPart], { type: 'image/gif' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `squad-${Date.now()}.gif`;
      a.click();
    } else gif.start();
    e.preventDefault();
  }
});

let frameCount = 0;
let lastRender = performance.now();
const loop = new FixedLoop({
  update: () => {
    gamepad.poll();
    game.update(1 / 60);
  },
  render: (alpha) => {
    game.draw(alpha);
    // real time since the last frame, so fades and CRT shimmer run at the same speed on any refresh rate
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0, (now - lastRender) / 1000));
    lastRender = now;
    renderer.present(dt);
    if (gif.recording && frameCount++ % 2 === 0) gif.addFrame(renderer.ctx.getImageData(0, 0, SCREEN_W, SCREEN_H).data);
  },
});
if (capture) import('./capture').then((m) => ((window as unknown as { __capture: unknown }).__capture = m.installCapture(game)));
else loop.start();

// Landscape nudge on phones (#46)
const orient = () => document.body.classList.toggle('portrait', window.innerHeight > window.innerWidth && (navigator.maxTouchPoints > 0));
window.addEventListener('resize', orient);
orient();

// expose for the smoke tests (scratch scripts drive the game through these)
(window as unknown as { __game: Game }).__game = game;
(window as unknown as { __debug: unknown }).__debug = {
  startNight: (i: number) => game.replace(new NightScene(game, NIGHTS[i] ?? null)),
  finale: () => game.replace(new NightScene(game, null)),
};
