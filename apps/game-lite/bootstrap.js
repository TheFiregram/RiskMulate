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
import { installPlantResponseEffects } from './plant-response-effects.js';
import { installFieldRepair } from './field-repair.js';
import { installMobileJoystick } from './mobile-joystick.js';
import { installRapierPlayerController } from './player-rapier-controller.js';
import { installProductionFlangePack } from './production-flange-pack.js';
import { installProductionRuntime } from './production-runtime.js';
import { installSidePipeRackDetail } from './side-pipe-rack-detail.js';
import { installTabletHeldViewmodel } from './tablet-held-viewmodel.js';
import { installUtilityStackDetail } from './utility-stack-detail.js';
import { installWallSurfaceSwap } from './wallSurfaceSwap.js';

const { mobileLite } = getMobilePerformanceProfile();

function installInputOnboarding() {
  const controls = document.querySelector('.start-controls');
  const paused = document.getElementById('paused');
  if (!controls) return;

  if (mobileLite) {
    controls.innerHTML = '<kbd>LEFT</kbd> MOVE <kbd>RIGHT</kbd> LOOK <kbd>INSPECT</kbd> EVIDENCE <kbd>FIX</kbd> CONTROL <kbd>TABLET</kbd> RISK WORK';
    if (paused) paused.textContent = 'Touch the scene to resume look control.';
    controls.setAttribute('aria-label', 'Touch controls: left side to move, right side to look, Inspect for evidence, Tablet for risk work');
    return;
  }

  controls.setAttribute('aria-label', 'Keyboard controls: WASD move, E inspect, Tab tablet, Shift sprint');
}

installInputOnboarding();
installNavigationBridge(THREE);
installLegacyBuildingWallUpgrade(THREE);
installWallSurfaceSwap(THREE);
installContinuitySimulation();
installPlantResponseEffects(THREE);
installFieldRepair();
installMobileJoystick();
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
await import('./game.js');
playerPhysics.finishCapture();
