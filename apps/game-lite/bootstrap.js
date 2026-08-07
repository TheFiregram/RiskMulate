import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { installLegacyBuildingWallUpgrade } from './buildingWalls.js';

installLegacyBuildingWallUpgrade(THREE);
await import('./game.js');
