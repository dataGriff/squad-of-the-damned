import { describe, expect, it } from 'vitest';
import { Camera } from '../src/engine/camera';

describe('Camera (#5)', () => {
  it('does not scroll for movement inside the dead-zone', () => {
    const c = new Camera();
    c.bounds = { x: 0, y: 0, w: 2000, h: 240 };
    c.snapTo(500, 120, 1);
    const x0 = c.x;
    c.update(505, 120, 1, 1 / 60);
    expect(c.x).toBe(x0);
  });
  it('leads the camera in the facing direction', () => {
    const c = new Camera();
    c.bounds = { x: 0, y: 0, w: 2000, h: 240 };
    c.snapTo(500, 120, 1);
    expect(c.x + 128).toBeGreaterThan(500);
    c.snapTo(500, 120, -1);
    expect(c.x + 128).toBeLessThan(500);
  });
  it('pins to a lock zone when the target is inside it', () => {
    const c = new Camera();
    c.bounds = { x: 0, y: 0, w: 2000, h: 240 };
    c.lockZones = [{ x: 1024, y: 0, w: 256, h: 240 }];
    c.snapTo(1100, 120, 1);
    for (let i = 0; i < 120; i++) c.update(1200, 120, 1, 1 / 60);
    expect(c.x).toBe(1024);
    expect(c.isLocked).toBe(true);
  });
  it('clamps to level bounds', () => {
    const c = new Camera();
    c.bounds = { x: 0, y: 0, w: 512, h: 240 };
    c.snapTo(10, 10, -1);
    expect(c.x).toBe(0);
    c.snapTo(600, 10, 1);
    expect(c.x).toBe(256);
  });
  it('reduced-motion disables shake offsets', () => {
    const c = new Camera();
    c.reducedMotion = true;
    c.shake(5, 1);
    c.update(0, 0, 1, 1 / 60);
    expect(c.shakeX).toBe(0);
  });
});
