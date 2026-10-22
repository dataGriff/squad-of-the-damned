/** Pickups, projectiles, props and UI sprites. */
import { anim, defineSprite, type AnimDef, type Sprite } from '../../engine/sprites';
import { cycleList, pal } from '../palette';
import { BAYER4, PixelArt } from '../../engine/pixelart';

const S = defineSprite;

export const PAGE_PAL = pal('darkBrown', 'cream', 'tan');
export const PAGE: AnimDef = anim(
  [
    S('page_0', ['.1111111111.', '.1222222221.', '.1233332221.', '.1222222221.', '.1233333321.', '.1222222221.', '.1233332221.', '.1222222221.', '.1233333321.', '.1222222221.', '.1111111111.', '............']),
    S('page_1', ['............', '.1111111111.', '.1222222221.', '.1233332221.', '.1222222221.', '.1233333321.', '.1222222221.', '.1233332221.', '.1222222221.', '.1233333321.', '.1222222221.', '.1111111111.']),
  ],
  3,
);

export const LAMP_PAL = pal('black', 'moon', 'grey');
/** Victorian streetlamp checkpoint (16×32): unlit glass is dark, lit glass glows. */
function streetlamp(lit: boolean): Sprite {
  const p = new PixelArt(16, 32);
  // lantern cage
  p.tri(3, 4, 8, 0, 13, 4, 3);
  p.rect(7, 0, 2, 1, 3);
  p.rect(4, 4, 8, 7, 1);
  p.rect(5, 5, 6, 5, lit ? 2 : 1);
  p.vline(8, 5, 5, 1);
  if (lit) p.set(6, 6, 3);
  p.rect(3, 11, 10, 1, 3);
  p.rect(5, 12, 6, 1, 1);
  // scrolled arms
  p.set(3, 12, 3).set(2, 13, 3).set(12, 12, 3).set(13, 13, 3);
  // post with collars
  p.rect(7, 13, 2, 16, 3);
  p.vline(8, 13, 16, 1);
  p.rect(6, 18, 4, 1, 3).rect(6, 24, 4, 1, 3);
  // base
  p.rect(5, 28, 6, 2, 3).rect(4, 30, 8, 2, 3);
  p.hline(4, 31, 8, 1).vline(10, 28, 2, 1);
  return p.toSprite(lit ? 'lamp_on' : 'lamp_off');
}
export const LAMP_OFF: Sprite = streetlamp(false);
export const LAMP_ON: Sprite = streetlamp(true);
/** Dithered pool of lamplight (drawn under a lit lamp, no alpha blending). */
export const LAMP_GLOW: Sprite = (() => {
  const p = new PixelArt(48, 40);
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 48; x++) {
      const k = Math.hypot((x - 24) / 24, (y - 8) / 32);
      if (k > 1) continue;
      const th = (BAYER4[y & 3][x & 3] + 0.5) / 16;
      if (th < (1 - k) * 0.45) p.set(x, y, 1);
    }
  return p.toSprite('lamp_glow');
})();
export const LAMP_GLOW_PAL = pal('yellow', 'yellow', 'yellow');
/** The lamp's pool of light flickers by cycling its one colour (#54). */
export const LAMP_FLICKER = cycleList(['yellow', 'yellow', 'yellow', 'amber', 'yellow', 'yellow', 'sand', 'yellow', 'yellow', 'amber']);

export const CRATE_PAL = pal('black', 'rust', 'tan');
export const CRATE: Sprite = S('crate', [
  '1111111111111111', '1322222222222231', '1232222222222321', '1223222222223221', '1222322222232221', '1222232222322221', '1222223222322221', '1222222332222221', '1222222332222221', '1222223222322221', '1222232222322221', '1222322222232221', '1223222222223221', '1232222222222321', '1322222222222231', '1111111111111111',
]);

export const SILVER_PAL = pal('darkGrey', 'lightGrey', 'white');
export const SILVER: AnimDef = anim(
  [S('silver_0', ['...1111...', '..122221..', '.12233221.', '.12332221.', '.12222221.', '..122221..', '...1111...']), S('silver_1', ['...1111...', '..122221..', '.12222221.', '.12223321.', '.12233221.', '..122221..', '...1111...'])],
  4,
);

export const HEART_PAL = pal('darkBrown', 'red', 'pink');
export const HEART: Sprite = S('heart', ['.11...11.', '1231.1221', '12221222 1'.replace(' ', ''), '122222221', '.1222221.', '..12221..', '...121...', '....1....']);

export const PROJ_PAL = pal('darkGrey', 'lightGrey', 'white');
export const PEBBLE: Sprite = S('pebble', ['.11.', '1221', '1221', '.11.']);
export const SILVER_SHOT: Sprite = S('silver_shot', ['.11.', '1331', '1331', '.11.']);
export const CHARGED_SHOT: Sprite = S('charged_shot', ['.1111.', '123321', '123321', '.1111.']);
export const GARLIC_PAL = pal('darkBrown', 'cream', 'green');
export const GARLIC_BOMB: AnimDef = anim(
  [S('garlic_0', ['...3....', '..13....', '.12221..', '12222221', '12222221', '12222221', '.122221.', '..1111..']), S('garlic_1', ['....3...', '...31...', '.12221..', '12222221', '12222221', '12222221', '.122221.', '..1111..'])],
  6,
);
export const STUN_CLOUD: AnimDef = anim(
  [
    S('cloud_0', ['....2222....', '..22222222..', '.2222222222.', '222222222222', '222222222222', '.2222222222.', '..22222222..', '....2222....']),
    S('cloud_1', ['..22....22..', '.2222..2222.', '222222222222', '.2222222222.', '.2222222222.', '222222222222', '.2222..2222.', '..22....22..']),
  ],
  8,
);

export const LANTERN_PAL = pal('darkGrey', 'tan', 'moon');
export const LANTERN: AnimDef = anim(
  [S('lantern_0', ['...11...', '...11...', '.111111.', '.133331.', '.133331.', '.133331.', '.122221.', '..1111..']), S('lantern_1', ['...11...', '...11...', '.111111.', '.133331.', '.132231.', '.133331.', '.122221.', '..1111..'])],
  4,
);
export const FIRE_PAL = pal('darkRed', 'orange', 'yellow');
export const FIRE: AnimDef = anim(
  [S('fire_0', ['...1....', '..13.1..', '.1322.1.', '.123331.', '12333321', '12233221', '.122221.', '..1111..']), S('fire_1', ['....1...', '.1.31...', '.1.2231.', '.133321.', '12333321', '12233221', '.122221.', '..1111..'])],
  10,
);

export const VALVE_PAL = pal('darkGrey', 'red', 'lightGrey');
export const VALVE: Sprite = S('valve', ['....1111....', '...122221...', '..12213221..', '..12111221..', '.1221111221.', '.1221111221.', '..12111221..', '..12213221..', '...122221...', '....1111....', '.....33.....', '.....33.....']);
export const WATER_PAL = pal('navy', 'skyBlue', 'iceBlue');
export const SPRAY: AnimDef = anim(
  [S('spray_0', ['.3.2.3.2', '2.3.2.3.', '.2.3.2.3', '3.2.3.2.', '.3.2.3.2', '2.3.2.3.', '.2.3.2.3', '3.2.3.2.']), S('spray_1', ['2.3.2.3.', '.3.2.3.2', '3.2.3.2.', '.2.3.2.3', '2.3.2.3.', '.3.2.3.2', '3.2.3.2.', '.2.3.2.3'])],
  12,
);

export const SLUICE_PAL = pal('darkGrey', 'grey', 'lightGrey');
export const SLUICE: Sprite = S('sluice', [
  '1111111111111111', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '1222222222222221', '1222222222222221', '1111111111111111',
]);
export const SLUICE_BROKEN: Sprite = S('sluice_broken', SLUICE.px.length ? ['1111111111111111', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '1222222222222221', '1213121312131221', '12222222222222.1', '121312131213...1', '12222222222....1', '1213121312.....1', '122222222......1', '12131213.......1', '1222222........1', '121312.........1', '12222..........1', '1213...........1', '122............1', '12.............1', '1..............1', '1..............1', '1..............1', '1..............1', '1..............1', '1..............1', '1..............1', '1..............1', '1..............1', '1..............1', '1..............1', '1..............1', '1111111111111111'] : []);

export const SEAL_PAL = pal('darkGrey', 'purple', 'violet');
export const SEAL_OFF: Sprite = S('seal_off', ['....1111....', '..11222211..', '.1222222221.', '.1222112221.', '122211112221', '122211112221', '122211112221', '122211112221', '.1222112221.', '.1222222221.', '..11222211..', '....1111....']);
export const SEAL_ON: Sprite = S('seal_on', SEAL_OFF.px.length ? ['....1111....', '..11333311..', '.1333333331.', '.1333223331.', '133322223331', '133322223331', '133322223331', '133322223331', '.1333223331.', '.1333333331.', '..11333311..', '....1111....'] : []);

export const PORTAL_PAL = pal('navy', 'purple', 'violet');
export const PORTAL: AnimDef = anim(
  [
    S('portal_0', Array.from({ length: 48 }, (_, y) => Array.from({ length: 32 }, (_, x) => {
      const dx = (x - 15.5) / 14, dy = (y - 23.5) / 22; const r = dx * dx + dy * dy;
      return r > 1 ? '.' : r > 0.8 ? '1' : (Math.floor((Math.atan2(dy, dx) * 3 + r * 10)) % 2 === 0 ? '2' : '3');
    }).join(''))),
    S('portal_1', Array.from({ length: 48 }, (_, y) => Array.from({ length: 32 }, (_, x) => {
      const dx = (x - 15.5) / 14, dy = (y - 23.5) / 22; const r = dx * dx + dy * dy;
      return r > 1 ? '.' : r > 0.8 ? '1' : (Math.floor((Math.atan2(dy, dx) * 3 + r * 10 + 1)) % 2 === 0 ? '2' : '3');
    }).join(''))),
  ],
  6,
);

export const DOOR_PAL = pal('black', 'brown', 'tan');
/** Arched oak door with iron straps and a ring knocker. */
export const EXIT: Sprite = (() => {
  const p = new PixelArt(16, 32);
  p.rect(0, 6, 16, 26, 1);
  p.ellipse(8, 7, 8, 7, 1);
  p.rect(1, 7, 14, 25, 2);
  p.ellipse(8, 8, 7, 6, 2);
  for (const x of [4, 8, 12]) p.vline(x, 3, 29, 1);
  for (const y of [9, 24]) p.rect(1, y, 14, 2, 1).hline(1, y, 14, 3);
  p.circle(11, 17, 1.6, 3);
  p.set(11, 17, 2);
  p.vline(2, 4, 28, 3);
  return p.toSprite('exit');
})();

export const BOULDER_PAL = pal('black', 'grey', 'lightGrey');
export const BOULDER: Sprite = S('boulder', ['..111111..', '.12222221.', '1223222221', '1222222221', '1222222321', '1222222221', '1322222221', '1222222221', '.12222221.', '..111111..']);
export const BANDAGE_PAL = pal('darkBrown', 'tan', 'cream');
export const BANDAGE: Sprite = S('bandage', ['1111', '2332', '3223', '1111']);
export const BUBBLE_PAL = pal('drainBlue', 'skyBlue', 'iceBlue');
export const BUBBLE: Sprite = S('bubble', ['.11.', '1321', '1221', '.11.']);
