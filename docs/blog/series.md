# Hungovercoders blog series outline (#50)

Working title: *Building Squad of the Damned in public*.

1. **Four colours and a slingshot** — why NES constraints (256×240, 4-colour sprites, 2 buttons) make design easier, not harder. Show the palette-check script failing on a 5-colour sprite.
2. **One body, four shapes** — the squad as a single entity that wears a kid. Shared HP pool, swap freeze-frame, and the "won't fit" rule when Bruno would be inside a vent.
3. **A fixed timestep is the whole trick** — 60 Hz sim with render interpolation; why the phone and the desktop feel identical. Includes the accumulator clamp story.
4. **Tiled, but from strings** — authoring levels as segments of string rows, exporting to real Tiled JSON, and testing that the exported file is what the game loads.
5. **Knowledge as progression** — the manual-page gate. One function (`weaknessMultiplier`) that every boss hit goes through, and the test that proves silver does nothing until you have read about it.
6. **State machines for bosses** — phases by HP fraction, telegraphs, vulnerability windows, and writing the Wolfman in forty lines.
7. **A tracker on Web Audio** — pulse duty via PeriodicWave, LFSR noise, look-ahead scheduling, and the SFX channel budget that ducks the music.
8. **He just wanted a friend** — the Giant's redemption twist and carrying a boss into the finale as an ally.
9. **Death heatmaps in localStorage** — the F3 overlay and what it changed in Night 1.
10. **Shipping: Tauri, itch, and a GIF encoder in 100 lines** — the LZW encoder behind F9.

## Trailer GIF
Press **F9** in game to start recording the 256×240 buffer at 30 fps (up to 10 s); press it again to download a looping GIF. Suggested shot list:
- Title → press start (2 s)
- Night 3: swap to Casey, silver the Wolfman in his daze (4 s)
- Night 1: Pip through the vent, page popup (3 s)
- Portal closing (2 s)

Stitch with `ffmpeg -i a.gif -i b.gif -filter_complex concat=n=2 out.gif` or upload the clips as-is.
