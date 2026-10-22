/** HUD icons (#58): hearts, lives, a pocket watch, pad buttons (#62) and the boss skull. */
import { defineSprite } from '../../engine/sprites';
import { pal } from '../palette';

export const HEART_FULL = defineSprite('icon_heart_full', ['.11.11.', '1231221', '1222221', '1222221', '.12221.', '..121..', '...1...']);
export const HEART_EMPTY = defineSprite('icon_heart_empty', ['.11.11.', '1..1..1', '1.....1', '1.....1', '.1...1.', '..1.1..', '...1...']);
export const HEART_PAL = pal('black', 'red', 'pink');
export const HEART_EMPTY_PAL = pal('grey', 'grey', 'grey');

/** Lives: a kid's head in Casey's red cap. */
export const LIFE = defineSprite('icon_life', ['..111..', '.12221.', '1222221', '1333331', '1313131', '.13331.', '..111..']);
export const LIFE_PAL = pal('black', 'red', 'cream');

export const CLOCK = defineSprite('icon_clock', ['..11...', '.1331..', '133133.', '133113.', '133333.', '.1331..', '..11...']);
export const CLOCK_PAL = pal('black', 'tan', 'cream');

export const BUTTON_A = defineSprite('icon_button_a', ['..111..', '.12321.', '1232321', '1233321', '1232321', '.12221.', '..111..']);
export const BUTTON_B = defineSprite('icon_button_b', ['..111..', '.12221.', '1233221', '1232321', '1233221', '.12221.', '..111..']);
export const BUTTON_PAL = pal('black', 'red', 'white');

/** START/SELECT: the grey pill buttons in the middle of the pad. */
export const BUTTON_PILL = defineSprite('icon_button_pill', ['.111111111.', '12222222221', '12333333321', '12222222221', '.111111111.']);
export const PILL_PAL = pal('black', 'grey', 'lightGrey');

export const SKULL = defineSprite('icon_skull', ['.11111.', '1333331', '3113113', '3113113', '1333331', '.13131.', '.11111.']);
export const SKULL_PAL = pal('black', 'black', 'lightGrey');
