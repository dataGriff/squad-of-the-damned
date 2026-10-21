# Night 2 — The Old Graveyard

**Theme** graveyard · **Boss** The Stitched Giant · **Song** `night2` · **Required** Casey, Bruno

## Beats
1. Lychgate, lamp. Zombie hands pop out of the turf when you get close — jump over them, or stand back and shoot.
2. Ladder up the mausoleum wall (`LADDER_WALL`), bats on the far side.
3. Lamp. **Cracked wall** (`CRACKED`): five tiles of fractured stone. Only Bruno's punch breaks it.
4. More hands. **Crate ledge** (`CRATE_LEDGE`): push the crate to the wall and climb to the Giant's page.
5. Spike pit, lamp, silver cache, final hands field, arena under the big oak.

## Gimmick
Bruno's turn: two Bruno-shaped obstacles in a row. The crate is also the first physics object, so players learn he pushes by walking into it.

## Boss: The Stitched Giant
Slow. Walks at you, winds up (0.8 s telegraph) and throws a boulder on an arc; phase 2 throws two and walks faster. Three lanterns hang in the arena. A pebble knocks one down; it burns for four seconds where it lands. If he walks into the fire **and his page is known**, he burns: stands still, vulnerable, taking a tick of fire damage every half second, then stumbles away. Lanterns rehang after six seconds.

### The redemption twist (#24)
He does not die. At zero HP he sits down and the text "...he just wanted a friend." plays. `giantAlly` is saved and he appears next to the portal in the finale, holding it shut while the kids work the seals.

## Pages
- *The Stitched Giant* — on the crate ledge (requires Bruno).
- *Zombie Hands* — floating over the last hands field.
