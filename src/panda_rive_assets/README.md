# Dori assets

The official supplied character source is [`../panda_rive_assets 2/panda_rig.svg`](<../panda_rive_assets 2/panda_rig.svg>). The original SVG in this folder is retained for provenance; the two supplied SVGs are identical. Importing the source and changing clothing colors does not replace its face, geometry or proportions.

See [`../../docs/PANDA.md`](../../docs/PANDA.md) for the full rig contract, source provenance, customization, launch screen, persistence, rebuild and verification details.

- `panda.import.json`: MCP-imported source geometry.
- `panda.scene.json`: shared animated character with independent motion/outfit/accessory layers.
- `panda-accessories.svg` and `accessories.import.json`: additional glasses and hat only.
- `looks/` and `appearances.ts`: 12 matching static fallbacks and Metro require map.
- `panda-still.png`: official sky-blue fallback.
- `panda-face.png`: launch image exported from the existing head paths.
- `../../public/mascot/panda.riv`: seven named motion states, three outfits, four accessories.
- `../../public/mascot/panda-face.riv`: animated original face for startup.

Web and native development builds retain real Rive playback. Expo Go and reduced-motion/error paths use the matching fallback. No flattened PNG or SVG is represented as an already rigged character.

`npm run mascot:build` uses the installed community Rive MCP through its public tools. The tool's own freeware license applies to the tool; generated mascot assets are unrestricted by that license. The official Rive runtime/WASM license is retained in `public/mascot/RIVE-LICENSE.txt`.
