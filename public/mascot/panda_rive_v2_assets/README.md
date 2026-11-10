# Panda V2 — Rive preparation pack

- `panda_rig_v2.svg`: genuine editable vector SVG, not a PNG embedded in an SVG.
- `panda_reference.png`: latest unclothed panda illustration used as visual guidance.
- Canvas: 800 × 800, transparent background, seated front view.
- Groups with stable IDs: `tail`, `body`, `leg_left`, `leg_right`, `arm_left`, `arm_right`, `head`, ears, eyes, brows, cheeks, nose and mouth variants.
- `data-pivot` coordinates are suggested transform origins; adjust after importing to Rive.
- Mouth and closed-eye variants are hidden using `display="none"`; enable/import separately in your Rive authoring workflow.
- Vector approximation of the reference illustration, NOT a pixel-identical trace or a pre-rigged `.riv` file.
- In Rive: import the SVG, check groups remain separate, assign pivots and hierarchy, create animation timelines and state machine, export `.riv`.
- Keep all future clothing and accessory layers on the same 800×800 coordinate system.
- Preserve original source SVG; import this as a new asset version.
