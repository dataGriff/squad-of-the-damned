import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, SaveStore, migrate, type KV } from '../src/engine/save';

function mem(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

describe('Save/continue (#7)', () => {
  it('persists cleared nights, pages and kids across loads', () => {
    const kv = mem();
    const a = new SaveStore(kv);
    a.clearNight(1);
    a.addPage('wolfman');
    a.data.kidsUnlocked = ['sling', 'big'];
    a.save();
    const b = new SaveStore(kv);
    expect(b.data.nightsCleared).toEqual([1]);
    expect(b.hasPage('wolfman')).toBe(true);
    expect(b.data.kidsUnlocked).toEqual(['sling', 'big']);
  });
  it('migrates a v1 save forward', () => {
    const d = migrate({ version: 1, nightsCleared: [1, 1], pages: ['bat'], options: { crt: true } });
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.nightsCleared).toEqual([1]);
    expect(d.deaths).toEqual([]);
    expect(d.options.crt).toBe(true);
    expect(d.options.musicVolume).toBeGreaterThan(0);
  });
  it('survives garbage in storage', () => {
    const kv = mem();
    kv.setItem('squad-of-the-damned', '{not json');
    expect(new SaveStore(kv).data.nightsCleared).toEqual([]);
  });
  it('records deaths for the heatmap (#48) with a cap', () => {
    const s = new SaveStore(mem());
    for (let i = 0; i < 2100; i++) s.recordDeath('night1', i, 0);
    expect(s.data.deaths.length).toBe(2000);
  });
});
