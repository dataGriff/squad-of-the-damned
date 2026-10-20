/**
 * Save / continue (#7): versioned localStorage schema with migrations.
 * The store is injectable so tests run against a Map.
 */
import type { Bindings } from './input';

export interface Options {
  musicVolume: number;
  sfxVolume: number;
  crt: boolean;
  holdToJump: boolean;
  reducedFlash: boolean;
  touchControls: 'auto' | 'on' | 'off';
}

export interface SaveData {
  version: number;
  nightsCleared: number[];
  pages: string[];
  kidsUnlocked: string[];
  /** Last checkpoint reached per night: index of lamp object. */
  checkpoints: Record<string, number>;
  silver: number;
  options: Options;
  bindings?: Bindings;
  deaths: { night: string; x: number; y: number }[];
  giantAlly: boolean;
  gameComplete: boolean;
}

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'squad-of-the-damned';

export const DEFAULT_OPTIONS: Options = {
  musicVolume: 0.6,
  sfxVolume: 0.8,
  crt: false,
  holdToJump: false,
  reducedFlash: false,
  touchControls: 'auto',
};

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    nightsCleared: [],
    pages: [],
    kidsUnlocked: ['sling', 'garlic', 'big', 'little'],
    checkpoints: {},
    silver: 5,
    options: { ...DEFAULT_OPTIONS },
    deaths: [],
    giantAlly: false,
    gameComplete: false,
  };
}

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

/** Migrate older saves forward. Each step bumps `version` by one. */
export function migrate(raw: unknown): SaveData {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  let data = raw as Partial<SaveData> & { version?: number };
  let v = data.version ?? 1;
  if (v < 2) {
    // v1 had no deaths / giantAlly / gameComplete
    data = { ...data, deaths: [], giantAlly: false, gameComplete: false };
    v = 2;
  }
  return {
    ...base,
    ...data,
    version: SAVE_VERSION,
    options: { ...base.options, ...(data.options ?? {}) },
    nightsCleared: [...new Set(data.nightsCleared ?? [])],
    pages: [...new Set(data.pages ?? [])],
  };
}

export class SaveStore {
  data: SaveData;
  constructor(private kv: KV | null = typeof localStorage !== 'undefined' ? localStorage : null, private key = SAVE_KEY) {
    this.data = this.load();
  }
  load(): SaveData {
    try {
      const raw = this.kv?.getItem(this.key);
      return migrate(raw ? JSON.parse(raw) : null);
    } catch {
      return defaultSave();
    }
  }
  save(): void {
    try {
      this.kv?.setItem(this.key, JSON.stringify(this.data));
    } catch {
      /* storage full or unavailable */
    }
  }
  reset(): void {
    this.data = defaultSave();
    this.kv?.removeItem(this.key);
  }
  clearNight(id: number): void {
    if (!this.data.nightsCleared.includes(id)) this.data.nightsCleared.push(id);
    this.save();
  }
  addPage(id: string): boolean {
    if (this.data.pages.includes(id)) return false;
    this.data.pages.push(id);
    this.save();
    return true;
  }
  hasPage(id: string): boolean {
    return this.data.pages.includes(id);
  }
  recordDeath(night: string, x: number, y: number): void {
    this.data.deaths.push({ night, x: Math.round(x), y: Math.round(y) });
    if (this.data.deaths.length > 2000) this.data.deaths.splice(0, this.data.deaths.length - 2000);
    this.save();
  }
}
