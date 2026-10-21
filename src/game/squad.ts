/**
 * Squad roster (#13) and swap rules (#14). Four kids, one ability each,
 * sharing a single HP pool. Pure data + logic; the Player entity consumes it.
 */
import { pal, type SpritePalette } from './palette';

export type KidId = 'sling' | 'garlic' | 'big' | 'little';
export type Ability = 'slingshot' | 'garlic' | 'strength' | 'small';

export interface Kid {
  id: KidId;
  name: string;
  ability: Ability;
  blurb: string;
  palette: SpritePalette;
  /** Standing hitbox. */
  w: number;
  h: number;
  /** Crouched height. */
  crouchH: number;
  speed: number;
  jump: number;
  doubleJump: boolean;
  small: boolean;
}

export const KIDS: Record<KidId, Kid> = {
  sling: {
    id: 'sling',
    name: 'CASEY',
    ability: 'slingshot',
    blurb: 'SLINGSHOT. HOLD B TO CHARGE. SILVER SHOT IS LIMITED.',
    palette: pal('darkBrown', 'red', 'cream'),
    w: 12,
    h: 22,
    crouchH: 14,
    speed: 95,
    jump: 275,
    doubleJump: false,
    small: false,
  },
  garlic: {
    id: 'garlic',
    name: 'MO',
    ability: 'garlic',
    blurb: 'LOBS GARLIC BOMBS. STUNS EVERYTHING NEARBY.',
    palette: pal('darkBrown', 'olive', 'cream'),
    w: 12,
    h: 22,
    crouchH: 14,
    speed: 90,
    jump: 275,
    doubleJump: false,
    small: false,
  },
  big: {
    id: 'big',
    name: 'BRUNO',
    ability: 'strength',
    blurb: 'PUSHES CRATES. PUNCHES THROUGH CRACKED WALLS.',
    palette: pal('darkBrown', 'blue', 'cream'),
    w: 14,
    h: 24,
    crouchH: 16,
    speed: 80,
    jump: 260,
    doubleJump: false,
    small: false,
  },
  little: {
    id: 'little',
    name: 'PIP',
    ability: 'small',
    blurb: 'FITS THROUGH VENTS. DOUBLE JUMP OFF BRUNO.',
    palette: pal('darkBrown', 'tan', 'cream'),
    w: 10,
    h: 14,
    crouchH: 10,
    speed: 100,
    jump: 240,
    doubleJump: true,
    small: true,
  },
};

export const KID_ORDER: KidId[] = ['sling', 'garlic', 'big', 'little'];

export const MAX_HP = 6;

export class Squad {
  hp = MAX_HP;
  maxHp = MAX_HP;
  active: KidId;
  silver: number;
  unlocked: KidId[];
  /** Ticks remaining of swap freeze-frame. */
  swapFreeze = 0;
  swapFlash = 0;

  constructor(unlocked: KidId[] = KID_ORDER, silver = 5, active?: KidId) {
    this.unlocked = KID_ORDER.filter((k) => unlocked.includes(k));
    if (!this.unlocked.length) throw new Error('Squad needs at least one kid');
    this.active = active && this.unlocked.includes(active) ? active : this.unlocked[0];
    this.silver = silver;
  }

  get kid(): Kid {
    return KIDS[this.active];
  }

  /** Swap to the next unlocked kid. Returns false if swapping is not allowed. */
  swap(dir = 1, allowed = true): boolean {
    if (!allowed || this.unlocked.length < 2 || this.swapFreeze > 0) return false;
    const i = this.unlocked.indexOf(this.active);
    this.active = this.unlocked[(i + dir + this.unlocked.length) % this.unlocked.length];
    this.swapFreeze = 6; // freeze-frame ticks
    this.swapFlash = 8;
    return true;
  }

  swapTo(id: KidId): boolean {
    if (!this.unlocked.includes(id) || id === this.active) return false;
    this.active = id;
    this.swapFreeze = 6;
    this.swapFlash = 8;
    return true;
  }

  tick(): void {
    if (this.swapFreeze > 0) this.swapFreeze--;
    if (this.swapFlash > 0) this.swapFlash--;
  }

  damage(n = 1): boolean {
    this.hp = Math.max(0, this.hp - n);
    return this.hp === 0;
  }
  heal(n = 1): void {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }
}
