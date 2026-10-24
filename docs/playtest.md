# Playtest script and telemetry (#48)

## Session script (20 minutes)

1. Hand over the controls with no explanation. Watch the title: do they press start within 15 s, or does attract mode kick in?
2. In the treehouse ask them to "go out for the night". Note whether they find *Pick a night* and read the squad screen.
3. Night 1 until the vent. **Key question:** how long before they press swap? If > 60 s, note what they tried instead.
4. Let them reach the Count without the page if they skip it. Do they understand the grey HP bar and the sparks mean "not yet"?
5. After the fight (win or lose), ask: "What hurt him?" and "What did the manual say?"
6. Night 2 to the crate. Do they realise only Bruno pushes?
7. Open the pause menu. Can they find the manual and the options? Toggle CRT; does anyone turn it back off?
8. Finish with the three questions below.

### Questions
- Which kid did you like playing? Which did you never use?
- Where did you die most and did it feel fair?
- What is the Wolfman weak to? (tests whether the manual text was read)

## Telemetry

Every death is recorded in the save (`deaths: {night, x, y}[]`, capped at 2000). It never leaves the device.

- **In game:** press **F3** during a night to overlay the death heatmap for that level (yellow = some deaths, red = hot spot). Walk the level with it on after a session.
- **Export:** in the browser console run `copy(localStorage['squad-of-the-damned'])` and paste into a file; `deaths` is plain JSON.
- **Reset:** Options → Erase save.

Use the heatmap to find spike pits and arena corners that kill more than they should, then move a lamp or widen the ledge.
