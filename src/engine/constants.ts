/** Logical screen and tile constants. Everything is drawn into a 256×240 buffer. */
export const SCREEN_W = 256;
export const SCREEN_H = 240;
export const TILE = 16;
export const SIM_HZ = 60;
export const DT = 1 / SIM_HZ;
/** Visible tile rows; levels are at least this tall. */
export const ROWS = SCREEN_H / TILE;
export const COLS = SCREEN_W / TILE;
