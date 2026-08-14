# RiskMulate production 3D migration

## Target

Keep the browser/Vercel delivery and the existing risk-learning engine, but move visual production from code-built primitives to a Blender -> glTF/GLB -> Three.js pipeline.

The runtime must remain usable when a production model is missing. This lets the team replace one facility module at a time without blocking scenario development.

## Runtime layers

1. `game.js` remains the first-person scenario and interaction host.
2. `production-runtime.js` attaches rendering services without changing risk state.
3. `production-assets.js` loads production glTF assets and swaps tagged visual fallbacks after successful load.
4. `asset-manifest.js` is the single list of production asset slots and desktop/mobile variants.
5. `environment-lighting.js` supplies a PMREM reflection environment for metallic/roughness PBR materials.
6. `adaptive-performance.js` changes render scale conservatively from measured frame time.

## Asset replacement order

### Slice A — process area

- process tanks
- organized pipe rack and supports
- valves/flanges/nozzles
- floor decals, stains and drainage detail

### Slice B — utility/electrical area

- electrical cabinets
- conduit and cable trays
- service-yard props
- emergency response station

### Slice C — player viewmodel

- rigged glove + sleeves
- inspect animation
- tablet draw/holster animation
- interaction poses

### Slice D — facility shell

- process buildings
- perimeter structures
- background industrial modules
- distant LOD meshes

## Performance rules

- Keep collision proxies separate from render meshes.
- Reuse materials across repeated industrial props.
- Use instancing for repeated bolts, rails, grates and supports when they are built at runtime.
- Prefer baked normal/roughness/AO detail to tiny geometry that does not affect silhouette.
- Ship a reduced mobile GLB for costly modules.
- Use KTX2/Basis for large texture sets and Meshopt or Draco where the asset benefits from it.
- Avoid one giant facility GLB. Facility modules must be independently replaceable and loadable.

## Educational boundary

Visual fidelity must not change the risk model. Each scenario still follows the full risk process:

context -> identify -> analyze/assess -> evaluate -> treat -> monitor & review.

Risk statements keep explicit cause -> event -> consequence chains. Likelihood and impact remain separate. Inherent and residual risk remain distinct. Treatments remain connected to the causal mechanism and objectives.

Production asset swaps may change what a student sees, but evidence IDs and risk IDs stay stable unless scenario content is deliberately revised.

## Physics migration

The current simple collision volumes remain the safe fallback during visual replacement. The next movement-layer migration should introduce Rapier behind a small adapter rather than letting gameplay code depend directly on a physics library. Static collider meshes can use the `COLLIDER_` Blender naming convention and remain much simpler than visible models.

## Definition of done for each migrated module

- production GLB exists in desktop form
- reduced mobile variant exists when the desktop asset is expensive
- scale and pivot match the existing scenario coordinates
- procedural fallback stays valid
- collision proxy still matches the walkable space
- material response is credible under the shared PBR environment
- risk interaction target remains reachable
- mobile and desktop frame budgets remain acceptable
