# Kestrel Valley trees

Generator: [EZ-Tree 1.1.0](https://github.com/dgreenheck/ez-tree), MIT, Daniel Greenheck. Trees are generated offline. The generator is absent from the game bundle.

Style: temperate conifers, mostly pine and spruce-form conifers with a few bare birches and occasional oak. EZ-Tree has no botanical spruce preset; its pine preset is adapted with lower branches and narrower limbs.

## Reproduce

From `apps/factory-shift/tools/trees`:

```sh
npm install
npm run generate
```

Set `CHROME_BIN` to an existing Chrome executable to skip browser download. `TREE_PORT` defaults to 45479. Restricted Linux environments can use Chrome Headless Shell with `TREE_BROWSER_SINGLE_PROCESS=1`. No Blender installation is needed.

`generate-browser.mjs` contains every override. `presets.json` records the complete settings, seed and original triangle count of each exported model. Seeds start at 642, increase by 137 per species and add 17 for the young age. Mature trees are 9.4 metres tall, spruce 10.6; young trees are 7 metres, spruce 8.2. Pine and spruce use one branching level, birch and oak two. Birch leaf meshes are explicitly removed: EZ-Tree adds terminal leaves with a zero leaf count.

The young age uses fewer branch sections, radial segments and needle clusters. It serves as the mid-ring LOD and the phone near-ring LOD. Bark colour, normal and roughness maps and leaf textures come from the MIT-licensed EZ-Tree npm distribution. The full copyright notice is retained in `EZ-TREE-LICENSE.txt`.

`generate.mjs` exports GLB, then uses glTF Transform 4.5.1 to deduplicate and quantize geometry, resize maps to a maximum of 1024 pixels and compress maps to WebP with Sharp 0.35.5. Leaves use MASK, cutoff 0.5 and double-sided shading. No Draco or Meshopt decoder is required. Every GLB is checked against 4 MB.

The 1024-square `treeline-atlas.png` is baked from the mature generated trees under the yard hemisphere and sun colours. Four 512-square cells hold pine, spruce, birch and oak. Far cross-quads select cells with a per-instance attribute.

## Runtime

`app/trees.ts` owns loading, seeded placement, tint, vertex wind, sun depth materials and disposal. Rings contain 16 near trees, 48 mid trees and 240 far impostors. Each leafy species uses two near meshes and two mid meshes. Bare birch uses one per ring. One shared far mesh keeps each species within five colour-pass submissions. Sun shadow passes are reported separately in complete scene counters.

Only near trees cast and receive shadows. Mid and far trees use the scene fog and existing HDR environment. Double-sided leaves raise indirect back-face light by 16 percent. Height-weighted trunk bend and faster leaf flutter share the existing elapsed time. Sun depth materials use identical wind; instance matrices stay fixed. Culling bounds include wind movement.

Quantized positions and normals become float attributes before glTF node transforms are baked, preventing integer coordinate clamping. The old full-group rotation is removed. Coarse pointers load young GLBs in both rings. Software WebGL loads only the far atlas. The DOM mountain fallback remains unchanged.

## Capture and measure

```sh
node capture.mjs before desktop
node capture.mjs after desktop
node capture.mjs before mobile
node capture.mjs after mobile
node capture.mjs before software
node capture.mjs after software
node capture.mjs after fallback
```

The baseline defaults to commit `5c86b8fa2ce6e38be302372a104c5f9f36ab8c65`; override with `BASELINE_REF`. The script builds the actual standalone entry in a temporary directory. Instrumentation and render-path overrides affect only that temporary bundle. It waits for imported models and tree assets, then captures title, yard, west and east views at 1600 by 900. Pixel ratios are desktop 1.4, phone 1.1 and software 0.78.

Each view records `renderer.info.render` over the complete scene, composer and shadow passes. Four GPU-finish render samples are saved; the first is excluded from the warm median. The verification environment uses SwiftShader with desktop and phone paths forced. These checks establish geometry, shader and fallback behaviour, not physical laptop or phone frame rates. Device-specific hardware profiling remains necessary.

On localhost, scene counters, CPU submission time, pixel ratio and tree geometry budget print every ten seconds. CPU submission time is distinct from GPU frame time. See `docs/trees/README.md` for results and comparisons.

## Release

Commit and push `public/models/trees` first. Verify those files on jsDelivr, set `VERCEL_ASSET_CDN` in `app/factory-scene.tsx` to the full asset commit SHA and push the runtime change. The existing main workflow builds standalone files and updates the game-lite release pointer. Assets and code use separate pins. No workflow path change is needed.
