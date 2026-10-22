# Squad of the Damned

8-bit platformer. A squad of four kids versus the classic public-domain monsters, one night per monster, ending at a graveyard portal that has to be closed before midnight.

- **Stack:** Vite / TypeScript / Vitest, Canvas 2D (+ optional WebGL CRT pass), Web Audio, Tauri for desktop
- **Constraints:** 256×240 logical screen, 16px tiles, 4 colours per sprite, 2-button controls

## Play

```
npm install
npm run dev        # http://localhost:5173
```

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Move | Arrows / WASD | D-pad / left stick | d-pad |
| Jump | Z / Space / K | A | A |
| Ability | X / J / Shift | X | B |
| Swap kid | C / L / Tab | B / RB | SW |
| Pause / menu | Enter / Esc / P | Start | ‖ |
| Fire silver | Up + ability (Casey) | | |
| Charged shot | hold ability (Casey) | | |
| Drop through platform | Down + jump | | |

Keys are remappable in Options. Dev keys: **F3** death heatmap, **F9** start/stop GIF recording.

## The squad

| Kid | Ability |
|---|---|
| **Casey** | Slingshot. Pebbles are infinite; silver shot is limited and the only thing that hurts the Wolfman. Hold to charge. |
| **Mo** | Garlic bombs on an arc; the cloud stuns everything in it. |
| **Bruno** | Pushes crates, punches through cracked walls, breaks the sluice gate. |
| **Pip** | Fits through vents, double jumps. |

The squad shares one HP pool. Swapping is instant with a freeze-frame and flash, and is refused if the new kid would not fit where you are standing.

## Art

Everything is drawn into a 256×240 buffer under NES rules: 16px tiles, every sprite at most 4 colours (transparent + 3) from a master palette of genuine 2C02 entries, no alpha blending.

- **Characters** (`src/game/art/kids.ts`, `monsters.ts`, `items.ts`): hand-placed pixels plus shape helpers, with rim lighting so dark silhouettes read on dark backgrounds.
- **Auto-tiles** (`src/game/art/autotiles.ts`): solid tiles pick a surface lip, corners and edge shading from their neighbours, plus one of four fill variants. Platforms, ladders, spikes, vents and water have per-theme versions.
- **Parallax backdrops** (`src/game/art/backdrops.ts`): dithered skies, a moon and halo, and 3–6 depth layers per theme, generated with the `PixelArt` helper (`src/engine/pixelart.ts`: Bayer dithering, shapes, outlines, seamless wrapping).
- **Effects without alpha**: checkerboard dither for flashes and lamplight, flicker for boss deaths, and an NES-style palette-step fade (`src/engine/fade.ts`) on scene changes and respawns.

`npm run check:palette` covers all 1,668 generated and hand-drawn sprites, in every palette they are drawn in.

![Before and after the art pass](docs/screenshots/art-pass-before-after.png)

### Art pass 2

- **Animated kids** (`src/game/art/kids.ts`): each kid is a rig (head plus posed limbs) with 8-frame idle and run cycles, jump/apex/fall/land, crawl, climb and hurt, plus per-kid moves (Casey aims, Pip flips, Bruno punches). Big and Little are drawn at their own scale.
- **Boss animation** (`src/game/bosses/`): every attack has a wind-up frame, hits get a reaction pose, and each boss has its own defeat scene: the Count bursts into bats, the Giant sits down, the Wolfman turns back into a man.
- **Palette cycling and lightning** (`src/game/palette.ts`, `src/game/backdrop.ts`): water, flames and lamps cycle colours. Storm nights flash to a strike palette and then thunder, with a reduced-flash option.
- **Set dressing** (`src/game/art/props.ts`, `src/game/dressing.ts`): seeded props (mailboxes, headstones, suits of armour, barrels, traffic cones) behind the play area, and foreground silhouettes in front of it.
- **Landmarks** (`src/game/art/landmarks.ts`): a hand-drawn skyline piece per night, such as the Grey house, the church, the water tower, the museum and the mansion staircase.
- **Story screens** (`src/game/story.ts`): typewriter panels before and after each night, and STORY SO FAR in the hub.
- **Polish**: sprite particles instead of single pixels, a bold display font for headings, and a framed HUD with icons.

![Art pass 2](docs/screenshots/art-pass-2.png)

![The squad](docs/screenshots/kids.png)

### Design framework

The rules behind the look are code, and checks enforce them. The [art bible](docs/design/art-bible.md) explains how to work within them. The style guide (`/styleguide.html` in `npm run dev`) shows them, drawn by the game itself.

- **Colour tokens** (`src/game/design/tokens.ts`): the interface asks for roles (`text`, `accent`, `dialog`, `ink`…) and never for hex values.
- **Type** (`type.ts`): named text styles, measuring, wrapping and glyph coverage.
- **Layout** (`layout.ts`): an 8px grid and the NES title-safe area. Every string the player reads stays inside it.
- **UI kit** (`src/game/ui/`): panel, menu, dialog, and button prompts that follow the device in use.
- **Art registry** (`src/game/art/registry.ts`): every sprite, with every palette it is drawn in. The palette, colour-blind and readability checks read it.
- **Readability** (`readability.ts`): text against its surfaces, gameplay sprites against each night, and backdrops kept quieter than gameplay.
- **Visual regression** (`src/capture.ts`, `test/visual/`): a deterministic capture mode and 19 golden screenshots, compared pixel for pixel.

Captures: [style guide](docs/screenshots/styleguide.png), [art registry](docs/screenshots/styleguide-art.png).

## Knowledge as progression

Every boss has a weakness, but it only does damage once that monster's page of the **Monster Manual** has been found. Pages hide behind vents and cracked walls; field-note pages live in secret rooms. Read the manual from the pause menu.

## Scripts

| Command | What |
|---|---|
| `npm test` | Vitest: engine, squad rules, boss machine, save migration, palette constraint, level gating |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check:palette` | every sprite ≤ 4 colours from the NES master palette (#37) |
| `npm run check:colorblind` | gameplay, portrait and icon palettes stay distinguishable under protanopia / deuteranopia / tritanopia (#47, #63) |
| `npm run check:readability` | text contrast, gameplay sprites against each night, quiet backdrops (#64) |
| `npm run test:visual` | builds, then compares 19 golden screenshots pixel for pixel; also checks safe area, glyphs, registered palettes and the style guide (#66). `-- --update` rewrites the goldens |
| `npm run styleguide:shot` | renders the style guide to `docs/screenshots/styleguide*.png` (#65) |
| `npm run export:levels` | string-row level sources → Tiled JSON in `src/game/levels/json` (CI checks it is up to date) |
| `npm run manual:pdf` | builds `docs/manual.pdf`, the retro manual matching the in-game bestiary |
| `npm run build` | production web build in `dist/` |
| `npm run tauri build` | desktop build (needs Rust and `@tauri-apps/cli`; see `src-tauri/`) |

## Layout

```
src/engine/   loop, input, tilemap, physics, sprites, camera, render, audio, save, particles, gif, font, clock, random
src/game/     squad, player, projectiles, objects, enemies/, bosses/, manual, hud, music, scenes/, art/, levels/
src/game/design/  tokens, type, layout, vision, readability
src/game/ui/  panel, menu, dialog, prompt
src/capture.ts, src/styleguide.ts   capture mode for visual tests; the style guide page
scripts/      palette-check, colorblind-check, readability-check, styleguide-shot, export-levels, manual-pdf
test/         vitest suites; visual/ golden screenshots and their runner
docs/         design docs per night, playtest script, itch page copy, blog series outline, manual.pdf
src-tauri/    desktop shell
```

## Docs

- [Art bible](docs/design/art-bible.md): the NES rules, colour, type, layout, the UI kit, drawing and registering sprites, and the checks
- [Level design docs](docs/design/README.md) — beats, gimmick and required kids per night
- [Playtest script + telemetry](docs/playtest.md)
- [itch.io page copy](docs/itch.md)
- [Blog series outline + trailer GIF shot list](docs/blog/series.md)
