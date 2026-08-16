import * as THREE from 'three';
import { installLegacyBuildingWallUpgrade } from './buildingWalls.js';
import { installContinuitySimulation } from './continuity-simulation.js';
import { installFirstPersonGloveAssets } from './first-person-glove-assets.js';
import { installFirstPersonHands } from './first-person-hands.js';
import { installHighVisGloves } from './high-vis-gloves.js';
import { installForegroundVesselDetail } from './foreground-vessel-detail.js';
import { installIndustrialAudio } from './industrial-audio.js';
import { installMobileAuthoredDetailLite } from './mobile-authored-detail-lite.js';
import { getMobilePerformanceProfile } from './mobile-performance.js';
import { installNavigationBridge } from './navigation-bridge.js';
import { installOverheadProcessBridgeDetail } from './overhead-process-bridge-detail.js';
import { installPerformanceDiagnostics } from './performance-diagnostics.js';
import { installPlantResponseEffects } from './plant-response-effects.js';
import { installRearGateEnvironment } from './rear-gate-environment.js';
import { installRiskMulateBillboard } from './riskmulate-billboard.js';
import { installFieldRepair } from './field-repair.js';
import { installFieldFixInteraction } from './field-fix-interaction.js';
import { installTimedRiskEvents } from './timed-risk-events.js';
import { installFlangeEscalation } from './flange-escalation.js';
import { installResidualOutcomeFeedback } from './residual-outcome-feedback.js';
import { installMobileJoystick } from './mobile-joystick.js';
import { installRapierPlayerController } from './player-rapier-controller.js';
import { installProductionFlangePack } from './production-flange-pack.js';
import { installProductionRuntime } from './production-runtime.js';
import { installSidePipeRackDetail } from './side-pipe-rack-detail.js';
import { installTabletHeldViewmodel } from './tablet-held-viewmodel.js';
import { installInputPolish } from './input-polish.js';
import { installStickZoneReset } from './stick-zone-reset.js';
import { installFocusGuidance } from './focus-guidance.js';
import { installUtilityStackDetail } from './utility-stack-detail.js';
import { installWallSurfaceSwap } from './wallSurfaceSwap.js';

const { mobileLite } = getMobilePerformanceProfile();

function installInputOnboarding() {
  const controls = document.querySelector('.start-controls');
  const paused = document.getElementById('paused');
  if (!controls) return;

  if (mobileLite) {
    controls.innerHTML = '<kbd>LEFT</kbd> MOVE <kbd>RIGHT</kbd> LOOK <kbd>INSPECT</kbd> EVIDENCE <kbd>FIX</kbd> FIELD CONTROL <kbd>TABLET</kbd> RISK WORK';
    if (paused) paused.textContent = 'Touch the scene to resume look control.';
    controls.setAttribute('aria-label', 'Touch controls: left half to move (stick follows finger), right to look, Inspect for evidence, Fix for field control at equipment, Tablet for risk work');
    return;
  }

  controls.innerHTML = '<kbd>WASD</kbd> MOVE <kbd>E</kbd> INSPECT <kbd>F</kbd> FIELD FIX <kbd>TAB</kbd> TABLET <kbd>SHIFT</kbd> SPRINT';
  controls.setAttribute('aria-label', 'Keyboard controls: WASD move, E inspect, F field fix at equipment, Tab tablet, Shift sprint');
}

installInputOnboarding();
installNavigationBridge(THREE);
installLegacyBuildingWallUpgrade(THREE);
installWallSurfaceSwap(THREE);
installContinuitySimulation();
installPlantResponseEffects(THREE);
installRearGateEnvironment();
installRiskMulateBillboard();
installFieldRepair();
installFieldFixInteraction();
installTimedRiskEvents();
installFlangeEscalation();
installResidualOutcomeFeedback();
installMobileJoystick();
installProductionRuntime(THREE);
installProductionFlangePack(THREE);
installPerformanceDiagnostics(THREE);

if (mobileLite) {
  installMobileAuthoredDetailLite(THREE);
} else {
  installForegroundVesselDetail(THREE);
  installOverheadProcessBridgeDetail(THREE);
  installSidePipeRackDetail(THREE);
  installUtilityStackDetail(THREE);
}

installFirstPersonHands(THREE);
installHighVisGloves();
installFirstPersonGloveAssets(THREE);
installIndustrialAudio();
installTabletHeldViewmodel();
const playerPhysics = installRapierPlayerController(THREE);
await import('./game.js');
// Ensure rear environment + billboard attach after scene exists (mobile-safe).
installRearGateEnvironment();
installRiskMulateBillboard();
installStickZoneReset();
installFocusGuidance();
installInputPolish();
playerPhysics.finishCapture();
