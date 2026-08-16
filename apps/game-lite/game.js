import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { scenario } from './scenario.js';
import {
  createIndustrialFlange,
  getIndustrialMaterials,
  updateFlangeEffects,
} from './flanges.js';
import { buildConcretePerimeter } from './walls.js';
import { buildIndustrialFloor } from './floors.js';
import { createElectricalPanelCluster } from './electrical-panels.js';
import { buildFieldEvidence } from './field-evidence.js';
import { buildCinematicEnvironment } from './environment.js';
import './multi-risk-ui.js';

const coarsePointer = matchMedia('(pointer: coarse)').matches;
const gameRoot = document.querySelector('#game');
const scoreEl = document.querySelector('#score');
const stageEl = document.querySelector('#stage');
const promptEl = document.querySelector('#prompt');
const startEl = document.querySelector('#start');
const startButton = document.querySelector('#startButton');
const tabletEl = document.querySelector('#tablet');
const tabletBody = document.querySelector('#tabletBody');
const tabletTabs = document.querySelector('#tabletTabs');
const pausedEl = document.querySelector('#paused');
const mobileInteract = document.querySelector('#mobileInteract');
const mobileTablet = document.querySelector('#mobileTablet');
const stickZone = document.querySelector('#stickZone');
const stickKnob = document.querySelector('#stickKnob');
const lookZone = document.querySelector('#lookZone');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7893a0);
scene.fog = new THREE.FogExp2(0x91a3a9, 0.0115);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 120);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({
  antialias: !coarsePointer,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, coarsePointer ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = !coarsePointer;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
gameRoot.appendChild(renderer.domElement);

const skyFill = new THREE.HemisphereLight(0xddeeff, 0x37412f, 1.5);
scene.add(skyFill);
const sun = new THREE.DirectionalLight(0xfff0d6, 2.65);
sun.position.set(-16, 24, 12);
sun.castShadow = !coarsePointer;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -34;
sun.shadow.camera.right = 34;
sun.shadow.camera.top = 34;
sun.shadow.camera.bottom = -34;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 70;
sun.shadow.bias = -0.00018;
scene.add(sun);
const updateEnvironment = buildCinematicEnvironment(THREE, scene);

const industrialMaterials = getIndustrialMaterials(THREE);
const materials = {
  concrete: new THREE.MeshStandardMaterial({ color: 0x727d80, roughness: 0.88, metalness: 0.05 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x8a9699, roughness: 0.58, metalness: 0.48 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x3e4a50, roughness: 0.67, metalness: 0.42 }),
  orange: industrialMaterials.pipe,
  building: new THREE.MeshStandardMaterial({ color: 0x4c5a61, roughness: 0.8, metalness: 0.18 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x343d43, roughness: 0.78, metalness: 0.2 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x7696a4, roughness: 0.2, metalness: 0.1 }),
};

const obstacles = [];
const interactables = [];
const playableHalfSize = 26.65;

function mesh(geometry, material, x, y, z, rotation = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.rotation.set(...rotation);
  scene.add(object);
  return object;
}

function addBox(x, y, z, w, h, d, material, collidable = false) {
  const object = mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z);
  if (collidable) obstacles.push({ x, z, w, d });
  return object;
}

function addTank(x, z, radius = 2.6, height = 6.4) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.userData.assetType = 'detailed-process-tank';
  scene.add(group);

  const shellMaterial = new THREE.MeshStandardMaterial({ color: 0x879194, roughness: 0.62, metalness: 0.56 });
  const seamMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5254, roughness: 0.78, metalness: 0.58 });
  const safetyMaterial = new THREE.MeshStandardMaterial({ color: 0xd5a322, roughness: 0.7, metalness: 0.18 });
  const labelMaterial = new THREE.MeshStandardMaterial({ color: 0xd8d4c6, roughness: 0.9, metalness: 0.02 });
  const grimeMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3428, roughness: 1, transparent: true, opacity: 0.34, depthWrite: false });

  const localMesh = (geometry, material, px, py, pz, rotation = [0, 0, 0]) => {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(px, py, pz);
    item.rotation.set(...rotation);
    item.castShadow = true;
    item.receiveShadow = true;
    group.add(item);
    return item;
  };

  localMesh(new THREE.CylinderGeometry(radius, radius * 0.992, height, 40), shellMaterial, 0, height / 2, 0);
  const cap = localMesh(new THREE.SphereGeometry(radius, 36, 16, 0, Math.PI * 2, 0, Math.PI / 2), shellMaterial, 0, height, 0);
  cap.scale.y = 0.62;

  localMesh(new THREE.CylinderGeometry(radius * 1.08, radius * 1.08, 0.16, 40), materials.concrete, 0, 0.08, 0);
  localMesh(new THREE.CylinderGeometry(radius * 0.94, radius * 0.97, 0.34, 36), seamMaterial, 0, 0.25, 0);

  for (const fraction of [0.18, 0.42, 0.66, 0.88]) {
    localMesh(new THREE.TorusGeometry(radius + 0.035, 0.055, 7, 36), seamMaterial, 0, height * fraction, 0, [Math.PI / 2, 0, 0]);
  }

  const platformY = height * 0.72;
  localMesh(new THREE.TorusGeometry(radius + 0.38, 0.13, 7, 42), materials.darkMetal, 0, platformY, 0, [Math.PI / 2, 0, 0]);
  localMesh(new THREE.TorusGeometry(radius + 0.43, 0.035, 6, 42), safetyMaterial, 0, platformY + 0.82, 0, [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    localMesh(new THREE.CylinderGeometry(0.028, 0.028, 0.82, 7), safetyMaterial, Math.cos(angle) * (radius + 0.43), platformY + 0.41, Math.sin(angle) * (radius + 0.43));
  }

  const ladderZ = radius + 0.24;
  for (const lx of [-0.24, 0.24]) {
    localMesh(new THREE.CylinderGeometry(0.035, 0.035, height - 0.6, 8), materials.darkMetal, lx, (height - 0.6) / 2 + 0.25, ladderZ);
  }
  for (let y = 0.65; y < height - 0.15; y += 0.34) {
    localMesh(new THREE.CylinderGeometry(0.027, 0.027, 0.48, 8), materials.darkMetal, 0, y, ladderZ, [0, 0, Math.PI / 2]);
  }

  localMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.72, 14), seamMaterial, 0, height + 0.55, 0);
  localMesh(new THREE.CylinderGeometry(0.27, 0.2, 0.12, 14), seamMaterial, 0, height + 0.93, 0);

  for (const nozzle of [
    { y: Math.min(1.3, height * 0.26), side: 1, r: 0.16 },
    { y: Math.min(3.15, height * 0.52), side: -1, r: 0.13 },
  ]) {
    const nz = nozzle.side * (radius + 0.26);
    localMesh(new THREE.CylinderGeometry(nozzle.r, nozzle.r, 0.62, 14), materials.orange, 0, nozzle.y, nz, [Math.PI / 2, 0, 0]);
    localMesh(new THREE.CylinderGeometry(nozzle.r * 1.75, nozzle.r * 1.75, 0.11, 16), materials.darkMetal, 0, nozzle.y, nozzle.side * (radius + 0.54), [Math.PI / 2, 0, 0]);
  }

  localMesh(new THREE.BoxGeometry(1.18, 0.55, 0.045), labelMaterial, 0, height * 0.5, radius + 0.035);
  localMesh(new THREE.BoxGeometry(1.02, 0.09, 0.052), safetyMaterial, 0, height * 0.5 + 0.13, radius + 0.065);

  for (const [gx, gy, gw, gh] of [
    [-0.72, height * 0.62, 0.12, 1.7],
    [0.48, height * 0.36, 0.09, 1.15],
    [0.82, height * 0.76, 0.08, 0.92],
  ]) {
    localMesh(new THREE.BoxGeometry(gw, gh, 0.018), grimeMaterial, gx, gy, radius + 0.046);
  }

  obstacles.push({ x, z, w: radius * 2.15, d: radius * 2.15 });
}

function addPipe(x, y, z, length, radius = 0.24, axis = 'x') {
  const pipe = mesh(new THREE.CylinderGeometry(radius, radius, length, 12), materials.orange, x, y, z);
  if (axis === 'x') pipe.rotation.z = Math.PI / 2;
  if (axis === 'z') pipe.rotation.x = Math.PI / 2;
  return pipe;
}

function addFlangeNetwork() {
  const leakingFlange = createIndustrialFlange(THREE, scene, {
    x: 2.4,
    y: 2.05,
    z: -6.8,
    axis: 'x',
    leaking: true,
    interactive: true,
    label: 'Inspect leaking flange',
    scale: 1.05,
  });
  leakingFlange.userData.findingId = 'flange-leak';
  interactables.push(leakingFlange);

  createIndustrialFlange(THREE, scene, {
    x: -4.4,
    y: 2.05,
    z: -6.8,
    axis: 'x',
    scale: 0.92,
  });
  createIndustrialFlange(THREE, scene, {
    x: 0.4,
    y: 3.2,
    z: -10.5,
    axis: 'x',
    scale: 0.98,
  });
  createIndustrialFlange(THREE, scene, {
    x: 4.2,
    y: 1.2,
    z: -4.7,
    axis: 'z',
    scale: 0.82,
  });
}

function buildPlant() {
  buildIndustrialFloor(THREE, scene);

  addTank(-15, -12, 2.8, 6.2);
  addTank(-8.3, -13.5, 2.2, 5.1);
  addTank(14.5, -13, 3.1, 7.3);

  addBox(10.5, 2.3, 2.5, 9, 4.6, 8, materials.building, true);
  addBox(10.5, 4.78, 2.5, 9.6, 0.35, 8.6, materials.roof);
  addBox(10.5, 2.2, -1.58, 4.4, 2.3, 0.08, materials.glass);

  createElectricalPanelCluster(THREE, scene, {
    x: 10.7,
    y: 1.82,
    z: 6.64,
    rotationY: 0,
    scale: 1,
  });

  addBox(-11, 2.05, 4.4, 10, 4.1, 6.5, materials.building, true);
  addBox(-11, 4.25, 4.4, 10.6, 0.3, 7.1, materials.roof);

  // These prototype pipes are replaced by the organized rack inside flanges.js.
  addPipe(-5, 2.05, -6.8, 22, 0.26, 'x');
  addPipe(6, 3.2, -10.5, 19, 0.31, 'x');
  addPipe(4.2, 1.2, -6.8, 8, 0.22, 'z');
  addPipe(-2.4, 3.5, -8.8, 6, 0.22, 'z');
  addBox(-3.4, 1.3, -6.8, 0.5, 2.6, 0.5, materials.darkMetal);
  addBox(5.8, 1.3, -6.8, 0.5, 2.6, 0.5, materials.darkMetal);

  addFlangeNetwork();
  interactables.push(...buildFieldEvidence(THREE, scene));

  for (let i = 0; i < 5; i += 1) {
    addBox(-19 + i * 2.1, 0.45, 7.8, 1.3, 0.9, 1.1, materials.darkMetal, true);
  }

  buildConcretePerimeter(THREE, scene, {
    halfSize: 27.2,
    segmentLength: 4,
    height: 2.5,
  });
}

buildPlant();
scene.traverse((object) => {
  if (!object.isMesh || !object.material?.isMeshStandardMaterial) return;
  object.receiveShadow = true;
  const params = object.geometry?.parameters || {};
  object.geometry?.computeBoundingSphere?.();
  const radius = object.geometry?.boundingSphere?.radius || 0;
  const thinFloorBox = object.geometry?.type === 'BoxGeometry' && Number(params.height || 1) < 0.12;
  object.castShadow = !coarsePointer
    && !object.material.transparent
    && object.geometry?.type !== 'PlaneGeometry'
    && !thinFloorBox
    && radius >= 0.16;
});

// Expose the live scene so treatment visuals can bind to findings.
window.RiskMulateScene = { scene, THREE, camera, renderer };
window.RiskMulatePlantResponse?.registerScene?.(scene, THREE);

const player = {
  x: 0,
  y: 1.72,
  z: 15,
  yaw: 0,
  pitch: -0.05,
  radius: 0.42,
};
const keys = new Set();
const raycaster = new THREE.Raycaster();
let activeInteractable = null;
let tabletOpen = false;
let gameStarted = false;
let mobileMoveX = 0;
let mobileMoveY = 0;
let pendingFindingId = null;
let pendingFindingWasNew = false;

const saveKey = `riskmulate:${scenario.id}`;

function defaultProgress() {
  return {
    version: 2,
    found: false,
    stage: -1,
    score: 0,
    complete: false,
    inspectedFindingIds: [],
    evidenceIds: [],
    discoveredRiskIds: [],
    answers: [],
    treatmentSelection: [],
    portfolioAttempts: 0,
  };
}

function readSavedProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(saveKey) || 'null');
    if (!saved) return defaultProgress();
    return {
      ...defaultProgress(),
      ...saved,
      inspectedFindingIds: Array.isArray(saved.inspectedFindingIds) ? saved.inspectedFindingIds : [],
      evidenceIds: Array.isArray(saved.evidenceIds) ? saved.evidenceIds : [],
      discoveredRiskIds: Array.isArray(saved.discoveredRiskIds) ? saved.discoveredRiskIds : [],
      answers: Array.isArray(saved.answers) ? saved.answers : [],
      treatmentSelection: Array.isArray(saved.treatmentSelection) ? saved.treatmentSelection : [],
    };
  } catch {
    return defaultProgress();
  }
}

const progress = readSavedProgress();

function saveProgress() {
  progress.found = progress.discoveredRiskIds.length > 0;
  localStorage.setItem(saveKey, JSON.stringify(progress));
  window.dispatchEvent(new CustomEvent('riskmulate:progress', { detail: { ...progress } }));
}

function allInspectionsComplete() {
  return progress.inspectedFindingIds.length >= scenario.inspectionCount;
}

function stageName() {
  if (progress.complete) return 'Debrief';
  if (progress.stage < 0) return 'Inspection';
  return scenario.stages[Math.max(0, progress.stage)]?.name || 'Inspection';
}

function syncHud() {
  scoreEl.textContent = progress.score;
  stageEl.textContent = stageName();
  window.dispatchEvent(new CustomEvent('riskmulate:progress', { detail: { ...progress } }));
}

function canOccupy(x, z) {
  if (x < -playableHalfSize || x > playableHalfSize || z < -playableHalfSize || z > playableHalfSize) {
    return false;
  }
  for (const obstacle of obstacles) {
    const halfW = obstacle.w / 2 + player.radius;
    const halfD = obstacle.d / 2 + player.radius;
    if (Math.abs(x - obstacle.x) < halfW && Math.abs(z - obstacle.z) < halfD) return false;
  }
  return true;
}

function movePlayer(dt) {
  if (tabletOpen || !gameStarted) return;
  let forward = 0;
  let strafe = 0;
  if (keys.has('KeyW')) forward += 1;
  if (keys.has('KeyS')) forward -= 1;
  if (keys.has('KeyD')) strafe += 1;
  if (keys.has('KeyA')) strafe -= 1;
  forward += -mobileMoveY;
  strafe += mobileMoveX;
  const magnitude = Math.hypot(forward, strafe);
  if (magnitude < 0.02) return;
  forward /= Math.max(1, magnitude);
  strafe /= Math.max(1, magnitude);

  const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const speed = (sprint ? 7 : 4.25) * dt;
  const sin = Math.sin(player.yaw);
  const cos = Math.cos(player.yaw);
  const dx = (-sin * forward + cos * strafe) * speed;
  const dz = (-cos * forward - sin * strafe) * speed;
  if (canOccupy(player.x + dx, player.z)) player.x += dx;
  if (canOccupy(player.x, player.z + dz)) player.z += dz;
}

function updateCamera() {
  camera.position.set(player.x, player.y, player.z);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

function updateInteraction() {
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObjects(interactables, true);
  activeInteractable = null;

  for (const hit of hits) {
    let object = hit.object;
    while (object && !object.userData.interactable) object = object.parent;
    if (object?.userData.interactable && hit.distance <= 4.2) {
      activeInteractable = object;
      break;
    }
  }

  promptEl.textContent = activeInteractable
    ? `${coarsePointer ? 'INTERACT' : 'E'} · ${activeInteractable.userData.label}`
    : '';
  promptEl.classList.toggle('show', Boolean(activeInteractable) && !tabletOpen);
}

function recordFinding(findingId) {
  const finding = scenario.findings.find((item) => item.id === findingId);
  if (!finding) return null;

  const isNew = !progress.inspectedFindingIds.includes(findingId);
  if (isNew) {
    progress.inspectedFindingIds.push(findingId);
    finding.evidence.forEach((_, index) => {
      const evidenceId = `${finding.id}:${index}`;
      if (!progress.evidenceIds.includes(evidenceId)) progress.evidenceIds.push(evidenceId);
    });
    if (finding.riskId && !progress.discoveredRiskIds.includes(finding.riskId)) {
      progress.discoveredRiskIds.push(finding.riskId);
    }
    progress.score = Math.min(scenario.maxScore, progress.score + 10);
  }

  if (allInspectionsComplete() && progress.stage < 0) progress.stage = 0;
  pendingFindingId = findingId;
  pendingFindingWasNew = isNew;
  saveProgress();
  syncHud();
  return finding;
}

function inspectActive() {
  if (!activeInteractable || tabletOpen) return;
  const findingId = activeInteractable.userData.findingId;
  if (!findingId) return;
  recordFinding(findingId);
  openTablet();
}

function openTablet() {
  tabletOpen = true;
  tabletEl.classList.add('open');
  if (document.pointerLockElement) document.exitPointerLock();
  renderTablet();
}

function closeTablet() {
  tabletOpen = false;
  tabletEl.classList.remove('open');
  pendingFindingId = null;
  pendingFindingWasNew = false;
}

window.closeTablet = closeTablet;

function renderTabs() {
  tabletTabs.innerHTML = scenario.stages
    .map((item, index) => {
      const active = progress.stage >= 0 && index === progress.stage && !progress.complete;
      const done = progress.complete || (progress.stage >= 0 && index < progress.stage);
      return `<span class="tab ${done ? 'done' : ''} ${active ? 'active' : ''}">${item.name}</span>`;
    })
    .join('');
}

function discoveredRisks() {
  return scenario.risks.filter((risk) => progress.discoveredRiskIds.includes(risk.id));
}

function analysisVisible() {
  return progress.complete || progress.stage >= 3;
}

function residualVisible() {
  return progress.complete || progress.stage >= 5;
}

function renderMatrix() {
  const risks = discoveredRisks();
  const useResidual = residualVisible();
  const showMarkers = analysisVisible();
  let cells = '';

  for (let impact = 5; impact >= 1; impact -= 1) {
    for (let likelihood = 1; likelihood <= 5; likelihood += 1) {
      const score = likelihood * impact;
      const markers = showMarkers
        ? risks.filter((risk) => {
          const l = useResidual ? risk.residualLikelihood : risk.inherentLikelihood;
          const i = useResidual ? risk.residualImpact : risk.inherentImpact;
          return l === likelihood && i === impact;
        })
        : [];
      const title = markers.length
        ? `${markers.map((risk) => risk.name).join(', ')} · L${likelihood} × I${impact} = ${score}`
        : `L${likelihood} × I${impact} = ${score}`;
      cells += `<div class="${markers.length ? 'occupied' : ''}" data-count="${markers.length || ''}" style="--risk:${Math.min(score, 12)}" title="${title}">${score}</div>`;
    }
  }
  return cells;
}

function riskStatus(risk) {
  const inherent = risk.inherentLikelihood * risk.inherentImpact;
  const residual = risk.residualLikelihood * risk.residualImpact;
  if (progress.complete) return residual > scenario.acceptanceThreshold ? 'Approval / monitor' : 'Monitor';
  if (progress.stage >= 5) return residual > scenario.acceptanceThreshold ? 'Approval required' : 'Controls selected';
  if (progress.stage >= 4) return 'Treatment planning';
  if (analysisVisible()) return inherent > scenario.acceptanceThreshold ? 'Treat / escalate' : 'Decision required';
  return 'Evidence collected';
}

function registerMarkup() {
  const risks = discoveredRisks();
  if (!risks.length) return '<tr><td colspan="4">No material risk entered yet.</td></tr>';

  return risks.map((risk) => {
    const inherent = risk.inherentLikelihood * risk.inherentImpact;
    const residual = risk.residualLikelihood * risk.residualImpact;
    const status = riskStatus(risk);
    const inherentMarkup = analysisVisible()
      ? `<span class="risk-score ${inherent > scenario.acceptanceThreshold ? 'high' : ''}">${inherent}</span>`
      : '—';
    const residualMarkup = residualVisible()
      ? `<span class="risk-score ${residual > scenario.acceptanceThreshold ? 'high' : ''}">${residual}</span>`
      : '—';
    const statusClass = status.includes('Approval') || status.includes('Treat') ? 'status-escalate' : status.includes('Monitor') ? 'status-monitor' : '';
    return `<tr>
      <td title="${risk.statement}">${risk.name}</td>
      <td>${inherentMarkup}</td>
      <td>${residualMarkup}</td>
      <td class="${statusClass}">${status}</td>
    </tr>`;
  }).join('');
}

function tabletShell(inner) {
  const matrixMode = residualVisible() ? 'Residual' : 'Inherent';
  return `${inner}
    <table class="register">
      <thead><tr><th>Risk</th><th>Inherent</th><th>Residual</th><th>Status</th></tr></thead>
      <tbody>${registerMarkup()}</tbody>
    </table>
    <div class="matrix-title">5 × 5 Risk Matrix · ${matrixMode}</div>
    <div class="matrix">${renderMatrix()}</div>`;
}

function evidenceCardMarkup(finding) {
  const risk = finding.riskId ? scenario.risks.find((item) => item.id === finding.riskId) : null;
  const status = pendingFindingWasNew ? 'EVIDENCE CAPTURED' : 'ALREADY RECORDED';
  const riskLine = risk
    ? `<div class="risk-chip-row"><span class="risk-chip ${risk.inherentImpact >= 4 ? 'high' : 'medium'}">Candidate risk: ${risk.name}</span></div>`
    : '<div class="risk-chip-row"><span class="risk-chip">Observation — classification required</span></div>';
  return `<div class="evidence-card ${finding.falsePositive ? 'false-positive' : ''}">
      <span class="evidence-kicker">${status}</span>
      <h3>${finding.label}</h3>
      ${riskLine}
      <ul class="evidence-list">${finding.evidence.map((item) => `<li>${item}</li>`).join('')}</ul>
      <p class="evidence-teaching">${finding.teaching}</p>
    </div>`;
}

function inspectionSummaryMarkup() {
  const risks = discoveredRisks();
  const evidenceCount = progress.evidenceIds.length;
  const remaining = Math.max(0, scenario.inspectionCount - progress.inspectedFindingIds.length);
  return `<div class="inspection-summary">
    <div class="inspection-progress">
      <span>Inspection points</span><strong>${progress.inspectedFindingIds.length}/${scenario.inspectionCount}</strong>
    </div>
    <div class="inspection-progress">
      <span>Evidence items</span><strong>${evidenceCount}/${scenario.evidenceTotal}</strong>
    </div>
    <div class="risk-chip-row">
      ${risks.map((risk) => `<span class="risk-chip ${risk.inherentImpact >= 4 ? 'high' : 'medium'}">${risk.name}</span>`).join('') || '<span class="risk-chip">No material risks classified yet</span>'}
    </div>
    <div class="feedback">${remaining > 0
      ? `${remaining} inspection point${remaining === 1 ? '' : 's'} remain. Keep walking the plant and collect evidence before formal assessment.`
      : 'Field collection complete. The formal risk process is now unlocked: establish context, identify, analyze, evaluate, treat, then monitor and review.'}</div>
  </div>`;
}

function debriefMarkup() {
  const correctDecisions = progress.answers.filter((answer) => answer.correct).length;
  return `<div class="question">${scenario.debrief.headline}</div>
    <div class="feedback">You classified ${progress.discoveredRiskIds.length}/${scenario.risks.length} material risks from ${progress.evidenceIds.length}/${scenario.evidenceTotal} evidence items and completed ${correctDecisions}/${scenario.stages.length} scored risk-process decisions correctly. Final score: ${progress.score}/${scenario.maxScore}.</div>
    <ul class="debrief-lessons">${scenario.debrief.lessons.map((lesson) => `<li>${lesson}</li>`).join('')}</ul>
    <div class="counterfactual"><strong>Counterfactual:</strong> ${scenario.debrief.counterfactual}</div>
    <button class="option" style="margin-top:12px" id="resetProgress">Replay scenario</button>`;
}

function portfolioMarkup(item) {
  const selected = new Set(progress.treatmentSelection || []);
  return `<div class="question">${item.prompt}</div>
    <div class="portfolio-budget" id="portfolioBudget"><span>Immediate response capacity</span><strong id="portfolioMinutes">0 / ${scenario.treatmentBudgetMinutes} min</strong></div>
    <div class="portfolio-actions">
      ${scenario.treatmentActions.map((action) => `<label class="portfolio-option">
        <input type="checkbox" data-treatment="${action.id}" ${selected.has(action.id) ? 'checked' : ''} />
        <span><b>${action.label}</b></span>
        <small>${action.minutes} min</small>
      </label>`).join('')}
    </div>
    <button class="portfolio-submit" id="submitPortfolio">Commit treatment plan</button>
    <div class="feedback" id="feedback">Select immediate actions that control every material pathway without exceeding ${scenario.treatmentBudgetMinutes} minutes.</div>`;
}

function bindInspectionButtons() {
  document.querySelector('#returnToField')?.addEventListener('click', () => {
    pendingFindingId = null;
    pendingFindingWasNew = false;
    closeTablet();
  });
}

function updatePortfolioBudget() {
  const selected = [...tabletBody.querySelectorAll('[data-treatment]:checked')].map((input) => input.dataset.treatment);
  progress.treatmentSelection = selected;
  const total = scenario.treatmentActions
    .filter((action) => selected.includes(action.id))
    .reduce((sum, action) => sum + action.minutes, 0);
  const budgetEl = document.querySelector('#portfolioBudget');
  const minutesEl = document.querySelector('#portfolioMinutes');
  if (minutesEl) minutesEl.textContent = `${total} / ${scenario.treatmentBudgetMinutes} min`;
  budgetEl?.classList.toggle('over', total > scenario.treatmentBudgetMinutes);
  return { selected, total };
}

function bindPortfolio() {
  tabletBody.querySelectorAll('[data-treatment]').forEach((input) => {
    input.addEventListener('change', () => {
      updatePortfolioBudget();
      saveProgress();
    });
  });
  document.querySelector('#submitPortfolio')?.addEventListener('click', submitPortfolio);
  updatePortfolioBudget();
}

function renderTablet(message = '') {
  renderTabs();
  syncHud();

  if (pendingFindingId) {
    const finding = scenario.findings.find((item) => item.id === pendingFindingId);
    if (finding) {
      tabletBody.innerHTML = tabletShell(`${evidenceCardMarkup(finding)}
        <button class="option" id="returnToField" style="margin-top:8px">${allInspectionsComplete() ? 'Close evidence review' : 'Return to walkdown'}</button>`);
      bindInspectionButtons();
      return;
    }
  }

  if (progress.complete) {
    tabletBody.innerHTML = tabletShell(debriefMarkup());
    document.querySelector('#resetProgress')?.addEventListener('click', () => {
      localStorage.removeItem(saveKey);
      localStorage.removeItem(`${saveKey}:tablet-view`);
      location.reload();
    });
    return;
  }

  if (!allInspectionsComplete() || progress.stage < 0) {
    tabletBody.innerHTML = tabletShell(`<div class="question">Conduct the full plant walkdown before formal assessment.</div>${inspectionSummaryMarkup()}
      <button class="option" id="returnToField" style="margin-top:8px">Return to walkdown</button>`);
    bindInspectionButtons();
    return;
  }

  const item = scenario.stages[progress.stage];
  if (item.type === 'portfolio') {
    tabletBody.innerHTML = tabletShell(portfolioMarkup(item));
    bindPortfolio();
    return;
  }

  tabletBody.innerHTML = tabletShell(`<div class="question">${item.prompt}</div>
    <div class="options">${item.options.map((option, index) => `<button class="option" data-answer="${index}">${option}</button>`).join('')}</div>
    <div class="feedback" id="feedback">${message || 'Use the collected evidence and the facility objective to make the strongest risk-management decision.'}</div>`);
  tabletBody.querySelectorAll('[data-answer]').forEach((button) => {
    button.addEventListener('click', () => answerStage(Number(button.dataset.answer)));
  });
}

function advanceStage(delay = 1050) {
  setTimeout(() => {
    progress.stage += 1;
    if (progress.stage >= scenario.stages.length) {
      progress.complete = true;
      progress.stage = scenario.stages.length - 1;
    }
    saveProgress();
    syncHud();
    renderTablet();
  }, delay);
}

function answerStage(index) {
  const item = scenario.stages[progress.stage];
  tabletBody.querySelectorAll('[data-answer]').forEach((button) => {
    button.disabled = true;
  });
  const correct = index === item.correctIndex;
  progress.answers.push({ stage: item.name, correct, answerIndex: index });
  if (correct) progress.score = Math.min(scenario.maxScore, progress.score + 100);
  else progress.score = Math.max(0, progress.score - 25);

  const feedback = `${correct ? 'Correct.' : 'Review:'} ${item.feedback}`;
  const feedbackEl = document.querySelector('#feedback');
  if (feedbackEl) feedbackEl.textContent = feedback;
  saveProgress();
  syncHud();
  advanceStage();
}

function submitPortfolio() {
  const item = scenario.stages[progress.stage];
  const { selected, total } = updatePortfolioBudget();
  const feedbackEl = document.querySelector('#feedback');

  if (total > scenario.treatmentBudgetMinutes) {
    if (feedbackEl) feedbackEl.textContent = `This plan requires ${total} minutes, exceeding the ${scenario.treatmentBudgetMinutes}-minute immediate-response limit. Prioritize containment, isolation, access, lockout, and a startup hold; long repairs can follow.`;
    return;
  }

  const required = scenario.treatmentActions.filter((action) => action.required).map((action) => action.id);
  const missing = required.filter((id) => !selected.includes(id));
  const decoys = selected.filter((id) => !required.includes(id));
  const correct = missing.length === 0 && decoys.length === 0;
  progress.portfolioAttempts += 1;

  if (!correct) {
    progress.score = Math.max(0, progress.score - 25);
    progress.answers.push({ stage: item.name, correct: false, selected: [...selected], attempt: progress.portfolioAttempts });
    const missingLabels = scenario.treatmentActions.filter((action) => missing.includes(action.id)).map((action) => action.label);
    const decoyLabels = scenario.treatmentActions.filter((action) => decoys.includes(action.id)).map((action) => action.label);
    const parts = [];
    if (missingLabels.length) parts.push(`Missing control${missingLabels.length > 1 ? 's' : ''}: ${missingLabels.join(' ')}`);
    if (decoyLabels.length) parts.push(`Low-value or poorly sequenced action${decoyLabels.length > 1 ? 's' : ''}: ${decoyLabels.join(' ')}`);
    if (feedbackEl) feedbackEl.textContent = `Revise the portfolio. ${parts.join(' ')} The immediate plan should control every live pathway within the response limit.`;
    saveProgress();
    syncHud();
    return;
  }

  progress.answers.push({ stage: item.name, correct: true, selected: [...selected], attempt: progress.portfolioAttempts });
  progress.score = Math.min(scenario.maxScore, progress.score + 100);
  if (feedbackEl) feedbackEl.textContent = `Correct. ${item.feedback}`;
  tabletBody.querySelectorAll('[data-treatment]').forEach((input) => { input.disabled = true; });
  const submit = document.querySelector('#submitPortfolio');
  if (submit) submit.disabled = true;
  saveProgress();
  syncHud();
  advanceStage(1250);
}

function toggleTablet() {
  tabletOpen ? closeTablet() : openTablet();
}

addEventListener('keydown', (event) => {
  if (event.code === 'Tab') {
    event.preventDefault();
    toggleTablet();
    return;
  }
  if (event.code === 'KeyE') inspectActive();
  keys.add(event.code);
});
addEventListener('keyup', (event) => keys.delete(event.code));

renderer.domElement.addEventListener('click', () => {
  if (!coarsePointer && gameStarted && !tabletOpen && document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }
});

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== renderer.domElement || tabletOpen) return;
  player.yaw -= event.movementX * 0.00215;
  player.pitch -= event.movementY * 0.00215;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.28, 1.28);
});

document.addEventListener('pointerlockchange', () => {
  const paused = gameStarted
    && !coarsePointer
    && !tabletOpen
    && document.pointerLockElement !== renderer.domElement;
  pausedEl.classList.toggle('show', paused);
});

startButton.addEventListener('click', () => {
  gameStarted = true;
  startEl.style.display = 'none';
  if (!coarsePointer) renderer.domElement.requestPointerLock();
});

mobileInteract.addEventListener('click', inspectActive);
mobileTablet.addEventListener('click', toggleTablet);

let stickTouchId = null;
function resetStick() {
  stickTouchId = null;
  mobileMoveX = 0;
  mobileMoveY = 0;
  stickKnob.style.transform = 'translate(0px,0px)';
}

stickZone.addEventListener('touchstart', (event) => {
  const touch = event.changedTouches[0];
  stickTouchId = touch.identifier;
}, { passive: false });

stickZone.addEventListener('touchmove', (event) => {
  const touch = [...event.changedTouches].find((item) => item.identifier === stickTouchId);
  if (!touch) return;
  event.preventDefault();
  const rect = stickZone.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = touch.clientX - cx;
  let dy = touch.clientY - cy;
  const max = 38;
  const length = Math.hypot(dx, dy);
  if (length > max) {
    dx = (dx / length) * max;
    dy = (dy / length) * max;
  }
  mobileMoveX = dx / max;
  mobileMoveY = dy / max;
  stickKnob.style.transform = `translate(${dx}px,${dy}px)`;
}, { passive: false });

stickZone.addEventListener('touchend', resetStick, { passive: false });
stickZone.addEventListener('touchcancel', resetStick, { passive: false });

let lookTouchId = null;
let lookX = 0;
let lookY = 0;
lookZone.addEventListener('touchstart', (event) => {
  const touch = event.changedTouches[0];
  lookTouchId = touch.identifier;
  lookX = touch.clientX;
  lookY = touch.clientY;
}, { passive: false });

lookZone.addEventListener('touchmove', (event) => {
  const touch = [...event.changedTouches].find((item) => item.identifier === lookTouchId);
  if (!touch || tabletOpen) return;
  event.preventDefault();
  const dx = touch.clientX - lookX;
  const dy = touch.clientY - lookY;
  lookX = touch.clientX;
  lookY = touch.clientY;
  player.yaw -= dx * 0.005;
  player.pitch -= dy * 0.004;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.28, 1.28);
}, { passive: false });

lookZone.addEventListener('touchend', () => {
  lookTouchId = null;
}, { passive: false });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarsePointer ? 1.5 : 2));
});

saveProgress();
syncHud();
renderTabs();
updateCamera();

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  movePlayer(dt);
  updateCamera();
  updateInteraction();
  updateFlangeEffects(clock.elapsedTime);
  updateEnvironment(clock.elapsedTime);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
