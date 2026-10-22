import { describe, expect, it } from 'vitest';
import { CHANNELS, SFX, noteToHz, parsePattern, patternLength } from '../src/engine/audio';
import { SONGS } from '../src/game/music';

describe('Chiptune sequencer (#41, #42)', () => {
  it('converts note names to frequencies', () => {
    expect(noteToHz('A4')).toBeCloseTo(440, 3);
    expect(noteToHz('C4')).toBeCloseTo(261.63, 1);
    expect(noteToHz('A#3')).toBeCloseTo(233.08, 1);
  });
  it('parses rests, holds and noise bands', () => {
    const steps = parsePattern('C4 == -- N3', 4);
    expect(steps).toEqual([{ hz: noteToHz('C4'), len: 2 }, { hz: null, len: 1 }, { hz: 3, len: 1 }]);
  });
  it('every song pattern has 16 steps per channel it uses', () => {
    for (const song of Object.values(SONGS)) {
      for (const p of song.patterns) {
        expect(patternLength(p)).toBe(16);
        for (const c of CHANNELS) if (p[c]) expect(() => parsePattern(p[c], 16)).not.toThrow();
      }
      for (const o of song.order) expect(song.patterns[o]).toBeTruthy();
    }
  });
  it('every SFX declares one of the four channels (the channel budget)', () => {
    for (const s of Object.values(SFX)) expect(CHANNELS).toContain(s.channel);
  });
});
