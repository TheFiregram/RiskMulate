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

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });
cpSync(gameDir, distDir, { recursive: true });

mkdirSync(threeVendorDir, { recursive: true });
cpSync(resolve(threeDir, 'build/three.module.js'), resolve(threeVendorDir, 'three.module.js'));
cpSync(resolve(threeDir, 'examples/jsm'), resolve(threeVendorDir, 'addons'), { recursive: true });

const indexPath = resolve(distDir, 'index.html');
const gamePath = resolve(distDir, 'game.js');
const cdnThree = 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
const cdnAddons = 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/';

writeFileSync(
  indexPath,
  readFileSync(indexPath, 'utf8')
    .replace(cdnThree, './vendor/three/three.module.js')
    .replace(cdnAddons, './vendor/three/addons/'),
);
writeFileSync(gamePath, readFileSync(gamePath, 'utf8').replace(`'${cdnThree}'`, `'three'`));

console.log(`RiskMulate game copied from ${gameDir} to ${distDir}`);
console.log('Three.js and addons bundled into the production output.');
