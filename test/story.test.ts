import { describe, expect, it } from 'vitest';
import { CHAPTERS, CHAPTER_ORDER, afterChapter, beforeChapter, storySoFar } from '../src/game/story';
import { StoryScene, TEXT_COLS } from '../src/game/scenes/story';
import { wrap } from '../src/game/scenes/ui';
import { InputState, type Action } from '../src/engine/input';
import { SaveStore, migrate } from '../src/engine/save';
import { NIGHTS } from '../src/game/levels/nights';
import type { Game } from '../src/game/scenes/scene';

function fakeGame() {
  const input = new InputState();
  const keys = input.addSource();
  const save = new SaveStore(null);
  const game = { input, save } as unknown as Game;
  const press = (scene: StoryScene, a: Action) => {
    keys.add(a);
    input.tick();
    scene.update(1 / 60);
    keys.delete(a);
    input.tick();
    scene.update(1 / 60);
  };
  return { game, save, press };
}

describe('Story screens (#57)', () => {
  it('every chapter in the order exists, has panels, and its text fits the box', () => {
    for (const id of CHAPTER_ORDER) {
      const ch = CHAPTERS[id];
      expect(ch, id).toBeTruthy();
      expect(ch.panels.length).toBeGreaterThan(0);
      for (const p of ch.panels) {
        expect(p.text.length).toBeGreaterThan(10);
        expect(wrap(p.text, TEXT_COLS).length, p.text).toBeLessThanOrEqual(5);
      }
    }
  });
  it('every night has a chapter before and after it, plus the finale and ending', () => {
    for (const n of NIGHTS) {
      expect(beforeChapter(n.number)).toBeTruthy();
      expect(afterChapter(n.number)).toBeTruthy();
    }
    expect(beforeChapter(null)).toBe('finale');
    expect(afterChapter(null)).toBe('ending');
  });
  it('story so far replays seen chapters in story order', () => {
    expect(storySoFar(['before-night2', 'intro']).map((c) => c.id)).toEqual(['intro', 'before-night2']);
  });
  it('A advances through panels and marks the chapter seen when done', () => {
    const { game, save, press } = fakeGame();
    let done = 0;
    const s = new StoryScene(game, [CHAPTERS.intro], () => done++);
    s.enter();
    for (let i = 0; i < CHAPTERS.intro.panels.length * 2; i++) press(s, 'jump'); // first press finishes the text, second advances
    expect(done).toBe(1);
    expect(save.data.storySeen).toContain('intro');
  });
  it('START skips the whole thing and still marks it seen', () => {
    const { game, save, press } = fakeGame();
    let done = 0;
    const s = new StoryScene(game, [CHAPTERS.finale, CHAPTERS.ending], () => done++);
    s.enter();
    press(s, 'pause');
    expect(done).toBe(1);
    expect(save.data.storySeen).toEqual(expect.arrayContaining(['finale', 'ending']));
  });
  it('old saves migrate: progress means the intro counts as seen', () => {
    expect(migrate({ version: 2, nightsCleared: [1] }).storySeen).toEqual(['intro']);
    expect(migrate({ version: 2, nightsCleared: [] }).storySeen).toEqual([]);
  });
});
