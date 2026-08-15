import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const studioDir = resolve(scriptDir, '..');
const repoDir = resolve(studioDir, '../..');
const gameDir = resolve(studioDir, '../game-lite');
const distDir = resolve(studioDir, 'dist');
const threeDir = resolve(repoDir, 'node_modules/three');
const threeVendorDir = resolve(distDir, 'vendor/three');
const rapierDir = resolve(repoDir, 'node_modules/@dimforge/rapier3d-compat');
const rapierVendorDir = resolve(distDir, 'vendor/rapier');

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });
cpSync(gameDir, distDir, { recursive: true });

mkdirSync(threeVendorDir, { recursive: true });
cpSync(resolve(threeDir, 'build/three.module.js'), resolve(threeVendorDir, 'three.module.js'));
cpSync(resolve(threeDir, 'examples/jsm'), resolve(threeVendorDir, 'addons'), { recursive: true });

mkdirSync(rapierVendorDir, { recursive: true });
cpSync(resolve(rapierDir, 'rapier.mjs'), resolve(rapierVendorDir, 'rapier.mjs'));

const indexPath = resolve(distDir, 'index.html');
const gamePath = resolve(distDir, 'game.js');
const cdnThree = 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
const cdnAddons = 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/';
const coarsePointerProbe = "const coarsePointer = matchMedia('(pointer: coarse)').matches;";
const mobileLiteProbe = "const coarsePointer = Boolean(globalThis.RiskMulateMobilePerformance?.mobileLite ?? matchMedia('(pointer: coarse)').matches);";

writeFileSync(
  indexPath,
  readFileSync(indexPath, 'utf8')
    .replace(cdnThree, './vendor/three/three.module.js')
    .replace(cdnAddons, './vendor/three/addons/'),
);
writeFileSync(
  gamePath,
  readFileSync(gamePath, 'utf8')
    .replace(`'${cdnThree}'`, `'three'`)
    .replace(coarsePointerProbe, mobileLiteProbe),
);

console.log(`RiskMulate game copied from ${gameDir} to ${distDir}`);
console.log('Three.js, addons, and Rapier bundled into the production output.');
console.log('Production renderer uses the shared mobile-lite profile.');
