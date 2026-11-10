# Phase 3 — Panda pose and expression SVG assets

Four **editable SVGs**, derived from `panda_rig_v2.svg` (800×800 viewBox). These are **pose references and vector layers**, not completed Rive rigs or animations.

- `16_panda_sitting_idle.svg` — base seated character with named parts.
- `17_panda_reaching.svg` — right arm reaches for cup.
- `18_panda_drinking.svg` — raised arm, detachable `coffee_cup_held` group, closed eyes.
- `19_panda_expressions.svg` — head-only expression artwork; toggle `mouth_neutral`, `mouth_speaking`, `mouth_happy`, and `eyes_closed` with SVG `display` attributes.

## Integration

1. Keep the original `panda_rig_v2.svg` and existing `.riv` files as backups.
2. Import **one** character hierarchy into Rive, not four separate characters. The pose SVGs show target positions.
3. Create pivots/bones for head, arms, and ears; use existing `data-pivot` metadata as guides (Rive may not import custom attributes).
4. Animate `arm_right` toward the cup, then switch the visible cup from the table to the hand, keeping the position continuous. The cup artwork in this pack is a smaller illustrative cup; for pixel-perfect continuity, reuse the Phase 2 cup geometry and scale/transform it to match.
5. Add idle, reach, sip, put-down, blink, and smile states; make the sip transition reversible.
6. The room uses a 1080×1920 viewBox; these panda SVGs use 800×800. Place the panda as a **nested** scene element with its own transform. Do not blindly overlay viewBoxes.
7. Codex can prepare and integrate SVG assets but a real `.riv` export requires Rive-compatible authoring tools/editor.

Colors and proportions inherit from the original layered panda SVG.
