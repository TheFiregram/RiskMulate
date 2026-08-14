# RiskMulate production assets

This directory is the browser game's canonical 3D asset boundary.

## Current slots

- `process-tanks.glb` — desktop/high-quality tank cluster.
- `process-tanks-mobile.glb` — reduced geometry/material variant.
- `pipe-rack.glb` / `pipe-rack-mobile.glb`.
- `process-buildings.glb` / `process-buildings-mobile.glb`.
- `electrical-area.glb` / `electrical-area-mobile.glb`.

The loader in `production-assets.js` keeps procedural geometry visible when an asset is missing or fails to load. A successfully loaded asset can hide only the fallback objects named in `asset-manifest.js`.

## Coordinate contract

- Units: metres.
- Up axis: +Y.
- Forward convention: -Z.
- World origin: existing Northbridge facility origin.
- Apply object scale before export; runtime scale should normally remain `1,1,1`.
- Keep origins meaningful for doors, valves, levers and future animation pivots.

## Material contract

Use metallic/roughness PBR materials. Prefer:

- base colour
- normal
- roughness
- metallic when required
- ambient occlusion
- emissive only for actual powered indicators/lights

Texture targets:

- hero/desktop: 1K–2K per major asset set
- ordinary props: 512–1K
- mobile: half the desktop texture resolution where the visual loss is acceptable

KTX2/Basis textures, Draco geometry and Meshopt-compressed glTF are supported by the runtime.

## Geometry contract

Use real silhouette detail where it matters at first-person distance. Bake small scratches, weld variation, grime and surface wear into textures rather than adding hundreds of tiny meshes.

Desktop assets should include sensible LOD variants when a module will be visible across a large distance. Mobile variants should reduce draw calls, material count and geometry before reducing important gameplay silhouettes.

## Gameplay separation

Visual GLBs do not own risk state. Risk IDs, evidence, scoring, treatment and ISO 31000/COSO logic remain in the scenario/runtime modules. Collision and interaction proxies should stay simple and stable when the visual mesh changes.
