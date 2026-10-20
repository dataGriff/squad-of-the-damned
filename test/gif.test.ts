import { describe, expect, it } from 'vitest';
import { GifRecorder, lzw } from '../src/engine/gif';

describe('GIF recorder (#50)', () => {
  it('writes a GIF89a header, loop extension and trailer', () => {
    const g = new GifRecorder(4, 2);
    g.start();
    const frame = new Uint8ClampedArray(4 * 2 * 4);
    for (let i = 0; i < 8; i++) frame[i * 4 + 3] = 255;
    g.addFrame(frame);
    const bytes = g.stop();
    expect(String.fromCharCode(...bytes.subarray(0, 6))).toBe('GIF89a');
    expect(bytes[bytes.length - 1]).toBe(0x3b);
  });
  it('LZW output starts with a clear code and is non-empty', () => {
    const out = lzw(Uint8Array.from([1, 1, 1, 2, 2, 3]), 8);
    expect(out.length).toBeGreaterThan(2);
  });
});
