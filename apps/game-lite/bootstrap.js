import * as THREE from 'three';
import { installLegacyBuildingWallUpgrade } from './buildingWalls.js';
import { installContinuitySimulation } from './continuity-simulation.js';
import { installFirstPersonHands } from './first-person-hands.js';
import { installIndustrialAudio } from './industrial-audio.js';
import { installNavigationBridge } from './navigation-bridge.js';
import { installProductionRuntime } from './production-runtime.js';
import { installTabletHeldViewmodel } from './tablet-held-viewmodel.js';
import { installWallSurfaceSwap } from './wallSurfaceSwap.js';

installNavigationBridge(THREE);
installLegacyBuildingWallUpgrade(THREE);
installWallSurfaceSwap(THREE);
installContinuitySimulation();
installProductionRuntime(THREE);
installFirstPersonHands(THREE);
installIndustrialAudio();
installTabletHeldViewmodel();
await import('./game.js');
