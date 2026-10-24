/**
 * Songs (#41): tracker patterns for the four APU-style channels. Notes are
 * 16ths; `==` holds, `--` rests. Each night gets its own theme.
 */
import type { Song } from '../engine/audio';

const BASS = (a: string, b: string) => `${a}2 == -- ${a}2 ${a}2 == -- ${a}3 ${b}2 == -- ${b}2 ${b}2 == -- ${b}3`;
const KICK_SNARE = 'N2 -- -- -- N6 -- -- -- N2 -- N2 -- N6 -- -- N4';
const HAT = 'N7 -- N7 -- N7 -- N7 -- N7 -- N7 -- N7 -- N7 N7';

export const SONGS: Record<string, Song> = {
  title: {
    name: 'title',
    bpm: 112,
    duty: { pulse1: 0.5, pulse2: 0.25 },
    order: [0, 1, 0, 2],
    patterns: [
      { pulse1: 'E4 == == G4 == A4 == B4 == == A4 G4 == E4 == ==', pulse2: 'E3 -- E3 -- G3 -- A3 -- B3 -- -- A3 G3 -- E3 --', tri: BASS('E', 'C'), noise: KICK_SNARE },
      { pulse1: 'D4 == == F4 == G4 == A4 == == G4 F4 == D4 == ==', pulse2: 'D3 -- D3 -- F3 -- G3 -- A3 -- -- G3 F3 -- D3 --', tri: BASS('D', 'A'), noise: KICK_SNARE },
      { pulse1: 'B4 == A4 G4 == E4 == == D4 == E4 == G4 == == ==', pulse2: 'G3 -- -- -- E3 -- -- -- D3 -- -- -- E3 -- -- --', tri: BASS('G', 'E'), noise: KICK_SNARE },
    ],
  },
  hub: {
    name: 'hub',
    bpm: 96,
    duty: { pulse1: 0.25, pulse2: 0.125 },
    order: [0, 1],
    patterns: [
      { pulse1: 'C4 == E4 == G4 == E4 == C4 == E4 == A4 == G4 ==', pulse2: '-- -- C3 -- -- -- E3 -- -- -- C3 -- -- -- F3 --', tri: 'C2 == == == == == == == F2 == == == G2 == == ==', noise: 'N1 -- -- -- -- -- -- -- N1 -- -- -- -- -- -- --' },
      { pulse1: 'A3 == C4 == E4 == C4 == F4 == E4 == D4 == == ==', pulse2: '-- -- A2 -- -- -- C3 -- -- -- F3 -- -- -- G3 --', tri: 'A2 == == == == == == == F2 == == == G2 == == ==', noise: 'N1 -- -- -- -- -- -- -- N1 -- -- -- -- -- -- --' },
    ],
  },
  night1: {
    name: 'night1',
    bpm: 128,
    duty: { pulse1: 0.25, pulse2: 0.5 },
    order: [0, 0, 1, 2],
    patterns: [
      { pulse1: 'E4 -- E4 -- G4 == F#4 E4 -- D#4 == E4 -- -- B3 --', pulse2: 'E3 == == == -- -- B2 -- E3 == == == G3 == F#3 ==', tri: BASS('E', 'E'), noise: HAT },
      { pulse1: 'A4 -- A4 -- C5 == B4 A4 -- G4 == A4 -- -- E4 --', pulse2: 'A3 == == == -- -- E3 -- A3 == == == C4 == B3 ==', tri: BASS('A', 'A'), noise: HAT },
      { pulse1: 'B4 == A4 G4 F#4 == E4 == D#4 == E4 == F#4 == == ==', pulse2: 'B3 == == == G3 == == == B2 == == == B3 == == ==', tri: BASS('B', 'B'), noise: KICK_SNARE },
    ],
  },
  night2: {
    name: 'night2',
    bpm: 100,
    duty: { pulse1: 0.5, pulse2: 0.125 },
    order: [0, 1],
    patterns: [
      { pulse1: 'D4 == == == F4 == == == A4 == G4 == F4 == D4 ==', pulse2: 'D3 -- -- D3 -- -- D3 -- F3 -- -- F3 -- -- F3 --', tri: 'D2 == == == == == == == A#1 == == == == == == ==', noise: 'N2 -- -- -- -- -- N3 -- N2 -- -- -- -- -- N3 --' },
      { pulse1: 'A#3 == == == C4 == == == D4 == C4 == A#3 == A3 ==', pulse2: 'A#2 -- -- A#2 -- -- A#2 -- A2 -- -- A2 -- -- A2 --', tri: 'A#1 == == == == == == == A1 == == == == == == ==', noise: 'N2 -- -- -- -- -- N3 -- N2 -- -- -- -- -- N3 --' },
    ],
  },
  night3: {
    name: 'night3',
    bpm: 140,
    duty: { pulse1: 0.125, pulse2: 0.25 },
    order: [0, 1, 0, 2],
    patterns: [
      { pulse1: 'G4 -- G4 A#4 -- G4 -- F4 -- D4 -- F4 G4 -- -- --', pulse2: 'G3 -- -- -- D3 -- -- -- G3 -- -- -- D3 -- -- --', tri: BASS('G', 'G'), noise: KICK_SNARE },
      { pulse1: 'A#4 -- A#4 C5 -- A#4 -- G4 -- F4 -- G4 A#4 -- -- --', pulse2: 'A#3 -- -- -- F3 -- -- -- A#3 -- -- -- F3 -- -- --', tri: BASS('A#', 'A#'), noise: KICK_SNARE },
      { pulse1: 'D5 == C5 A#4 == G4 == A#4 == G4 == F4 == D4 == ==', pulse2: 'D4 -- -- -- A#3 -- -- -- G3 -- -- -- D3 -- -- --', tri: BASS('D', 'D'), noise: KICK_SNARE },
    ],
  },
  night4: {
    name: 'night4',
    bpm: 104,
    duty: { pulse1: 0.25, pulse2: 0.5 },
    order: [0, 1],
    patterns: [
      { pulse1: 'C4 == D#4 == G4 == F4 D#4 D4 == C4 == -- -- -- --', pulse2: '-- C3 -- -- -- C3 -- -- -- C3 -- -- G#2 -- G2 --', tri: 'C2 == == == == == == == G#1 == == == G1 == == ==', noise: 'N3 -- -- N3 -- -- N3 -- N3 -- -- N3 -- -- N5 --' },
      { pulse1: 'G#3 == C4 == D#4 == D4 C4 A#3 == G#3 == G3 == == ==', pulse2: '-- G#2 -- -- -- G#2 -- -- -- G2 -- -- G2 -- -- --', tri: 'G#1 == == == == == == == G1 == == == == == == ==', noise: 'N3 -- -- N3 -- -- N3 -- N3 -- -- N3 -- -- N5 --' },
    ],
  },
  night5: {
    name: 'night5',
    bpm: 120,
    duty: { pulse1: 0.5, pulse2: 0.25 },
    order: [0, 1],
    patterns: [
      { pulse1: 'F4 == G#4 == C5 == A#4 G#4 G4 == F4 == D#4 == C4 ==', pulse2: 'F3 -- -- F3 -- -- F3 -- C#3 -- -- C#3 -- -- C#3 --', tri: 'F2 == == == == == == == C#2 == == == == == == ==', noise: 'N1 -- N7 -- N1 -- N7 -- N1 -- N7 -- N1 -- N7 N7' },
      { pulse1: 'D#4 == F4 == G#4 == G4 F4 D#4 == C4 == D#4 == == ==', pulse2: 'D#3 -- -- D#3 -- -- D#3 -- C3 -- -- C3 -- -- C3 --', tri: 'D#2 == == == == == == == C2 == == == == == == ==', noise: 'N1 -- N7 -- N1 -- N7 -- N1 -- N7 -- N1 -- N7 N7' },
    ],
  },
  boss: {
    name: 'boss',
    bpm: 150,
    duty: { pulse1: 0.125, pulse2: 0.125 },
    order: [0, 1],
    patterns: [
      { pulse1: 'E4 E4 -- E4 G4 -- F4 -- E4 E4 -- E4 D4 -- D#4 --', pulse2: 'E3 -- E3 -- E3 -- E3 -- C3 -- C3 -- C3 -- C3 --', tri: 'E2 E2 -- E2 -- E2 -- -- C2 C2 -- C2 -- C2 -- --', noise: 'N2 N7 N6 N7 N2 N7 N6 N7 N2 N7 N6 N7 N2 N2 N6 N6' },
      { pulse1: 'F4 F4 -- F4 G#4 -- G4 -- F4 F4 -- F4 E4 -- D#4 --', pulse2: 'F3 -- F3 -- F3 -- F3 -- B2 -- B2 -- B2 -- B2 --', tri: 'F2 F2 -- F2 -- F2 -- -- B1 B1 -- B1 -- B1 -- --', noise: 'N2 N7 N6 N7 N2 N7 N6 N7 N2 N7 N6 N7 N2 N2 N6 N6' },
    ],
  },
  finale: {
    name: 'finale',
    bpm: 160,
    duty: { pulse1: 0.25, pulse2: 0.5 },
    order: [0, 1],
    patterns: [
      { pulse1: 'A4 -- A4 -- C5 -- A4 -- E5 == D5 C5 B4 == A4 ==', pulse2: 'A3 A3 -- A3 -- A3 A3 -- F3 F3 -- F3 -- F3 F3 --', tri: 'A1 == == == F1 == == == A1 == == == F1 == == ==', noise: 'N2 -- N6 -- N2 -- N6 -- N2 -- N6 -- N2 N2 N6 N6' },
      { pulse1: 'G4 -- G4 -- B4 -- G4 -- D5 == C5 B4 A4 == G4 ==', pulse2: 'G3 G3 -- G3 -- G3 G3 -- E3 E3 -- E3 -- E3 E3 --', tri: 'G1 == == == E1 == == == G1 == == == E1 == == ==', noise: 'N2 -- N6 -- N2 -- N6 -- N2 -- N6 -- N2 N2 N6 N6' },
    ],
  },
  win: {
    name: 'win',
    bpm: 120,
    duty: { pulse1: 0.5, pulse2: 0.25 },
    order: [0, 1],
    patterns: [
      { pulse1: 'C4 == E4 == G4 == C5 == == == B4 == G4 == == ==', pulse2: 'C3 -- E3 -- G3 -- C4 -- -- -- G3 -- E3 -- -- --', tri: 'C2 == == == == == == == G2 == == == == == == ==', noise: 'N1 -- -- -- N1 -- -- -- N1 -- -- -- N1 -- -- --' },
      { pulse1: 'A4 == == == F4 == == == G4 == == == C5 == == ==', pulse2: 'F3 -- -- -- F3 -- -- -- G3 -- -- -- C4 -- -- --', tri: 'F2 == == == == == == == G2 == == == C2 == == ==', noise: 'N1 -- -- -- N1 -- -- -- N1 -- -- -- N1 -- -- --' },
    ],
  },
  gameover: {
    name: 'gameover',
    bpm: 80,
    duty: { pulse1: 0.5, pulse2: 0.5 },
    order: [0],
    patterns: [{ pulse1: 'E4 == == == D#4 == == == D4 == == == C#4 == == ==', pulse2: 'B3 == == == A#3 == == == A3 == == == G#3 == == ==', tri: 'E2 == == == == == == == C2 == == == == == == ==', noise: '-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --' }],
  },
};
