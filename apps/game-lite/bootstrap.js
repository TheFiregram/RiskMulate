import * as THREE from 'three';
import { installLegacyBuildingWallUpgrade } from './buildingWalls.js';
import { installContinuitySimulation } from './continuity-simulation.js';
import { installFirstPersonGloveAssets } from './first-person-glove-assets.js';
import { installFirstPersonHands } from './first-person-hands.js';
import { installForegroundVesselDetail } from './foreground-vessel-detail.js';
import { installIndustrialAudio } from './industrial-audio.js';
import { installMobileAuthoredDetailLite } from './mobile-authored-detail-lite.js';
import { getMobilePerformanceProfile } from './mobile-performance.js';
import { installNavigationBridge } from './navigation-bridge.js';
import { installOverheadProcessBridgeDetail } from './overhead-process-bridge-detail.js';
import { installPerformanceDiagnostics } from './performance-diagnostics.js';
import { installRapierPlayerController } from './player-rapier-controller.js';
import { installProductionFlangePack } from './production-flange-pack.js';
import { installProductionRuntime } from './production-runtime.js';
import { installSidePipeRackDetail } from './side-pipe-rack-detail.js';
import { installTabletHeldViewmodel } from './tablet-held-viewmodel.js';
import { installUtilityStackDetail } from './utility-stack-detail.js';
import { installWallSurfaceSwap } from './wallSurfaceSwap.js';

const { mobileLite, coarsePointer } = getMobilePerformanceProfile();

installNavigationBridge(THREE);
installLegacyBuildingWallUpgrade(THREE);
installWallSurfaceSwap(THREE);
installContinuitySimulation();
installProductionRuntime(THREE);
installProductionFlangePack(THREE);
installPerformanceDiagnostics(THREE);

if (mobileLite) {
  // Phones keep the low-cost instanced facility layer, then add shared-geometry
  // vessel/stack silhouettes without the unique desktop geometries or shadows.
  installMobileAuthoredDetailLite(THREE);
} else {
  installForegroundVesselDetail(THREE);
  installOverheadProcessBridgeDetail(THREE);
  installSidePipeRackDetail(THREE);
  installUtilityStackDetail(THREE);
}

installFirstPersonHands(THREE);
installFirstPersonGloveAssets(THREE);
installIndustrialAudio();
installTabletHeldViewmodel();
const playerPhysics = installRapierPlayerController(THREE);

// game.js still uses `(pointer: coarse)` as its renderer/mobile-control switch.
// For narrow or low-memory devices that report a fine pointer, expose a coarse
// result only during module initialization so they receive the same low-cost
// antialiasing, DPR and shadow settings as the rest of the mobile-lite path.
const nativeMatchMedia = globalThis.matchMedia;
if (mobileLite && !coarsePointer && typeof nativeMatchMedia === 'function') {
  globalThis.matchMedia = (query) => {
    const result = nativeMatchMedia.call(globalThis, query);
    if (query !== '(pointer: coarse)') return result;
    return new Proxy(result, {
      get(target, property) {
        if (property === 'matches') return true;
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };
}

try {
  await import('./game.js');
} finally {
  if (nativeMatchMedia) globalThis.matchMedia = nativeMatchMedia;
}

playerPhysics.finishCapture();
