/**
 * The game's random source. Normally Math.random; capture mode (#66) seeds it
 * so the same steps always draw the same frame.
 */
let source: () => number = Math.random;

export function rand(): number {
  return source();
}

/** Mulberry32: a small, fast seeded generator. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedRandom(seed: number): void {
  source = mulberry32(seed);
}
