/** HUD icons (#58): hearts, a pocket watch, the B button and the boss skull. */
import { defineSprite } from '../../engine/sprites';
import { pal } from '../palette';

export const HEART_FULL = defineSprite('icon_heart_full', ['.11.11.', '1231221', '1222221', '1222221', '.12221.', '..121..', '...1...']);
export const HEART_EMPTY = defineSprite('icon_heart_empty', ['.11.11.', '1..1..1', '1.....1', '1.....1', '.1...1.', '..1.1..', '...1...']);
export const HEART_PAL = pal('black', 'red', 'pink');
export const HEART_EMPTY_PAL = pal('grey', 'grey', 'grey');

export const CLOCK = defineSprite('icon_clock', ['..11...', '.1331..', '133133.', '133113.', '133333.', '.1331..', '..11...']);
export const CLOCK_PAL = pal('black', 'tan', 'cream');

export const BUTTON_B = defineSprite('icon_button_b', ['..111..', '.12221.', '1233221', '1232321', '1233221', '.12221.', '..111..']);
export const BUTTON_PAL = pal('black', 'red', 'white');

export const SKULL = defineSprite('icon_skull', ['.11111.', '1333331', '3113113', '3113113', '1333331', '.13131.', '.11111.']);
export const SKULL_PAL = pal('black', 'black', 'lightGrey');

export function allIconSprites() {
  return [HEART_FULL, HEART_EMPTY, CLOCK, BUTTON_B, SKULL];
}
