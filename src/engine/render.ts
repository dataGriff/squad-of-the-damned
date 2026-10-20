import { SCREEN_H, SCREEN_W } from './constants';
import { glyph, FONT_W } from './font';
import type { Sprite } from './sprites';
import { Atlas } from './sprites';
import type { SpritePalette } from '../game/palette';

/**
 * Renderer: draws into a 256×240 2D buffer, then presents it to the display
 * canvas at an integer scale. The optional CRT pass (#43) is a WebGL fragment
 * shader with scanlines and slight barrel curvature; without WebGL it falls
 * back to a 2D scanline overlay.
 */
export class Renderer {
  readonly buffer: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly display: HTMLCanvasElement;
  readonly atlas = new Atlas();
  private ctx2d: CanvasRenderingContext2D | null = null;
  private gl: WebGLRenderingContext | null = null;
  private glTex: WebGLTexture | null = null;
  private glProg: WebGLProgram | null = null;
  private uCurv: WebGLUniformLocation | null = null;
  private uScan: WebGLUniformLocation | null = null;
  private uTime: WebGLUniformLocation | null = null;
  crt = false;
  private crtInitFailed = false;
  scale = 1;
  private fontCache = new Map<string, HTMLCanvasElement>();
  private time = 0;

  constructor(parent: HTMLElement) {
    this.buffer = document.createElement('canvas');
    this.buffer.width = SCREEN_W;
    this.buffer.height = SCREEN_H;
    this.ctx = this.buffer.getContext('2d', { alpha: false })!;
    this.ctx.imageSmoothingEnabled = false;
    this.display = document.createElement('canvas');
    this.display.className = 'screen';
    parent.appendChild(this.display);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const parent = this.display.parentElement!;
    const availW = parent.clientWidth || window.innerWidth;
    const availH = parent.clientHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const scale = Math.max(1, Math.floor(Math.min((availW * dpr) / SCREEN_W, (availH * dpr) / SCREEN_H)));
    this.scale = scale;
    this.display.width = SCREEN_W * scale;
    this.display.height = SCREEN_H * scale;
    this.display.style.width = `${(SCREEN_W * scale) / dpr}px`;
    this.display.style.height = `${(SCREEN_H * scale) / dpr}px`;
    this.ctx2d = null;
    this.gl = null;
    this.crtInitFailed = false;
  }

  /** Present the buffer to the display canvas. */
  present(dt: number): void {
    this.time += dt;
    if (this.crt && !this.crtInitFailed) {
      if (!this.gl) this.initGL();
      if (this.gl) {
        this.presentGL();
        return;
      }
    }
    if (!this.ctx2d) {
      // A canvas that was used for WebGL cannot switch back; recreate it.
      if (this.gl !== null || this.display.getContext('2d') === null) this.recreateDisplay();
      this.ctx2d = this.display.getContext('2d')!;
    }
    const c = this.ctx2d;
    c.imageSmoothingEnabled = false;
    c.drawImage(this.buffer, 0, 0, this.display.width, this.display.height);
    if (this.crt) {
      // 2D fallback scanlines
      c.fillStyle = 'rgba(0,0,0,0.25)';
      const s = this.scale;
      for (let y = 0; y < this.display.height; y += s * 2) c.fillRect(0, y + s, this.display.width, Math.max(1, s / 2));
    }
  }

  private recreateDisplay(): void {
    const old = this.display;
    const fresh = old.cloneNode(false) as HTMLCanvasElement;
    old.replaceWith(fresh);
    (this as { display: HTMLCanvasElement }).display = fresh;
    this.gl = null;
    this.ctx2d = null;
  }

  private initGL(): void {
    if (this.ctx2d) this.recreateDisplay();
    const gl = this.display.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) {
      this.crtInitFailed = true;
      return;
    }
    const vs = `attribute vec2 p; varying vec2 uv; void main(){ uv = p*0.5+0.5; uv.y = 1.0-uv.y; gl_Position = vec4(p,0.0,1.0);}`;
    const fs = `precision mediump float; varying vec2 uv; uniform sampler2D tex; uniform float curv; uniform float scan; uniform float time;
      void main(){
        vec2 c = uv*2.0-1.0;
        vec2 off = c.yx*c.yx*c*curv;
        vec2 q = (c+off)*0.5+0.5;
        if (q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0){ gl_FragColor = vec4(0.0,0.0,0.0,1.0); return; }
        vec3 col = texture2D(tex,q).rgb;
        float line = sin(q.y*${SCREEN_H}.0*3.14159*2.0)*0.5+0.5;
        col *= 1.0 - scan*line*0.45;
        float vig = 1.0 - 0.35*dot(c*0.7,c*0.7);
        col *= vig;
        col += 0.015*sin(time*60.0+q.y*300.0);
        gl_FragColor = vec4(col,1.0);
      }`;
    const sh = (t: number, src: string) => {
      const s = gl.createShader(t)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    try {
      const prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.uCurv = gl.getUniformLocation(prog, 'curv');
      this.uScan = gl.getUniformLocation(prog, 'scan');
      this.uTime = gl.getUniformLocation(prog, 'time');
      this.glProg = prog;
      this.glTex = tex;
      this.gl = gl;
    } catch (e) {
      console.warn('CRT shader unavailable', e);
      this.crtInitFailed = true;
      this.recreateDisplay();
    }
  }

  private presentGL(): void {
    const gl = this.gl!;
    gl.viewport(0, 0, this.display.width, this.display.height);
    gl.useProgram(this.glProg);
    gl.bindTexture(gl.TEXTURE_2D, this.glTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.buffer);
    gl.uniform1f(this.uCurv, 0.06);
    gl.uniform1f(this.uScan, 1.0);
    gl.uniform1f(this.uTime, this.time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /* --- drawing helpers into the logical buffer --- */

  clear(colour: string): void {
    this.ctx.fillStyle = colour;
    this.ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  rect(x: number, y: number, w: number, h: number, colour: string): void {
    this.ctx.fillStyle = colour;
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  sprite(s: Sprite, pal: SpritePalette, x: number, y: number, flip = false): void {
    this.ctx.drawImage(this.atlas.get(s, pal, flip), Math.round(x), Math.round(y));
  }

  /** Draw text with the bitmap font. Colour is any CSS colour. */
  text(str: string, x: number, y: number, colour = '#fcfcfc'): void {
    let cx = Math.round(x);
    const cy = Math.round(y);
    for (const ch of str) {
      if (ch !== ' ') this.ctx.drawImage(this.glyphCanvas(ch, colour), cx, cy);
      cx += FONT_W;
    }
  }

  textCentered(str: string, y: number, colour = '#fcfcfc', cx = SCREEN_W / 2): void {
    this.text(str, cx - (str.length * FONT_W) / 2, y, colour);
  }

  private glyphCanvas(ch: string, colour: string): HTMLCanvasElement {
    const key = ch + colour;
    let c = this.fontCache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = FONT_W;
    c.height = 8;
    const g = c.getContext('2d')!;
    g.fillStyle = colour;
    const rows = glyph(ch);
    for (let y = 0; y < rows.length; y++)
      for (let x = 0; x < rows[y].length; x++) if (rows[y][x] === '#') g.fillRect(x + 1, y, 1, 1);
    this.fontCache.set(key, c);
    return c;
  }
}
