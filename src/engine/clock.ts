/**
 * Wall-clock time in seconds for purely visual effects (bobbing pickups, the
 * clock pulse). Capture mode (#66) switches it to manual so it only moves
 * when the game is stepped.
 */
let manual: number | null = null;

export const clock = {
  now(): number {
    return manual ?? performance.now() / 1000;
  },
  /** Stop following real time and start from `t` seconds. */
  freeze(t = 0): void {
    manual = t;
  },
  advance(dt: number): void {
    if (manual !== null) manual += dt;
  },
};
