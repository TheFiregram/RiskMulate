/**
 * Bootstrap (engine v2)
 * ---------------------
 * Thin entry: declare installers, hand control to core/Game orchestrator.
 * Soft-fail policy preserved — optional layers cannot black-screen mobile.
 */
import * as THREE from "three";
import { game } from "./core/Game.js";
import { installLegacyBuildingWallUpgrade } from "./buildingWalls.js";
import { installContinuitySimulation } from "./continuity-simulation.js";
import { installFirstPersonGloveAssets } from "./first-person-glove-assets.js";
import { installFirstPersonHands } from "./first-person-hands.js";
import { installHighVisGloves } from "./high-vis-gloves.js";
import { installForegroundVesselDetail } from "./foreground-vessel-detail.js";
import { installIndustrialAudio } from "./industrial-audio.js";
import { installMobileAuthoredDetailLite } from "./mobile-authored-detail-lite.js";
import { getMobilePerformanceProfile } from "./mobile-performance.js";
import { installNavigationBridge } from "./navigation-bridge.js";
import { installOverheadProcessBridgeDetail } from "./overhead-process-bridge-detail.js";
import { installPerformanceDiagnostics } from "./performance-diagnostics.js";
import { installPlantResponseEffects } from "./plant-response-effects.js";
import { installRearGateEnvironment } from "./rear-gate-environment.js";
import { installRiskMulateBillboard } from "./riskmulate-billboard.js";
import { installFieldRepair } from "./field-repair.js";
import { installFieldFixInteraction } from "./field-fix-interaction.js";
import { installTimedRiskEvents } from "./timed-risk-events.js";
import { installFlangeEscalation } from "./flange-escalation.js";
import { installFindingEscalation } from "./finding-escalation.js";
import { installResidualOutcomeFeedback } from "./residual-outcome-feedback.js";
import { installMobileJoystick } from "./mobile-joystick.js";
import { installRapierPlayerController } from "./player-rapier-controller.js";
import { installProductionFlangePack } from "./production-flange-pack.js";
import { installProductionRuntime } from "./production-runtime.js";
import { installSidePipeRackDetail } from "./side-pipe-rack-detail.js";
import { installTabletHeldViewmodel } from "./tablet-held-viewmodel.js";
import { installInputPolish } from "./input-polish.js";
import { installStickZoneReset } from "./stick-zone-reset.js";
import { installFocusGuidance } from "./focus-guidance.js";
import { installMonitorReviewLoop } from "./monitor-review-loop.js";
import { installScenarioDebrief } from "./scenario-debrief.js";
import { installClassReadiness } from "./class-readiness.js";
import { installFlangeFindingId } from "./flange-finding-id.js";
import { installSessionReset } from "./session-reset.js";
import { installUtilityStackDetail } from "./utility-stack-detail.js";
import { installWallSurfaceSwap } from "./wallSurfaceSwap.js";

const mobileLite = Boolean(getMobilePerformanceProfile?.()?.lite);

/** Layers that may run before native scene is ready. */
const beforeScene = [
  { label: "walls", fn: () => installLegacyBuildingWallUpgrade(THREE) },
  { label: "wall-surface", fn: () => installWallSurfaceSwap(THREE) },
  { label: "nav-bridge", fn: () => installNavigationBridge() },
  { label: "continuity", fn: () => installContinuitySimulation() },
  { label: "plant-response", fn: () => installPlantResponseEffects() },
  { label: "field-repair", fn: () => installFieldRepair() },
  { label: "field-fix", fn: () => installFieldFixInteraction() },
  { label: "timed-events", fn: () => installTimedRiskEvents() },
  { label: "flange-escalation", fn: () => installFlangeEscalation() },
  { label: "finding-escalation", fn: () => installFindingEscalation() },
  { label: "residual-feedback", fn: () => installResidualOutcomeFeedback() },
  { label: "mobile-joystick", fn: () => installMobileJoystick() },
  { label: "production-runtime", fn: () => installProductionRuntime(THREE) },
  { label: "production-flange", fn: () => installProductionFlangePack(THREE) },
  { label: "perf-diagnostics", fn: () => installPerformanceDiagnostics(THREE) },
  ...(mobileLite
    ? [{ label: "mobile-detail", fn: () => installMobileAuthoredDetailLite(THREE) }]
    : [
        { label: "vessel-detail", fn: () => installForegroundVesselDetail(THREE) },
        { label: "overhead-bridge", fn: () => installOverheadProcessBridgeDetail(THREE) },
        { label: "pipe-rack", fn: () => installSidePipeRackDetail(THREE) },
        { label: "utility-stack", fn: () => installUtilityStackDetail(THREE) },
      ]),
  { label: "fp-hands", fn: () => installFirstPersonHands(THREE) },
  { label: "high-vis-gloves", fn: () => installHighVisGloves() },
  { label: "glove-assets", fn: () => installFirstPersonGloveAssets(THREE) },
  { label: "industrial-audio", fn: () => installIndustrialAudio() },
  { label: "tablet-viewmodel", fn: () => installTabletHeldViewmodel() },
];

let playerPhysics = null;
beforeScene.push({
  label: "rapier-player",
  fn: () => {
    playerPhysics = installRapierPlayerController(THREE);
    return playerPhysics;
  },
});

/** Layers that require RiskMulateScene (after gameReady). */
const afterScene = [
  { label: "rear-gate", fn: () => installRearGateEnvironment() },
  { label: "billboard", fn: () => installRiskMulateBillboard() },
  { label: "stick-zone-reset", fn: () => installStickZoneReset() },
  { label: "focus-guidance", fn: () => installFocusGuidance() },
  { label: "monitor-review", fn: () => installMonitorReviewLoop() },
  { label: "scenario-debrief", fn: () => installScenarioDebrief() },
  { label: "class-readiness", fn: () => installClassReadiness() },
  { label: "flange-finding-id", fn: () => installFlangeFindingId() },
  { label: "session-reset", fn: () => installSessionReset() },
  { label: "input-polish", fn: () => installInputPolish() },
];

await game.start({
  beforeScene,
  afterScene,
  afterAll: () => {
    try {
      playerPhysics?.finishCapture?.();
    } catch (error) {
      console.warn("[RiskMulate] physics capture finish failed", error);
    }
  },
});
