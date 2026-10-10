import {readFile, writeFile, readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import sharp from 'sharp';

const output=fileURLToPath(new URL('../../docs/trees/',import.meta.url));
const files=await readdir(output);
for(const file of files.filter(name=>name.endsWith('.png'))){
  await sharp(join(output,file)).webp({quality:90}).toFile(join(output,file.replace(/\.png$/,'.webp')));
}
const records=[];
for(const phase of ['before','after'])for(const mode of ['desktop','mobile','software']){
  const name=`${phase}-${mode}.json`;
  if(!files.includes(name))continue;
  const data=JSON.parse(await readFile(join(output,name),'utf8'));
  if(data.errors.length)throw new Error(`${name}: ${data.errors.join('; ')}`);
  for(const row of data.results){
    const warm=row.frames.slice(1).sort((a,b)=>a-b);
    records.push(`| ${phase} | ${mode} | ${row.view} | ${Number(row.pixelRatio.toFixed(2))} | ${row.triangles.toLocaleString('en-US')} | ${row.calls} | ${warm[Math.floor(warm.length/2)].toFixed(1)} |`);
  }
}
for(const view of ['yard','west']){
  const before=join(output,`before-desktop-${view}.webp`),after=join(output,`after-desktop-${view}.webp`);
  try{
    const left=await sharp(before).resize(1600,900).toBuffer();
    const right=await sharp(after).resize(1600,900).toBuffer();
    await sharp({create:{width:3200,height:900,channels:3,background:'#101918'}}).composite([{input:left,left:0,top:0},{input:right,left:1600,top:0}]).webp({quality:90}).toFile(join(output,`comparison-${view}.webp`));
  }catch(error){if(error.message.includes('Input file is missing'))continue;throw error;}
}
await writeFile(join(output,'README.md'),`# Tree replacement verification

Baseline: \`5c86b8fa2ce6e38be302372a104c5f9f36ab8c65\`. Tree runtime: \`101676a72bc2b0fc21e91151d766c48921449388\`.

## Geometry budget

| Path | Tree triangles | Limit | Main tree draw calls | Trees |
| --- | ---: | ---: | ---: | --- |
| Desktop | 82,060 | 150,000 | 15 | 16 near, 48 mid, 240 far |
| Coarse pointer | 49,956 | 60,000 | 15 | 16 near, 48 mid, 240 far |
| Software WebGL | 960 | 60,000 | 1 | 240 far |

Each species has at most five colour-pass submissions including the shared impostor mesh. Near trees cast and receive sun shadows. The full-scene counters below include shadow and composer passes; they are not the tree-only budget. All eight GLBs are below 0.8 MB each.

## Captures

All views use a 1600 by 900 viewport. Camera positions and targets are fixed by \`tools/trees/capture.mjs\`. Desktop uses pixel ratio 1.4; coarse pointer uses 1.1; the software path uses 0.78. Files named \`before-*\` and \`after-*\` provide title, yard, west and east views. Comparison images show before on the left and after on the right.

![Yard comparison](comparison-yard.webp)

![West treeline comparison](comparison-west.webp)

The verification machine uses Chrome Headless Shell and SwiftShader. Desktop and coarse-pointer paths are forced only in the temporary capture bundle. These tests confirm geometry budgets, shaders, loaded assets and fallback behaviour. They do not establish frame rates on a physical laptop or phone. Hardware profiling remains pending.

## Complete scene measurements

Frame time is the median of three warm renders, measured with GPU completion after one warmup render. Software rasterization and shared CPU contention can dominate these values. Raw measurements and browser errors are retained in the adjacent JSON files.

| Phase | Path | View | Pixel ratio | Scene triangles | Scene draw calls | Software frame ms |
| --- | --- | --- | ---: | ---: | ---: | ---: |
${records.join('\n')}

## Checks

Factory Shift standalone build, TypeScript, lint, artifact validation and all five rendered HTML tests passed on this revision. All captured browser error arrays are empty. All nine tree asset URLs at the pinned asset commit returned HTTP 200.

The repository-wide Quality workflow reports two unrelated failures in unchanged Studio code: three Rust Clippy \`assert_is_empty\` warnings in \`crates/studio-core/src/database.rs\`, and two ESLint \`no-unsafe-call\` errors in \`apps/studio/src/App.test.tsx\`. Those files, the Studio dependencies and its workflow were not changed. No branch protection or check configuration was changed.

## Reproduce

Install the root workspace dependencies and the dependencies in \`tools/trees\`, then run the commands in \`tools/trees/README.md\`. Run \`node tools/trees/report.mjs\` from the app directory to rebuild this report and WebP comparisons. PNG captures are intermediate files; the report stores compressed WebP copies.

The runtime and assets use the existing publish workflow. \`app/factory-scene.tsx\` pins assets to \`cdc4d9c60a24e3d1dd136bf563727c80f0001c11\`, which already contains every model and atlas. The publish workflow builds standalone code and updates the game-lite bundle pin. See the [production release record](RELEASE.md) for the live capture and observed bundle URLs.
`);
console.log(`Report contains ${records.length} scene measurements.`);
