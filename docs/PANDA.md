# Dori V2: original panda

The authoritative source is `public/mascot/panda_rive_v2_assets/panda_rig_v2.svg`, not a flattened image. The reference PNG is visual guidance, and the pack describes the SVG as a vector approximation rather than an exact raster trace. Original earlier assets in `src/panda_rive_assets 2/` remain available.

The supplied SVG has 22 named groups and 38 vector shapes, including hidden speaking/happy mouths and closed eyes. The build preserves its paths, paint stops and proportions. Its white belly and original dark paws are never recolored or covered by clothing.

## Hierarchy and pivots

`panda-v2.manifest.json` records the source groups. `panda.scene.json` records the compiled editable hierarchy. The source’s recommended absolute pivots are head (400,316), ears (253,178)/(547,178), arms (321,478)/(479,478), legs (281,621)/(529,621), body (400,576), eyes (317,354)/(483,354), tail (626,631). Reparenting compensates translations to keep the neutral geometry unchanged. The 800 × 960 artboard adds framing clearance for animation.

`public/mascot/panda.riv` has `Panda` artboard/state machine, with idle, listening, speaking, thinking, happy, encouraging and celebrating triggers. Happy/celebrating move the original paws outwards so the head does not hide them. Celebrating adds vector confetti/sparkles. Separate ears move subtly; speaking uses the supplied open-mouth artwork.

The independent Accessories layer uses `accessory`: 0 headphones, 1 glasses, 2 hat, 3 none. Accessories attach to head/neck slots. `outfit_slot` remains empty for future garments. The legacy `outfit` input and stored purple/blue/pink IDs remain compatible, but V2 always renders original fur; there are no clothing shapes or recolor tracks. Default is `original` + `none`.

Web and native development/release builds use real Rive animation. Reduced motion, Expo Go and runtime-error paths in the learning Tutor use matching original-fur stills. Home instead has a complete animated native SVG fallback, documented in [COZY_ROOM.md](COZY_ROOM.md). The launch face is a separate animated extraction of the same V2 head, with a Reanimated head-tilt fallback.

## Persistence and rebuilding

Profile accessories retain guest/account ownership and pending-save synchronization. Existing profile table migrations `202611030002_panda_customization.sql` and `202611030003_panda_v2.sql` add constrained preferences and the original-fur default. Existing saved data is retained. Hosted migrations require the configured project; they have only been exercised in the temporary test database here.

```sh
npm run mascot:build
npm run room:build
```

The installed Rive MCP authors and validates real `.riv` files. No manual Rive Editor work is required for this implementation. There are no View Model/data-binding claims; the current runtimes use trigger/number state-machine inputs. Native device playback remains a device check.
