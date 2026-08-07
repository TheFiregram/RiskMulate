import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { installLegacyBuildingWallUpgrade } from './buildingWalls.js';
import { installWallSurfaceSwap } from './wallSurfaceSwap.js';

installLegacyBuildingWallUpgrade(THREE);
installWallSurfaceSwap(THREE);
await import('./game.js');
