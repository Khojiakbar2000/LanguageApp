# Panda tutor Rive-ready source

`panda_rig.svg` is a **real editable vector SVG**, not a raster character sheet. Its named SVG groups separate head, ears, eyes, patches, cheeks, nose, mouth, torso, arms, legs, backpack and headphones.

## Rive workflow
1. Import `panda_rig.svg` into Rive Editor. Check that the importer preserves the named groups; if it flattens them, import each component separately from the SVG using a vector editor.
2. Create transform hierarchy: root -> body, legs, backpack; body -> arms, head; head -> ears, eyes, cheeks, nose, mouth. Headphones are attached to body or head according to the intended movement.
3. Set pivots approximately: head (400, 460), left arm (277, 506), right arm (524, 507), left leg (335, 700), right leg (465, 700). SVG coordinates are in 800x900 canvas space.
4. Build a state machine with `idle`, `listening`, `thinking`, `speaking`, `happy`, `encouraging`. Animate mouth shape for speaking, eyes for blinking, and arm/head transforms for reactions.
5. Export `.riv` from Rive Editor; SVG alone is NOT a `.riv` file and has no animations/state machine.

This is an original simplified rig inspired by the previously generated panda reference, not an exact tracing. If you need expressive mouth phonemes, add vector mouth variations inside Rive.
