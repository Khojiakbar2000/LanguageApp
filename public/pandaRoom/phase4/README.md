# Phase 4 — Cozy Room Assembly

- `cozy_room_master.svg` combines the original Phase 1 and 2 vector layers with the existing `panda_rig_v2.svg`. Each scene layer is named `layer_*`.
- `interactive_preview.html` is a browser-only demonstration with ambient animation and two interactions. Open locally in any browser.
- The preview uses CSS transforms, **not Rive**. Coffee movement is a rough placeholder and does not include a true arm rig or hand attachment.
- The Phase 3 pose SVGs are included under `phase3_poses/` as reference poses.
- To build `.riv`: import grouped panda SVG into Rive Editor, set bone/pivot hierarchy, rig arm and hand, bind cup to hand during sip, author idle/sip/state machine, export `.riv`, integrate via Rive React Native. Codex should not claim to have exported `.riv` unless it actually exists.
- Master scene viewBox: 1080 x 1920.
- Note: Panda uses its own 800x800 viewBox and is positioned via a nested transform.
