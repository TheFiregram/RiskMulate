import * as THREE from 'three';
import { installLegacyBuildingWallUpgrade } from './buildingWalls.js';
import { installContinuitySimulation } from './continuity-simulation.js';
import { installFirstPersonHands } from './first-person-hands.js';
import { installNavigationBridge } from './navigation-bridge.js';
import { installProductionRuntime } from './production-runtime.js';
import { installWallSurfaceSwap } from './wallSurfaceSwap.js';

installNavigationBridge(THREE);
installLegacyBuildingWallUpgrade(THREE);
installWallSurfaceSwap(THREE);
installContinuitySimulation();
installProductionRuntime(THREE);
installFirstPersonHands(THREE);
await import('./game.js');
