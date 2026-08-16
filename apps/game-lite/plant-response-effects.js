import { scenario } from './scenario.js';
import { setLeakingFlangeControlled } from './flanges.js';

/**
 * Plant response layer
 * --------------------
 * Educational purpose: treatment is not only a tablet checklist.
 * When students select or commit controls, the facility should change so they
 * can see residual risk reduction as a physical consequence of decisions.
 */

const FINDING_ACTION_MAP = Object.freeze({
  'flange-leak': 'isolate-line',
  'storm-drain': 'protect-drain',
  'access-obstruction': 'clear-access',
  'electrical-panel': 'electrical-loto',
  'support-vibration': 'support-startup-hold',
  'temp-hose': 'secure-temp-hose',
});

const ACTION_LABELS = Object.freeze({
  'isolate-line': 'Line isolated',
  'protect-drain': 'Drain protected',
  'clear-access': 'Access cleared',
  'electrical-loto': 'Circuit locked out',
  'support-startup-hold': 'Startup hold tagged',
  'secure-temp-hose': 'Temporary hose secured',
});

let installed = false;
let THREE_REF = null;
let sceneRef = null;
let findingRoots = new Map();
let markerMaterials = null;
let lastSignature = '';
let toastEl = null;

function getMaterials() {
  if (markerMaterials || !THREE_REF) return markerMaterials;
  const THREE = THREE_REF;
  markerMaterials = {
    projected: new THREE.MeshStandardMaterial({
      color: 0xd9a34e,
      emissive: 0x5a3a10,
      emissiveIntensity: 0.45,
      roughness: 0.55,
      metalness: 0.15,
      transparent: true,
      opacity: 0.92,
    }),
    committed: new THREE.MeshStandardMaterial({
      color: 0x6fbf80,
      emissive: 0x1d4a28,
      emissiveIntensity: 0.5,
      roughness: 0.5,
      metalness: 0.12,
      transparent: true,
      opacity: 0.95,
    }),
    plate: new THREE.MeshStandardMaterial({
      color: 0x3b4549,
      roughness: 0.7,
      metalness: 0.4,
    }),
    lock: new THREE.MeshStandardMaterial({
      color: 0xc9a329,
      emissive: 0x4a3208,
      emissiveIntensity: 0.35,
      roughness: 0.45,
      metalness: 0.35,
    }),
  };
  return markerMaterials;
}

function ensureToast() {
  if (toastEl) return toastEl;
  toastEl = document.createElement('div');
  toastEl.id = 'plantResponseToast';
  toastEl.className = 'plant-response-toast';
  toastEl.setAttribute('role', 'status');
  toastEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastEl);
  return toastEl;
}

function showToast(message, mode = 'projected') {
  const el = ensureToast();
  el.dataset.mode = mode;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.remove('show'), 2600);
}

function discoverScene() {
  if (sceneRef && THREE_REF) return true;
  const canvas = document.querySelector('#game canvas');
  if (!canvas) return false;
  if (window.RiskMulateScene?.scene && window.RiskMulateScene?.THREE) {
    sceneRef = window.RiskMulateScene.scene;
    THREE_REF = window.RiskMulateScene.THREE;
    return true;
  }
  return false;
}

function indexFindings() {
  findingRoots.clear();
  if (!sceneRef) return;
  sceneRef.traverse((object) => {
    if (object.userData?.findingId) {
      findingRoots.set(object.userData.findingId, object);
    }
    if (object.userData?.findingId === 'flange-leak' || object.userData?.leaking) {
      findingRoots.set('flange-leak', object);
    }
  });
}

function ensureMarker(root, key, localPosition) {
  const existing = root.getObjectByName(`response-marker-${key}`);
  if (existing) return existing;
  if (!THREE_REF) return null;
  const THREE = THREE_REF;
  const materials = getMaterials();
  const marker = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.11, 0),
    materials.projected.clone(),
  );
  marker.name = `response-marker-${key}`;
  marker.position.set(...localPosition);
  marker.userData.responseMarker = true;
  root.add(marker);
  return marker;
}

function ensureDrainCover(root) {
  let cover = root.getObjectByName('response-drain-cover');
  if (cover) return cover;
  if (!THREE_REF) return null;
  const THREE = THREE_REF;
  const materials = getMaterials();
  cover = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.05, 0.95), materials.plate.clone());
  cover.name = 'response-drain-cover';
  cover.position.set(0, 0.14, 0);
  cover.visible = false;
  root.add(cover);
  return cover;
}

function ensureLotoLock(root) {
  let lock = root.getObjectByName('response-loto-lock');
  if (lock) return lock;
  if (!THREE_REF) return null;
  const THREE = THREE_REF;
  const materials = getMaterials();
  lock = new THREE.Group();
  lock.name = 'response-loto-lock';
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.08), materials.lock.clone());
  body.position.y = 0.02;
  const shackle = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.015, 6, 12, Math.PI),
    materials.lock.clone(),
  );
  shackle.position.y = 0.12;
  shackle.rotation.x = Math.PI / 2;
  lock.add(body);
  lock.add(shackle);
  lock.position.set(0.55, 1.7, 0.28);
  lock.visible = false;
  root.add(lock);
  return lock;
}

function setFindingVisual(findingId, state) {
  const root = findingRoots.get(findingId);
  if (!root && findingId !== 'flange-leak') return;

  if (findingId === 'flange-leak') {
    setLeakingFlangeControlled(state !== 'off', { projected: state === 'projected' });
  }

  if (!root) return;

  if (findingId === 'storm-drain') {
    const cover = ensureDrainCover(root);
    if (cover) {
      cover.visible = state !== 'off';
      cover.material.color.setHex(state === 'committed' ? 0x3f5a44 : 0x3b4549);
      cover.material.emissive?.setHex?.(state === 'projected' ? 0x3a2a08 : 0x000000);
      cover.material.emissiveIntensity = state === 'projected' ? 0.2 : 0;
    }
    root.traverse((child) => {
      if (child.isMesh && child.material?.transparent && child.geometry?.type === 'CircleGeometry') {
        child.material.opacity = state === 'committed' ? 0.18 : state === 'projected' ? 0.35 : 0.58;
      }
    });
  }

  if (findingId === 'access-obstruction') {
    root.visible = state !== 'committed';
    root.traverse((child) => {
      if (!child.isMesh || !child.material || child.userData?.hitVolume) return;
      if (state === 'projected') {
        child.material.transparent = true;
        child.material.opacity = 0.35;
      } else if (state === 'off') {
        child.material.opacity = child.material.userData?.baseOpacity ?? 1;
        if (!child.material.userData) child.material.userData = {};
        if (child.material.userData.baseOpacity == null) {
          child.material.userData.baseOpacity = child.material.opacity ?? 1;
        }
        child.material.transparent = (child.material.userData.baseOpacity ?? 1) < 1;
        child.material.opacity = child.material.userData.baseOpacity ?? 1;
      }
    });
  }

  if (findingId === 'electrical-panel') {
    const lock = ensureLotoLock(root);
    if (lock) lock.visible = state !== 'off';
    root.traverse((child) => {
      if (child.isMesh && child.geometry?.type === 'SphereGeometry' && child.material?.emissive) {
        if (state === 'committed') {
          child.material.color.setHex(0x6fbf80);
          child.material.emissive.setHex(0x1d4a28);
          child.material.emissiveIntensity = 0.55;
        } else if (state === 'projected') {
          child.material.color.setHex(0xd9a34e);
          child.material.emissive.setHex(0x5a3a10);
          child.material.emissiveIntensity = 0.45;
        } else {
          child.material.color.setHex(0xc88924);
          child.material.emissive.setHex(0x5d2b04);
          child.material.emissiveIntensity = 0.36;
        }
      }
    });
  }

  if (findingId === 'temp-hose') {
    root.visible = state !== 'committed';
    root.traverse((child) => {
      if (!child.isMesh || !child.material || child.userData?.hitVolume) return;
      if (state === 'projected') {
        child.material.transparent = true;
        child.material.opacity = 0.4;
      } else if (state === 'off') {
        child.material.opacity = 1;
        child.material.transparent = false;
      }
    });
  }

  if (findingId === 'support-vibration') {
    const marker = ensureMarker(root, 'hold', [0.25, 2.55, 0.15]);
    if (marker) {
      marker.visible = state !== 'off';
      const materials = getMaterials();
      marker.material.color.copy(state === 'committed' ? materials.committed.color : materials.projected.color);
      marker.material.emissive.copy(state === 'committed' ? materials.committed.emissive : materials.projected.emissive);
      marker.material.emissiveIntensity = state === 'committed' ? 0.55 : 0.4;
    }
  }
}

function selectionState(progress, continuity) {
  const selected = new Set(Array.isArray(progress.treatmentSelection) ? progress.treatmentSelection : []);
  const mode = continuity?.mode || 'BASELINE';
  const states = {};
  for (const [findingId, actionId] of Object.entries(FINDING_ACTION_MAP)) {
    if (!selected.has(actionId)) states[findingId] = 'off';
    else if (mode === 'ACTIVE') states[findingId] = 'committed';
    else if (mode === 'PROJECTED') states[findingId] = 'projected';
    else states[findingId] = 'off';
  }
  return states;
}

function signatureFor(states, mode) {
  return `${mode}|${Object.entries(states).map(([k, v]) => `${k}:${v}`).join(',')}`;
}

function applyPlantResponse(progress = {}, continuity = null) {
  if (!discoverScene()) return;
  if (findingRoots.size === 0) indexFindings();
  if (!findingRoots.has('flange-leak')) indexFindings();

  const states = selectionState(progress, continuity);
  const signature = signatureFor(states, continuity?.mode || 'BASELINE');
  if (signature === lastSignature) return;
  const previous = lastSignature;
  lastSignature = signature;

  for (const [findingId, state] of Object.entries(states)) {
    setFindingVisual(findingId, state);
  }

  if (!previous) return;
  const committedActions = Object.entries(states)
    .filter(([, state]) => state === 'committed')
    .map(([findingId]) => ACTION_LABELS[FINDING_ACTION_MAP[findingId]]);
  const projectedActions = Object.entries(states)
    .filter(([, state]) => state === 'projected')
    .map(([findingId]) => ACTION_LABELS[FINDING_ACTION_MAP[findingId]]);

  if (continuity?.mode === 'ACTIVE' && committedActions.length) {
    showToast(`Plant response locked: ${committedActions.join(' · ')}`, 'committed');
    window.RiskMulateAudio?.playInteractionTick?.();
  } else if (continuity?.mode === 'PROJECTED' && projectedActions.length) {
    showToast(`Projected controls visible on plant: ${projectedActions.slice(0, 3).join(' · ')}`, 'projected');
  } else if (continuity?.mode === 'BASELINE') {
    showToast('Plant restored to uncontrolled field condition', 'baseline');
  }
}

function injectStyles() {
  if (document.querySelector('#plant-response-effects-style')) return;
  const style = document.createElement('style');
  style.id = 'plant-response-effects-style';
  style.textContent = `
    .plant-response-toast {
      position: fixed;
      left: 50%;
      bottom: calc(var(--safe-bottom, 12px) + 92px);
      transform: translateX(-50%) translateY(12px);
      max-width: min(520px, calc(100vw - 24px));
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid rgba(201, 216, 223, 0.22);
      background: rgba(8, 14, 18, 0.82);
      color: #d7e2e7;
      font-size: 12px;
      line-height: 1.35;
      letter-spacing: 0.02em;
      opacity: 0;
      pointer-events: none;
      transition: opacity 160ms ease, transform 160ms ease;
      z-index: 40;
      text-align: center;
      backdrop-filter: blur(6px);
    }
    .plant-response-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .plant-response-toast[data-mode="committed"] {
      border-color: rgba(111, 191, 128, 0.45);
      color: #d9f0de;
    }
    .plant-response-toast[data-mode="projected"] {
      border-color: rgba(217, 163, 78, 0.45);
      color: #f0e2c4;
    }
    @media (max-width: 760px) {
      .plant-response-toast {
        bottom: calc(var(--safe-bottom, 12px) + 148px);
        font-size: 11px;
      }
    }
  `;
  document.head.appendChild(style);
}

export function installPlantResponseEffects(THREE) {
  if (installed) return;
  installed = true;
  THREE_REF = THREE;
  injectStyles();

  window.RiskMulatePlantResponse = {
    registerScene(scene, three = THREE) {
      sceneRef = scene;
      THREE_REF = three || THREE;
      indexFindings();
    },
    refresh(progress, continuity) {
      applyPlantResponse(progress, continuity);
    },
  };

  const tryBind = () => {
    if (discoverScene()) {
      indexFindings();
      return true;
    }
    return false;
  };

  let attempts = 0;
  const bootTimer = setInterval(() => {
    attempts += 1;
    if (tryBind() || attempts > 40) clearInterval(bootTimer);
  }, 250);

  window.addEventListener('riskmulate:continuity', (event) => {
    const continuity = event.detail || null;
    let progress = {};
    try {
      progress = JSON.parse(localStorage.getItem(`riskmulate:${scenario.id}`) || '{}') || {};
    } catch {
      progress = {};
    }
    applyPlantResponse(progress, continuity);
  });

  window.addEventListener('riskmulate:progress', (event) => {
    applyPlantResponse(event.detail || {}, window.__riskmulateLastContinuity || null);
  });

  window.addEventListener('riskmulate:continuity', (event) => {
    window.__riskmulateLastContinuity = event.detail || null;
  });
}
