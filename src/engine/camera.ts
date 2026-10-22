import { SCREEN_H, SCREEN_W } from './constants';
import { rand } from './random';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Camera (#5): follows a target with horizontal look-ahead in the facing
 * direction, a dead-zone so small movements don't scroll, and lock zones that
 * pin the view (boss arenas). Clamped to level bounds. Also owns screen shake (#9).
 */
export class Camera {
  x = 0;
  y = 0;
  /** previous position for interpolation */
  px = 0;
  py = 0;
  lookAhead = 40;
  lookSpeed = 90; // px/s the look-ahead offset moves
  deadZoneW = 24;
  deadZoneH = 32;
  private look = 0;
  lockZones: Rect[] = [];
  bounds: Rect = { x: 0, y: 0, w: SCREEN_W, h: SCREEN_H };
  shakeTime = 0;
  shakeMag = 0;
  shakeX = 0;
  shakeY = 0;
  reducedMotion = false;
  private locked: Rect | null = null;

  snapTo(tx: number, ty: number, facing: number): void {
    this.look = facing * this.lookAhead;
    this.x = tx + this.look - SCREEN_W / 2;
    this.y = ty - SCREEN_H / 2;
    this.clamp();
    this.px = this.x;
    this.py = this.y;
  }

  /** Which lock zone (if any) contains the target point. */
  lockFor(tx: number, ty: number): Rect | null {
    for (const z of this.lockZones) if (tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h) return z;
    return null;
  }

  update(tx: number, ty: number, facing: number, dt: number): void {
    this.px = this.x;
    this.py = this.y;
    const zone = this.lockFor(tx, ty);
    if (zone) {
      this.locked = zone;
      // slide toward the lock rect
      const gx = zone.x;
      const gy = zone.y;
      this.x += (gx - this.x) * Math.min(1, dt * 8);
      this.y += (gy - this.y) * Math.min(1, dt * 8);
      if (Math.abs(gx - this.x) < 0.5) this.x = gx;
      if (Math.abs(gy - this.y) < 0.5) this.y = gy;
    } else {
      this.locked = null;
      const targetLook = facing * this.lookAhead;
      const d = targetLook - this.look;
      const step = this.lookSpeed * dt;
      this.look += Math.abs(d) <= step ? d : Math.sign(d) * step;
      const cx = this.x + SCREEN_W / 2 - this.look;
      const cy = this.y + SCREEN_H / 2;
      const hw = this.deadZoneW / 2;
      const hh = this.deadZoneH / 2;
      if (tx < cx - hw) this.x -= cx - hw - tx;
      else if (tx > cx + hw) this.x += tx - (cx + hw);
      if (ty < cy - hh) this.y -= cy - hh - ty;
      else if (ty > cy + hh) this.y += ty - (cy + hh);
      this.clamp();
    }
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const m = this.reducedMotion ? 0 : this.shakeMag;
      this.shakeX = m ? (rand() * 2 - 1) * m : 0;
      this.shakeY = m ? (rand() * 2 - 1) * m : 0;
    } else {
      this.shakeX = this.shakeY = 0;
    }
  }

  get isLocked(): boolean {
    return this.locked !== null;
  }

  shake(mag = 3, time = 0.2): void {
    this.shakeMag = Math.max(this.shakeMag * (this.shakeTime > 0 ? 1 : 0), mag);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  clamp(): void {
    const b = this.bounds;
    this.x = Math.max(b.x, Math.min(b.x + b.w - SCREEN_W, this.x));
    this.y = Math.max(b.y, Math.min(b.y + b.h - SCREEN_H, this.y));
  }

  /** Integer render offset for a given interpolation alpha. */
  offset(alpha: number): { x: number; y: number } {
    return {
      x: Math.round(this.px + (this.x - this.px) * alpha + this.shakeX),
      y: Math.round(this.py + (this.y - this.py) * alpha + this.shakeY),
    };
  }
}
