/**
 * The living style guide (#65): the palette, colour tokens, text styles,
 * layout grid, UI components and every registered sprite, drawn with the
 * game's own renderer, tokens and kit so it cannot drift from the game.
 * Served at /styleguide.html; `npm run styleguide:shot` captures it.
 */
import './styleguide.css';
import { Renderer } from './engine/render';
import { SCREEN_H, SCREEN_W } from './engine/constants';
import { DEFAULT_BINDINGS, type Action, type Device } from './engine/input';
import type { Sprite } from './engine/sprites';
import { MASTER_PALETTE, type SpritePalette } from './game/palette';
import { TOKENS, hex, type Token } from './game/design/tokens';
import { STYLES, write, type StyleName } from './game/design/type';
import { GRID, SAFE } from './game/design/layout';
import { TEXT_USES, readableResults, sceneryResults, spriteResults, textResults, READABLE_SHARE, WARN_SHARE } from './game/design/readability';
import { artRegistry, type ArtCategory, type ArtEntry } from './game/art/registry';
import { KID_SHEETS } from './game/art/kids';
import { BOSS_ANIMS } from './game/art/monsters';
import { panel, PANEL_STYLES, type PanelVariant } from './game/ui/panel';
import { Menu } from './game/ui/menu';
import { Dialog } from './game/ui/dialog';
import { prompt } from './game/ui/prompt';
import { HUD_H } from './game/hud';
import type { AnimDef } from './engine/sprites';

const main = document.getElementById('guide')!;
for (const [token, name] of Object.entries(TOKENS)) document.documentElement.style.setProperty(`--${token}`, MASTER_PALETTE[name]);

// one off-screen renderer draws every sample, which is then copied out at 3×
const host = document.createElement('div');
host.style.display = 'none';
document.body.appendChild(host);
const r = new Renderer(host);

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.append(...children);
  return e;
}

/** Draw into the top-left w×h of the buffer and return it as a canvas scaled `scale` times. */
function sample(w: number, h: number, scale: number, draw: () => void): HTMLCanvasElement {
  r.rect(0, 0, w, h, 'screen');
  draw();
  const c = el('canvas', { width: String(w * scale), height: String(h * scale) });
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(r.buffer, 0, 0, w, h, 0, 0, w * scale, h * scale);
  return c;
}

function spriteCanvas(s: Sprite, p: SpritePalette, scale: number): HTMLCanvasElement {
  const c = el('canvas', { width: String(s.w), height: String(s.h), title: s.name });
  c.getContext('2d')!.drawImage(r.atlas.get(s, p), 0, 0);
  c.style.width = `${s.w * scale}px`;
  c.style.height = `${s.h * scale}px`;
  return c;
}

function palChip(p: SpritePalette): HTMLElement {
  return el('span', { class: 'pal', title: p.slice(1).join(' ') }, ...p.map((c) => {
    const s = el('span');
    if (c) s.style.background = c;
    return s;
  }));
}

function section(id: string, title: string, intro: string): HTMLElement {
  const s = el('section', { id });
  s.append(el('h2', {}, title), el('p', {}, intro));
  main.append(s);
  return s;
}

/* --- header ---------------------------------------------------------- */

main.append(
  el('h1', {}, 'Squad of the Damned: style guide'),
  el('p', {}, 'The rules of the look, drawn by the game itself. Read the art bible in docs/design/art-bible.md for how to work within them.'),
  el('nav', {}, ...['palette', 'tokens', 'type', 'layout', 'components', 'readability', 'art'].map((id) => el('a', { href: `#${id}` }, id))),
);

/* --- palette ------------------------------------------------------------ */

{
  const s = section('palette', 'Master palette', `${Object.keys(MASTER_PALETTE).length} entries of the NES 2C02 palette. Every pixel on screen is one of these; sprites pick three plus transparent.`);
  s.append(el('div', { class: 'grid' }, ...Object.entries(MASTER_PALETTE).map(([name, c]) => {
    const chip = el('div', { class: 'chip' });
    chip.style.background = c;
    return el('div', { class: 'swatch' }, chip, el('small', {}, name), el('small', {}, c));
  })));
}

/* --- tokens ------------------------------------------------------------- */

{
  const s = section('tokens', 'Colour tokens', 'Interface code asks for a role, never a colour (src/game/design/tokens.ts). A test fails on any raw hex outside the palette.');
  s.append(el('div', { class: 'grid' }, ...(Object.keys(TOKENS) as Token[]).map((t) => {
    const chip = el('div', { class: 'chip' });
    chip.style.background = hex(t);
    return el('div', { class: 'swatch' }, chip, el('small', {}, t), el('small', {}, `→ ${TOKENS[t]}`));
  })));
}

/* --- type --------------------------------------------------------------- */

{
  const s = section('type', 'Text styles', 'Named styles over three faces (src/game/design/type.ts): the thin 5×7 font, the bold 7×7 display face and the outlined big face. Shown at 3× on the first surface each is used on.');
  for (const name of Object.keys(STYLES) as StyleName[]) {
    const st = STYLES[name];
    const on = TEXT_USES[name].on[0];
    const text = st.face === 'big3' ? 'DAMNED' : st.face === 'big2' ? 'SQUAD OF' : 'THE QUICK BROWN FOX 0123';
    const h = st.face === 'big3' ? 26 : st.face === 'big2' ? 18 : 12;
    const w = 220;
    s.append(el('div', { class: 'row' }, el('span', { class: 'name' }, name), sample(w, h, 3, () => {
      r.rect(0, 0, w, h, on);
      write(r, name, text, 4, 2);
    }), el('small', {}, `${st.face} · ${st.colour} on ${TEXT_USES[name].on.join(', ')}`)));
  }
}

/* --- layout ------------------------------------------------------------- */

{
  const s = section('layout', 'Layout grid and safe area', `An ${GRID}px grid. Everything the player reads sits inside the title-safe area (${SAFE.w}×${SAFE.h} at ${SAFE.x},${SAFE.y}), clear of TV overscan; capture mode fails any shot that draws text outside it. The HUD bar is ${HUD_H}px.`);
  s.append(sample(SCREEN_W, SCREEN_H, 2, () => {
    r.rect(0, 0, SCREEN_W, SCREEN_H, 'screen');
    for (let x = 0; x < SCREEN_W; x += GRID) r.rect(x, 0, 1, SCREEN_H, 'edge');
    for (let y = 0; y < SCREEN_H; y += GRID) r.rect(0, y, SCREEN_W, 1, 'edge');
    r.dither(0, 0, SCREEN_W, HUD_H, 'navy');
    r.rect(SAFE.x, SAFE.y, SAFE.w, 1, 'accent');
    r.rect(SAFE.x, SAFE.y + SAFE.h - 1, SAFE.w, 1, 'accent');
    r.rect(SAFE.x, SAFE.y, 1, SAFE.h, 'accent');
    r.rect(SAFE.x + SAFE.w - 1, SAFE.y, 1, SAFE.h, 'accent');
    write(r, 'label', 'HUD BAR', SAFE.x + 4, SAFE.y + 4);
    write(r, 'heading', 'TITLE-SAFE AREA', SCREEN_W / 2, 112, { align: 'center' });
    write(r, 'hint', `${SAFE.w} X ${SAFE.h}`, SCREEN_W / 2, 126, { align: 'center' });
  }));
}

/* --- components ----------------------------------------------------------- */

{
  const s = section('components', 'UI components', 'Panels, menus, dialogs and button prompts (src/game/ui/). Prompts follow the device the player last used.');
  s.append(el('h3', {}, 'Panels'));
  s.append(el('div', { class: 'grid' }, ...(Object.keys(PANEL_STYLES) as PanelVariant[]).map((v) =>
    el('div', {}, sample(96, 40, 2, () => {
      const inner = panel(r, { x: 0, y: 0, w: 96, h: 40 }, v);
      write(r, v === 'paper' ? 'paperHeading' : 'heading', v.toUpperCase(), inner.x, inner.y);
    })),
  )));
  s.append(el('h3', {}, 'Menu: values, a disabled row, the cursor'));
  const menu = new Menu([{ label: 'MUSIC', value: '●●●●●○○○○○' }, { label: 'CRT FILTER', value: 'OFF' }, { label: 'LOCKED', disabled: true }, { label: 'BACK' }], () => {});
  s.append(sample(232, 64, 2, () => {
    const inner = panel(r, { x: 0, y: 0, w: 232, h: 64 }, 'dialog');
    menu.draw(r, inner.x, inner.y, { valueX: 120, dim: 'textSoft' });
  }));
  s.append(el('h3', {}, 'Dialog: sized to its message, centred in the safe area'));
  const dialog = new Dialog('ERASE SAVE AND START OVER?', ['NO', 'YES'], () => {});
  const d = dialog.layout().panel;
  s.append(sample(d.w, d.h, 2, () => {
    r.ctx.save();
    r.ctx.translate(-d.x, -d.y);
    dialog.draw(r);
    r.ctx.restore();
  }));
  s.append(el('h3', {}, 'Button prompts by device'));
  const actions: [Action, string][] = [['jump', 'JUMP'], ['action', 'SHOOT'], ['pause', 'SKIP'], ['swap', 'SWAP']];
  for (const device of ['keyboard', 'gamepad', 'touch'] as Device[])
    s.append(el('div', { class: 'row' }, el('span', { class: 'name' }, device), ...actions.map(([a, label]) => sample(96, 14, 2, () => prompt(r, { device, bindings: DEFAULT_BINDINGS }, a, label, 4, 4)))));
}

/* --- readability ------------------------------------------------------------ */

{
  const s = section('readability', 'Readability', `From npm run check:readability (src/game/design/readability.ts). Gameplay sprites must stand out from at least ${READABLE_SHARE * 100}% of each night's background; under ${WARN_SHARE * 100}% is a warning.`);
  const text = textResults();
  s.append(el('h3', {}, 'Text contrast'), el('table', {}, el('tr', {}, el('th', {}, 'what'), el('th', {}, 'on'), el('th', {}, 'ratio'), el('th', {}, 'needs')), ...text.map((t) => el('tr', {}, el('td', {}, t.what), el('td', {}, t.on), el('td', { class: t.ratio < t.min ? 'fail' : '' }, `${t.ratio.toFixed(2)}:1`), el('td', {}, `${t.min}:1`)))));
  const sprites = spriteResults();
  const rows = readableResults(sprites).sort((a, b) => a.readable - b.readable);
  s.append(el('h3', {}, 'Gameplay sprites by night (weakest first)'), el('table', {}, el('tr', {}, el('th', {}, 'sprite'), el('th', {}, 'night'), el('th', {}, 'stands out from'), el('th', {}, 'lost on')), ...rows.map((x) => el('tr', {}, el('td', {}, x.entry), el('td', {}, x.theme), el('td', { class: x.readable < WARN_SHARE ? 'fail' : '' }, `${Math.round(x.readable * 100)}%`), el('td', {}, ...x.lostOn.map((c) => palChip([null, c, c, c])))))));
  s.append(el('h3', {}, 'Backdrop busyness (strongest internal edge, must stay under 3:1)'), el('table', {}, ...sceneryResults(sprites).map((x) => el('tr', {}, el('td', {}, x.theme), el('td', {}, `${x.backdrop.toFixed(2)}:1`)))));
}

/* --- art ------------------------------------------------------------------- */

const ANIMATED: Record<string, Record<string, AnimDef>> = {
  ...Object.fromEntries(Object.entries(KID_SHEETS).map(([id, sheet]) => [`kid:${id}`, sheet.anims])),
  ...Object.fromEntries(Object.entries(BOSS_ANIMS).map(([id, anims]) => [`boss:${id}`, anims])),
};
const players: { c: HTMLCanvasElement; a: AnimDef; p: SpritePalette }[] = [];

function entryBlock(e: ArtEntry): HTMLElement {
  const box = el('div', { class: 'entry', 'data-entry': e.id });
  box.append(el('header', {}, el('b', {}, e.id), el('span', {}, `${e.sprites.length} sprite${e.sprites.length === 1 ? '' : 's'} · `, ...e.palettes.slice(0, 12).map(palChip), e.palettes.length > 12 ? `+${e.palettes.length - 12}` : '')));
  const sprites = el('div', { class: 'sprites' });
  const p = e.palettes[0];
  const anims = ANIMATED[e.id];
  if (anims)
    for (const [name, a] of Object.entries(anims)) {
      const f = a.frames[0];
      const c = spriteCanvas(f, p, 3);
      players.push({ c, a, p });
      sprites.append(el('span', { class: 'anim' }, c, el('small', {}, name)));
    }
  else for (const s of e.sprites) sprites.append(spriteCanvas(s, p, e.sprites.length > 40 ? 1 : 2));
  box.append(sprites);
  return box;
}

{
  const entries = artRegistry();
  const s = section('art', 'Art registry', `All ${new Set(entries.flatMap((e) => e.sprites.map((x) => x.name))).size} sprites in ${entries.length} entries (src/game/art/registry.ts), shown in their first palette with every palette they are drawn in. Kids and bosses play each animation.`);
  const byCat = new Map<ArtCategory, ArtEntry[]>();
  for (const e of entries) (byCat.get(e.category) ?? byCat.set(e.category, []).get(e.category)!).push(e);
  for (const [cat, list] of byCat) {
    s.append(el('h3', {}, `${cat} (${list.length})`));
    for (const e of list) s.append(entryBlock(e));
  }
  document.body.dataset.entries = String(document.querySelectorAll('[data-entry]').length);
}

// play the animations, each at its own speed
const start = performance.now();
function tick(now: number): void {
  // the first frame's timestamp can predate `start`
  const t = Math.max(0, now - start) / 1000;
  for (const { c, a, p } of players) {
    const f = a.frames[Math.floor(t * a.fps) % a.frames.length];
    const g = c.getContext('2d')!;
    if (c.width !== f.w || c.height !== f.h) {
      c.width = f.w;
      c.height = f.h;
      c.style.width = `${f.w * 3}px`;
      c.style.height = `${f.h * 3}px`;
    }
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(r.atlas.get(f, p), 0, 0);
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
document.body.dataset.ready = 'true';
