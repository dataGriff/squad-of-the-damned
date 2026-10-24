/**
 * Tiny GIF89a encoder (#50): captures the 256×240 buffer and writes an
 * animated GIF with a global palette. Enough for trailer clips; no deps.
 */
export class GifRecorder {
  frames: Uint8Array[] = [];
  private palette: number[] = [];
  private index = new Map<number, number>();
  recording = false;
  maxFrames = 300;
  constructor(public w: number, public h: number, public delayCs = 3) {}

  start(): void {
    this.frames = [];
    this.palette = [];
    this.index.clear();
    this.recording = true;
  }

  /** Add an RGBA frame (from getImageData). Colours beyond 256 map to nearest. */
  addFrame(rgba: Uint8ClampedArray): void {
    if (!this.recording || this.frames.length >= this.maxFrames) return;
    const px = new Uint8Array(this.w * this.h);
    for (let i = 0; i < px.length; i++) {
      const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
      const key = (r << 16) | (g << 8) | b;
      let idx = this.index.get(key);
      if (idx === undefined) {
        if (this.palette.length < 256) {
          idx = this.palette.length;
          this.palette.push(key);
        } else idx = this.nearest(r, g, b);
        this.index.set(key, idx);
      }
      px[i] = idx;
    }
    this.frames.push(px);
  }

  private nearest(r: number, g: number, b: number): number {
    let best = 0, bd = Infinity;
    this.palette.forEach((c, i) => {
      const d = (((c >> 16) & 255) - r) ** 2 + (((c >> 8) & 255) - g) ** 2 + ((c & 255) - b) ** 2;
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  stop(): Uint8Array {
    this.recording = false;
    return this.encode();
  }

  encode(): Uint8Array {
    const out: number[] = [];
    const str = (s: string) => { for (const ch of s) out.push(ch.charCodeAt(0)); };
    const u16 = (n: number) => { out.push(n & 255, (n >> 8) & 255); };
    str('GIF89a');
    u16(this.w); u16(this.h);
    out.push(0xf7, 0, 0); // global colour table, 8 bits, 256 entries
    for (let i = 0; i < 256; i++) {
      const c = this.palette[i] ?? 0;
      out.push((c >> 16) & 255, (c >> 8) & 255, c & 255);
    }
    // NETSCAPE loop extension
    out.push(0x21, 0xff, 0x0b); str('NETSCAPE2.0'); out.push(3, 1, 0, 0, 0);
    for (const f of this.frames) {
      out.push(0x21, 0xf9, 4, 0); u16(this.delayCs); out.push(0, 0);
      out.push(0x2c); u16(0); u16(0); u16(this.w); u16(this.h); out.push(0);
      out.push(8); // LZW min code size
      const data = lzw(f, 8);
      for (let i = 0; i < data.length; i += 255) {
        const chunk = data.subarray(i, Math.min(i + 255, data.length));
        out.push(chunk.length, ...chunk);
      }
      out.push(0);
    }
    out.push(0x3b);
    return Uint8Array.from(out);
  }
}

/** LZW with variable code width, as the GIF spec requires. */
export function lzw(px: Uint8Array, minCode: number): Uint8Array {
  const clear = 1 << minCode;
  const eoi = clear + 1;
  let codeSize = minCode + 1;
  let next = eoi + 1;
  let dict = new Map<string, number>();
  const out: number[] = [];
  let acc = 0, bits = 0;
  const emit = (code: number) => {
    acc |= code << bits;
    bits += codeSize;
    while (bits >= 8) { out.push(acc & 255); acc >>= 8; bits -= 8; }
  };
  emit(clear);
  let prefix = '';
  for (const p of px) {
    const key = prefix ? prefix + ',' + p : String(p);
    if (prefix === '' || dict.has(key)) { prefix = key; continue; }
    emit(prefix.includes(',') ? dict.get(prefix)! : Number(prefix));
    if (next < 4096) {
      dict.set(key, next++);
      if (next - 1 === 1 << codeSize && codeSize < 12) codeSize++;
    } else {
      emit(clear);
      dict = new Map();
      next = eoi + 1;
      codeSize = minCode + 1;
    }
    prefix = String(p);
  }
  if (prefix) emit(prefix.includes(',') ? dict.get(prefix)! : Number(prefix));
  emit(eoi);
  if (bits > 0) out.push(acc & 255);
  return Uint8Array.from(out);
}
