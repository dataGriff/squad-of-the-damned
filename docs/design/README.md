# Level design docs (#29)

One document per night. Each covers the beats, the night's gimmick, which kids
are required (and why that holds mechanically), the boss, and where the manual
pages are. The `requiredKids` list in `src/game/levels/nights.ts` must agree
with these docs; `test/levels.test.ts` checks the map actually enforces it.

| Night | Theme | Boss | Required kids |
|---|---|---|---|
| [1 — The House on Elm St](night1.md) | mansion | The Count | Mo (garlic), Pip (vent) |
| [2 — The Old Graveyard](night2.md) | graveyard | The Stitched Giant | Casey (lanterns), Bruno (cracked wall, crate) |
| [3 — Full Moon over Maple Drive](night3.md) | suburb | The Wolfman | Casey (silver), Pip (vent), Bruno (crate) |
| [4 — Under the Museum](night4.md) | sewer | The Mummy | Casey (valves), Bruno (cracked wall), Pip (vent) |
| [5 — The Storm Drain](night5.md) | storm drain | The Gill Creature | Bruno (sluice, cracked wall), Pip (vent) |
| [Midnight — The Portal](finale.md) | graveyard | — | all four |

## Shared rules

- **Screen** 256×240, 16px tiles, every night is one screen tall and 17–18 screens wide.
- **Checkpoints** are streetlamps. Touching one lights it, refills the shared HP and saves silver.
- **Lives** three per night; losing them all offers *Continue* from the last lamp.
- **Pages** the boss's own page is always on the main path, behind the night's gating obstacle. Field-note pages (bats, hands, frogs, rats) live in secret rooms reached through a vent.
- **Arena** 16 tiles wide, camera locked, side walls seal when the boss wakes and open when it falls. The exit door opens only once `bossActive` is null.
- **Knowledge gating** a boss takes damage from its weakness only after its page is collected (#36). Without the page the fight is survivable but unwinnable — the HUD shows a grey bar and the hits spark off, which is the cue to go find the page.

## Segment vocabulary

Nights are assembled from `src/game/levels/segments.ts`:

| Segment | Teaches / requires |
|---|---|
| `STEPS` | one-way platforms, jump-through, drop-through (down + jump) |
| `LADDER_WALL` | ladders, climbing off the top |
| `CRAWL` | crouch and crawl under a 1-tile ceiling |
| `VENT_PAGE` | **Pip**: only a small body passes vent tiles |
| `CRACKED` | **Bruno**: punch through a 5-tile cracked wall |
| `CRATE_LEDGE` | **Bruno**: push the crate to climb a 3-tile wall (Pip can double-jump it) |
| `HIGH_SILVER` | bonus silver, crate or double jump |
| `SECRET_ROOM` | hidden room above two vents, platforms up to it |
| `GAP_SPIKES` / `GAP_WATER` | running jumps; water slows you |
| `FLAT_*` | enemy introductions (rats, bats, hands, frogs) |
