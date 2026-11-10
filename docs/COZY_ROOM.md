# Dori’s cozy Korean study room

Home uses `src/features/cozy-room/CozyRoomScreen.tsx` through the existing `(tabs)/index` route. Authentication, catalog selection, active-conversation resumption, progress, review, free talk, profiles and setup gates are unchanged. The illustrated book opens the learner’s actual next lesson. There is no WebView, fabricated weather feed or simulated learning flow.

## Supplied artwork

All four phases under `public/pandaRoom/` were inspected. Phase 1 provides ten room/furniture layers; Phase 2 provides the cup, three steam trails, book, independently grouped plant leaves and clock hands. Phase 3 supplies the seated, reaching and drinking panda poses and facial expressions. `phase4/cozy_room_master.svg` supplies the 1080 × 1920 composition. Its HTML preview is CSS-based and explicitly documents a placeholder drinking motion; it is not embedded in the app.

The original V2 SVG and existing transform rig supply the actual panda geometry. Its belly stays white, paws stay their original dark fur, and proportions/paints are unchanged. No clothing overlays are compiled. Existing wardrobe IDs remain readable for compatibility; the current customization UI offers only optional accessories.

The scene uses an unstretched 1080 × 1680 coordinate system, with 100 source pixels cropped from the top and unused floor space removed. All objects fit that artboard. The table/book move slightly toward the chair; the coffee moves closer and its handle faces the panda so the arm can reach naturally. The source SVGs remain untouched. Small devices can scroll the existing Home screen; accessible hotspots have at least 44-point targets.

## Real Rive file

`public/mascot/cozy-room.riv` is a compiled, runtime-validated vector asset. Artboard `CozyRoom`, state machine `PandaStateMachine`:

- Character states: Idle, Blink, LookAround, Wave, ReachCoffee, PickUpCoffee, DrinkCoffee, PutDownCoffee, Happy, ReturnToIdle.
- Inputs: `coffee`, `wave`, `blink`, `look` triggers; `night` number (0 day, 1 night).
- Independent layers: Panda, Atmosphere, Clock, Lighting.

The learning screens continue to use `public/mascot/panda.riv`; room gestures are deliberately gentler. The room idle has irregular breathing, blink, gaze, ear and smile beats across 17.3 seconds. Rain uses sixteen staggered speeds and a window-only clip. Three steam trails have different periods. Leaves sway independently, the radial lamp glow varies gently, and clock hands rotate around the supplied 905,475 pivots at hour/minute rates. Day/night crossfades individual wall, floor and skyline paints plus lamp intensity over 900 ms; it is not a full-screen dark overlay.

## Coffee attachment and timing

There is one set of cup body/handle vectors. Its parent is `cup_carrier → armRight → torso → rig`. The saucer and shadow remain on the table. During the 0–1.6 s reach, the cup’s local transform is the inverse of the moving hand transform, which keeps the cup exactly docked. From 1.6–6.6 s the local grip offset and rotation are constant, so lifting and sipping inherit the hand’s motion. After release, inverse compensation keeps the cup on the saucer while the paw retracts. Breathing and waving also compensate so the docked cup does not drift.

The full cycle is 9.2 s, authored as continuous frame-sampled segments: reach, pickup, drink, put-down, satisfied expression, return to idle. Phase 3 supplies the arm rotation/expression reference; translations are fitted to the room’s reachable cup location. Eyes close during the sip. The right paw draws in front of the head so its grip remains visible.

`usePandaAnimation` owns the interaction lock, timeline and accessibility feedback. Repeated panda/coffee taps are safely ignored during either action. Book/window interactions remain usable. Focus/background changes pause Rive, UI-thread timelines and completion timers; cleanup removes listeners, timers and animation loops.

## React Native fallback and accessibility

Development/release builds use the existing native Rive runtime. Web uses the official Canvas runtime and locally served WASM. Expo Go lacks the native Rive module, so it uses `RoomVectorFallback`: independently transformed SVG parts driven by the same authored timelines on Reanimated’s UI thread. It is not a static panda image. A failed Rive load also uses that renderer. No additional controller or navigation system is introduced.

Reduced motion stops ambient/character movement and parallax, changes lighting immediately, and reports a greeting/coffee response accessibly. The book still opens learning. Touch parallax is limited to a few pixels and requires no sensor permission.

Only `react-native-svg` was added, using Expo’s compatible version. Room mode is local presentation state; it needs no database schema or paid service.

## Rebuild and validation

With Node 24 and installed Chrome:

```sh
npm run room:build
```

This extracts the environment from the master, imports its vectors through the installed Rive MCP, reuses the V2 hierarchy, compiles the `.riv`, generates the SVG fallback, and exercises every character state and both lighting modes. Runtime screenshots/report are written to `/tmp/haru-cozy-validation/`; public day/night PNGs are review artifacts, not the app renderer.

Unit tests check the single-cup hierarchy, exact dock position, constant grip transforms, continuity between coffee segments, original panda paints and rain clipping. Browser checks cover live canvas movement, repeated interactions, day/night, real lesson navigation, reduced motion, and the animated vector fallback. Existing onboarding and learning tests remain part of regression verification.

No native simulator/device was available in this environment. React Native exports prove bundling; actual native Rive/SVG playback, frame rate and physical-device touch behavior still require a development build. Do not describe 60 FPS as measured here.

The SVG importer reports small differences for diagonal bounding-box gradients and elliptical blush gradients; the original vector contours and source paint stops remain intact. Pixel-identical matching to the raster illustration is not claimed.
