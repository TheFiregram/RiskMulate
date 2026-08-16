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
import { installFindingEscalation } from './finding-escalation.js';
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
import { installMonitorReviewLoop } from './monitor-review-loop.js';
import { installScenarioDebrief } from './scenario-debrief.js';
import { installClassReadiness } from './class-readiness.js';
import { installUtilityStackDetail } from './utility-stack-detail.js';
import { installWallSurfaceSwap } from './wallSurfaceSwap.js';

/**
 * Bootstrap
 * ---------
 * Critical path must remain playable even if an optional layer fails.
 * Optional installers are wrapped so a broken module cannot black-screen mobile.
 */

function showBootError(message) {
  try {
    let el = document.querySelector('#riskmulate-boot-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'riskmulate-boot-error';
      el.setAttribute('role', 'alert');
      el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;padding:12px 14px;border-radius:10px;background:rgba(40,10,10,0.92);color:#f2d6d6;font:12px/1.4 system-ui;border:1px solid rgba(220,120,120,0.45);';
      document.body.appendChild(el);
    }
    el.textContent = message;
  } catch {
    /* ignore */
  }
  console.error('[RiskMulate]', message);
}

function softInstall(label, fn) {
  try {
    return fn();
  } catch (error) {
    showBootError(`Optional layer failed: ${label}. Core play continues.`);
    console.warn(`[RiskMulate] ${label} install failed`, error);
    return null;
  }
}

window.addEventListener('error', (event) => {
  const msg = event?.error?.message || event?.message || 'Unknown runtime error';
  if (String(msg).includes('Script error')) return;
  showBootError(`Runtime: ${msg}`);
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const msg = reason?.message || String(reason || 'unhandled rejection');
  showBootError(`Async: ${msg}`);
});

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
softInstall('plant-response', () => installPlantResponseEffects(THREE));
softInstall('rear-gate', () => installRearGateEnvironment());
softInstall('billboard', () => installRiskMulateBillboard());
softInstall('field-repair', () => installFieldRepair());
softInstall('field-fix', () => installFieldFixInteraction());
softInstall('timed-events', () => installTimedRiskEvents());
softInstall('flange-escalation', () => installFlangeEscalation());
softInstall('finding-escalation', () => installFindingEscalation());
softInstall('residual-feedback', () => installResidualOutcomeFeedback());
softInstall('mobile-joystick', () => installMobileJoystick());
softInstall('production-runtime', () => installProductionRuntime(THREE));
softInstall('production-flange', () => installProductionFlangePack(THREE));
softInstall('perf-diagnostics', () => installPerformanceDiagnostics(THREE));

if (mobileLite) {
  softInstall('mobile-detail', () => installMobileAuthoredDetailLite(THREE));
} else {
  softInstall('vessel-detail', () => installForegroundVesselDetail(THREE));
  softInstall('overhead-bridge', () => installOverheadProcessBridgeDetail(THREE));
  softInstall('pipe-rack', () => installSidePipeRackDetail(THREE));
  softInstall('utility-stack', () => installUtilityStackDetail(THREE));
}

softInstall('fp-hands', () => installFirstPersonHands(THREE));
softInstall('high-vis-gloves', () => installHighVisGloves());
softInstall('glove-assets', () => installFirstPersonGloveAssets(THREE));
softInstall('industrial-audio', () => installIndustrialAudio());
softInstall('tablet-viewmodel', () => installTabletHeldViewmodel());
const playerPhysics = installRapierPlayerController(THREE);
try {
  const gameModule = await import('./game.js');
  if (gameModule?.gameReady) await gameModule.gameReady;
} catch (error) {
  showBootError('Core game failed to load. Hard-refresh, or clear site data for this origin.');
  console.error('[RiskMulate] game.js import failed', error);
  throw error;
}
softInstall('rear-gate', () => installRearGateEnvironment());
softInstall('billboard', () => installRiskMulateBillboard());
softInstall('stick-zone-reset', () => installStickZoneReset());
softInstall('focus-guidance', () => installFocusGuidance());
softInstall('monitor-review', () => installMonitorReviewLoop());
softInstall('scenario-debrief', () => installScenarioDebrief());
softInstall('class-readiness', () => installClassReadiness());
softInstall('input-polish', () => installInputPolish());
try {
  playerPhysics.finishCapture();
} catch (error) {
  console.warn('[RiskMulate] physics capture finish failed', error);
}
