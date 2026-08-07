import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { scenario } from './scenario.js';
import {
  createIndustrialFlange,
  getIndustrialMaterials,
  updateFlangeEffects,
} from './flanges.js';
import { buildConcretePerimeter } from './walls.js';
import { buildIndustrialFloor } from './floors.js';

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
scene.background = new THREE.Color(0x91a9b7);
scene.fog = new THREE.Fog(0x91a9b7, 28, 78);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 120);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({
  antialias: !coarsePointer,
  powerPreference: 'low-power',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, coarsePointer ? 1.2 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
gameRoot.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xddeeff, 0x37412f, 2.15));
const sun = new THREE.DirectionalLight(0xfff0d6, 2.35);
sun.position.set(-16, 24, 12);
scene.add(sun);

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
  mesh(new THREE.CylinderGeometry(radius, radius, height, 22), materials.metal, x, height / 2, z);
  const cap = mesh(
    new THREE.SphereGeometry(radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.metal,
    x,
    height,
    z,
  );
  cap.scale.y = 0.65;
  for (const y of [1.3, 3.2, 5.1]) {
    mesh(
      new THREE.TorusGeometry(radius + 0.03, 0.09, 6, 26),
      materials.darkMetal,
      x,
      y,
      z,
      [Math.PI / 2, 0, 0],
    );
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

  addBox(-11, 2.05, 4.4, 10, 4.1, 6.5, materials.building, true);
  addBox(-11, 4.25, 4.4, 10.6, 0.3, 7.1, materials.roof);

  addPipe(-5, 2.05, -6.8, 22, 0.26, 'x');
  addPipe(6, 3.2, -10.5, 19, 0.31, 'x');
  addPipe(4.2, 1.2, -6.8, 8, 0.22, 'z');
  addPipe(-2.4, 3.5, -8.8, 6, 0.22, 'z');
  addBox(-3.4, 1.3, -6.8, 0.5, 2.6, 0.5, materials.darkMetal);
  addBox(5.8, 1.3, -6.8, 0.5, 2.6, 0.5, materials.darkMetal);

  addFlangeNetwork();

  for (let i = 0; i < 5; i += 1) {
    addBox(-19 + i * 2.1, 0.45, 7.8, 1.3, 0.9, 1.1, materials.darkMetal, true);
  }

  buildConcretePerimeter(THREE, scene, {
    halfSize: 27.2,
    segmentLength: 4,
    height: 2.5,
  });

  for (let i = 0; i < 24; i += 1) {
    const size = 0.15 + Math.random() * 0.3;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(size, 0),
      new THREE.MeshStandardMaterial({ color: 0x596253, roughness: 1 }),
    );
    rock.position.set(-34 + Math.random() * 68, size / 2, -33 + Math.random() * 66);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(rock);
  }
}

buildPlant();

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

const saveKey = `riskmulate:${scenario.id}`;
const saved = JSON.parse(localStorage.getItem(saveKey) || 'null');
const progress = saved || { found: false, stage: -1, score: 0, complete: false };

function saveProgress() {
  localStorage.setItem(saveKey, JSON.stringify(progress));
}

function stageName() {
  if (!progress.found) return 'Inspection';
  if (progress.complete) return 'Debrief';
  return scenario.stages[Math.max(0, progress.stage)]?.name || 'Inspection';
}

function syncHud() {
  scoreEl.textContent = progress.score;
  stageEl.textContent = stageName();
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

function inspectActive() {
  if (!activeInteractable || tabletOpen) return;
  if (!progress.found) {
    progress.found = true;
    progress.stage = 0;
    saveProgress();
    syncHud();
  }
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
}

window.closeTablet = closeTablet;

function renderTabs() {
  tabletTabs.innerHTML = scenario.stages
    .map((item, index) => {
      const cls = progress.complete || index < progress.stage ? 'done' : index === progress.stage ? 'active' : '';
      return `<span class="tab ${cls}">${item.name}</span>`;
    })
    .join('');
}

function renderMatrix() {
  let cells = '';
  for (let impact = 5; impact >= 1; impact -= 1) {
    for (let likelihood = 1; likelihood <= 5; likelihood += 1) {
      const risk = likelihood * impact;
      cells += `<div style="--risk:${Math.min(risk, 12)}" title="L${likelihood} × I${impact} = ${risk}">${risk}</div>`;
    }
  }
  return cells;
}

function registerMarkup() {
  if (!progress.found) return '<tr><td colspan="4">No risk recorded yet.</td></tr>';
  const stage = progress.stage;
  const inherent = stage >= 2 || progress.complete
    ? scenario.risk.inherentLikelihood * scenario.risk.inherentImpact
    : '—';
  const residual = stage >= 5 || progress.complete
    ? scenario.risk.residualLikelihood * scenario.risk.residualImpact
    : '—';
  const status = progress.complete || stage >= 5
    ? 'Monitor / approval'
    : stage >= 4
      ? 'Treatment selected'
      : 'Open';
  return `<tr><td>${scenario.risk.name}</td><td>${inherent}</td><td>${residual}</td><td>${status}</td></tr>`;
}

function tabletShell(inner) {
  return `${inner}
    <table class="register">
      <thead><tr><th>Risk</th><th>Inherent</th><th>Residual</th><th>Status</th></tr></thead>
      <tbody>${registerMarkup()}</tbody>
    </table>
    <div class="matrix-title">5 × 5 Risk Matrix</div>
    <div class="matrix">${renderMatrix()}</div>`;
}

function renderTablet(message = '') {
  renderTabs();
  syncHud();

  if (!progress.found) {
    tabletBody.innerHTML = tabletShell(
      '<div class="question">Inspect the leaking flange in the plant to begin the assessment.</div>',
    );
    return;
  }

  if (progress.complete) {
    tabletBody.innerHTML = tabletShell(`<div class="question">Scenario complete</div>
      <div class="feedback">Debrief: You linked the risk to objectives, wrote a cause → event → consequence statement, assessed inherent risk, compared it with criteria, selected controls, then recorded and monitored residual risk. Final score: ${progress.score}/600.</div>
      <button class="option" style="margin-top:12px" id="resetProgress">Replay scenario</button>`);
    document.querySelector('#resetProgress').addEventListener('click', () => {
      localStorage.removeItem(saveKey);
      location.reload();
    });
    return;
  }

  const item = scenario.stages[progress.stage];
  tabletBody.innerHTML = tabletShell(`<div class="question">${item.prompt}</div>
    <div class="options">${item.options.map((option, index) => `<button class="option" data-answer="${index}">${option}</button>`).join('')}</div>
    <div class="feedback" id="feedback">${message || 'Choose the strongest risk-management response.'}</div>`);
  tabletBody.querySelectorAll('[data-answer]').forEach((button) => {
    button.addEventListener('click', () => answerStage(Number(button.dataset.answer)));
  });
}

function answerStage(index) {
  const item = scenario.stages[progress.stage];
  tabletBody.querySelectorAll('[data-answer]').forEach((button) => {
    button.disabled = true;
  });
  const correct = index === item.correctIndex;
  if (correct) progress.score += 100;
  else progress.score = Math.max(0, progress.score - 25);

  const feedback = `${correct ? 'Correct.' : 'Review:'} ${item.feedback}`;
  const feedbackEl = document.querySelector('#feedback');
  if (feedbackEl) feedbackEl.textContent = feedback;
  syncHud();
  saveProgress();

  setTimeout(() => {
    progress.stage += 1;
    if (progress.stage >= scenario.stages.length) {
      progress.complete = true;
      progress.stage = scenario.stages.length - 1;
    }
    saveProgress();
    renderTablet();
  }, 850);
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
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarsePointer ? 1.2 : 1.5));
});

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
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
