# Art bible

How Squad of the Damned looks, and how to add to it without breaking the look. Every rule here is enforced by a check. The style guide shows the rules: run `npm run dev` and open `/styleguide.html`, or see `docs/screenshots/styleguide.png`.

| Where | What |
|---|---|
| `src/game/palette.ts` | the master palette, `pal()`, palette cycling |
| `src/game/design/tokens.ts` | colour roles for the interface |
| `src/game/design/type.ts` | text styles, measuring and wrapping |
| `src/game/design/layout.ts` | the grid and the safe area |
| `src/game/ui/` | panel, menu, dialog, button prompt |
| `src/game/art/` | sprites, and `registry.ts`, which lists them all |
| `src/game/design/vision.ts`, `readability.ts` | the colour-blind and readability rules |
| `src/capture.ts`, `test/visual/` | capture mode and the golden screenshots |

## 1. The NES rules

- **Screen**: 256×240, drawn at whole-number scales. Tiles are 16px.
- **Sprites have at most 4 colours**: index 0 is transparent, and indices 1–3 come from the master palette. By convention index 1 is the outline or darkest colour, 2 is the body, and 3 is the highlight.
- **Master palette**: 43 entries, every one a genuine 2C02 colour. Add a colour only if it is a real 2C02 entry, and give it a name.
- **No alpha.**
  - For transparency, use a 50% checkerboard: `r.dither`.
  - For death and invulnerability, flicker.
  - For fades, step every colour down the palette (`src/engine/fade.ts`).
  - For flashes, use one-colour palettes (`FLASH_PAL`).
- **Animate colour with palette cycling, not by redrawing.** `cycleList()` declares the colours (so the checks see them) and `cycled()` steps through them, as the water, lamps and the clock do.

## 2. Colour

- **Interface code uses tokens.** Ask for a role (`text`, `textDim`, `accent`, `danger`, `panel`, `dialog`, `paper`, `ink`…), not a colour. To change the look, change the token.
- **Art uses palette names.** Write `pal('black', 'violet', 'red')` and `r.rect(…, 'drainBlue')`.
- **Never write hex.** A test fails on any `#rrggbb` outside `palette.ts`, and `hex()` throws on any colour outside the master palette.
- **The two shared palettes** are `FLASH_PAL` (the hit flash) and `SILHOUETTE_PAL` (locked or unfound). `SHADOW_PAL` (black on a bright sky) also works on any sprite.

## 3. Type

| Style | Face | Use for |
|---|---|---|
| `title`, `subtitle` | big ×3, ×2 | the logo only |
| `heading` | bold | screen and panel headings |
| `alert` | bold | bad news: MIDNIGHT!, boss names |
| `display` | bold | PRESS START, HUD numbers |
| `body` | thin | running text, menu items |
| `bodySoft` | thin | secondary text, values |
| `hint` | thin | instructions |
| `caption` | thin | footers |
| `label` | thin with shadow | text over scenery |
| `paper*` | bold or thin | the manual and the page-found popup |

- Draw text with `write(r, style, text, x, y, {align})`.
- Use `paragraph()` for wrapped text. It returns the height, so paragraphs stack.
- Use `measure()` for widths. Every face is 8px per character; big text is measured by its ink.
- The thin face covers A–Z, 0–9 and `.,!?:'-/()+%"<>=#*♥♡▲▼►◄●○_`. The bold face falls back to thin for symbols. A test checks every story, manual, night and squad string against the style it is shown in.

## 4. Layout

- Use the **8px grid** for panels and spacing (`GRID`, `SPACE`).
- **The title-safe area** is `SAFE`, the screen inset 8px on every side: 240×224 at (8, 8). Old TVs cropped the edges, so everything the player reads sits inside it. Scenery can fill the screen.
- The **HUD bar** is `HUD_H` (26px). Its content row starts at the top of the safe area.
- The **last safe text line** is y 224. Footers go there.
- In-world symbols (the exit arrow, stun stars, a boss's `!`) move with the scene. They use `r.marker()` and are not held to the safe area.

## 5. Interface components

- `panel(r, rect, 'panel' | 'dialog' | 'paper')` draws the NES box and returns the content rect, inset by 8px.
- `new Menu(items, onPick, onBack)`:
  - Items can have a `value` column and can be `disabled`.
  - Set `onAdjust` for left/right on value rows.
  - On blue dialog panels, draw unselected items with `dim: 'textSoft'`.
- `new Dialog(message, choices, onPick)` sizes itself to its message and centres in the safe area. Use it for every question.
- `prompt(r, game.prompts, action, label, x, y)` shows the button for an action. That is a key cap with the bound key, the A, B or START button on a pad, or the on-screen button name on touch. Never write "PRESS Z".

## 6. Drawing sprites

- **For small, hand-placed art, use pixel strings.** `defineSprite(name, rows)`, with `.` for transparent and `1`–`3` for palette indices. Icons, decoration tiles and fodder are drawn this way.
- **For anything bigger or generated, use `PixelArt`** (`src/engine/pixelart.ts`). It has shapes, Bayer dithering, `outline()`, `rotate90()`, `stamp()` and seamless wrapping.
  - The kids are rigs: a head plus posed limbs (`kids.ts`).
  - Bosses, backdrops, props and landmarks are generated.
- **Outlines.**
  - Outline figures in index 1.
  - For figures with dark parts, `outlineOf()` outlines only the light parts, which keeps the dark parts slim.
- **Rim light.** A dark figure on a dark night gets a rim of its highlight colour on the lit side (`rim()` in `monsters.ts`). That is what makes it readable (see 8).
- **Names.** Sprite names are unique and prefixed by kind: `kid_`, `at_` (auto-tiles), `d_` (decoration), `bd_` (backdrop), `lm_` (landmark), `prop_`, `fg_`, `icon_`, `page_`…
- **Animation timings** in use:
  - kids: idle 4, run 14, fall 8, crawl and climb 8, push 6, abilities 12–16, and single-frame poses for jump, apex, land, hurt and crouch
  - bosses: 1–2 for poses, 3–8 for loops
  - bats 12, rats 10, hands and frogs 6
  - fire and spray 10–12, pickups 3–4

## 7. Registering art

Every sprite goes in the **art registry** (`src/game/art/registry.ts`), together with every palette it is drawn in. The palette, colour-blind and readability checks and the style guide all read it.

- **When you add a sprite**, add it to the right function: `kidArt`, `monsterArt`, `itemArt`, `propArt`, `sceneryArt`, `iconArt` or `effectArt`. List the palettes it is drawn in. For a cycling palette, use `cycleVariants()`.
- **Tiles and backdrops register themselves.** The registry calls `tileSprite()` and `layerPalette()` over every case, so anything they can return is already listed.
- **Two checks catch a missing sprite or palette:**
  - a test fails if an art module exports a sprite the registry lacks;
  - `npm run test:visual` fails a shot that draws a sprite in a palette not registered for it.

## 8. The checks

| Command | Enforces |
|---|---|
| `npm test` | no raw hex; tokens resolve; glyph coverage; registry coverage; layout helpers; menu, dialog and prompt behaviour; readability rules |
| `npm run check:palette` | every sprite has ≤4 colours, and every registered palette is from the master palette |
| `npm run check:colorblind` | palettes used by gameplay, portrait and icon art stay distinguishable under protanopia, deuteranopia and tritanopia (scenery is exempt: it shades with neighbouring colours on purpose) |
| `npm run check:readability` | the three readability rules below |
| `npm run test:visual` | the 19 golden screenshots match pixel for pixel; text stays in the safe area with every glyph; sprites are drawn only in registered palettes; the style guide renders every registry entry |
| `npm run styleguide:shot` | refreshes `docs/screenshots/styleguide*.png` |

**The readability rules:**
- **Text** must reach 4.5:1 against every surface it is used on. Bold display text and secondary text need 3:1. These are WCAG AA ratios.
- **Gameplay sprites** must stand out from at least half of each night's background. "Stand out" means a colour covering at least an eighth of the sprite reaches 3:1 against a colour covering at least 4% of the play area. Under three quarters is printed as a warning.
- **Backdrops** must never contain two dominant colours at 3:1, so scenery never competes with gameplay.

## 9. Changing how something looks

1. Make the change. Run `npm test` and the three `check:` scripts.
2. Run `npm run test:visual`. Every changed shot fails, and its `actual` and `diff` images are written to `test/visual/out/`.
3. Look at the diffs. If every change is intended, run `npm run test:visual -- --update` and commit the new goldens with the change.
4. If the change shows on the style guide, run `npm run styleguide:shot`.
