# Asset credits

Poly Haven and ambientCG assets use CC0 1.0. Generated trees and their bundled textures use the EZ-Tree MIT licence.

## Poly Haven

- [Rock 09](https://polyhaven.com/a/rock_09), adapted to an optimized GLB for browser delivery.
- [Overcast Industrial Courtyard](https://polyhaven.com/a/overcast_industrial_courtyard), 1K HDR used for image-based lighting.

## ambientCG

- [Asphalt 014](https://ambientcg.com/view?id=Asphalt014), 1K color, normal, and roughness maps converted to WebP.
- [Ground 037](https://ambientcg.com/view?id=Ground037), 1K color, normal, and roughness maps converted to WebP.
- [Painted Metal 006](https://ambientcg.com/view?id=PaintedMetal006), 1K color, normal, roughness, and metalness maps converted to WebP for worn teal process pipes.
- [Painted Metal 008](https://ambientcg.com/view?id=PaintedMetal008), 1K color, normal, roughness, and metalness maps converted to WebP for worn orange process pipes.

## Meshy

- Pump, valve, and traffic-cone models supplied by the project owner and optimized for browser delivery.

## EZ-Tree

- [EZ-Tree](https://github.com/dgreenheck/ez-tree), version 1.1.0, by Daniel Greenheck, MIT licence.
- Eight generated pine, spruce-form conifer, bare birch and oak GLBs in `public/models/trees/`, with two ages per species. Bark and leaf textures come from the same MIT-licensed npm distribution.
- `treeline-atlas.png` is a transparent render of these generated trees under the yard light, baked by `tools/trees/generate-browser.mjs`.
- Source settings, seeds and reproduction commands: `tools/trees/README.md` and `tools/trees/presets.json`.
- The upstream copyright and licence notice is retained verbatim in `tools/trees/EZ-TREE-LICENSE.txt`.
