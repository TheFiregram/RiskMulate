import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { installLegacyBuildingWallUpgrade } from './buildingWalls.js';
import { installNavigationBridge } from './navigation-bridge.js';
import { installWallSurfaceSwap } from './wallSurfaceSwap.js';
import { installContinuitySimulation } from './continuity-simulation.js';

installNavigationBridge(THREE);
installLegacyBuildingWallUpgrade(THREE);
installWallSurfaceSwap(THREE);
installContinuitySimulation();
await import('./game.js');
