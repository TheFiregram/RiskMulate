import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const studioDir = resolve(scriptDir, '..');
const gameDir = resolve(studioDir, '../game-lite');
const distDir = resolve(studioDir, 'dist');

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });
cpSync(gameDir, distDir, { recursive: true });

console.log(`RiskMulate game copied from ${gameDir} to ${distDir}`);
