/** Bootstrap: renderer, input sources, save, scenes, fixed loop. */
import { FixedLoop } from './engine/loop';
import { Renderer } from './engine/render';
import { DEFAULT_BINDINGS, GamepadSource, InputState, KeyboardSource, TouchSource, type Bindings } from './engine/input';
import { SaveStore } from './engine/save';
import { audio } from './engine/audio';
import { GifRecorder } from './engine/gif';
import { SCREEN_H, SCREEN_W } from './engine/constants';
import { Game } from './game/scenes/scene';
import { TitleScene } from './game/scenes/ui';
import { NightScene } from './game/scenes/night';
import './style.css';

const root = document.getElementById('app')!;
const renderer = new Renderer(root);
const save = new SaveStore();
const bindings: Bindings = save.data.bindings ? { ...DEFAULT_BINDINGS, ...save.data.bindings } : DEFAULT_BINDINGS;
const input = new InputState();
const keyboard = new KeyboardSource(input.addSource(), bindings, input);
const gamepad = new GamepadSource(input.addSource(), bindings);
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
const loop = new FixedLoop({
  update: () => {
    gamepad.poll();
    game.update(1 / 60);
  },
  render: (alpha) => {
    game.draw(alpha);
    renderer.present(1 / 60);
    if (gif.recording && frameCount++ % 2 === 0) gif.addFrame(renderer.ctx.getImageData(0, 0, SCREEN_W, SCREEN_H).data);
  },
});
loop.start();

// Landscape nudge on phones (#46)
const orient = () => document.body.classList.toggle('portrait', window.innerHeight > window.innerWidth && (navigator.maxTouchPoints > 0));
window.addEventListener('resize', orient);
orient();

// expose for the smoke test
(window as unknown as { __game: Game }).__game = game;
