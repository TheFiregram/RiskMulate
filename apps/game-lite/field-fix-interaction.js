import {
  applyFieldRepair,
  getRepairForFinding,
  isFindingFixable,
  isFindingFixed,
} from './field-repair.js';

/**
 * Field FIX interaction + free-move bridge
 * ---------------------------------------
 * Educational purpose: treatment happens at the equipment after evidence is recorded.
 * This module self-hosts raycast prompts and joystick→WASD mapping so the playable
 * loop works even before a full native game.js rewrite lands.
 */

export function installFieldFixInteraction() {
  if (window.RiskMulateFieldFixInteraction?.installed) {
    return window.RiskMulateFieldFixInteraction;
  }

  const promptEl = document.querySelector('#prompt');
  const mobileFix = document.querySelector('#mobileFix');

  // Free joystick → movement. Prefer RiskMulateMobileMove if game.js registers it;
  // otherwise synthesize WASD so movePlayer keeps working.
  const held = new Set();
  function syncKey(code, active) {
    if (active && !held.has(code)) {
      held.add(code);
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    } else if (!active && held.has(code)) {
      held.delete(code);
      window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    }
  }

  const existingMove = window.RiskMulateMobileMove;
  window.RiskMulateMobileMove = {
    set(nx, ny) {
      const x = nx || 0;
      const y = ny || 0;
      window.__riskmulateMoveX = x;
      window.__riskmulateMoveY = y;
      if (existingMove?.set && existingMove !== window.RiskMulateMobileMove) {
        existingMove.set(x, y);
      }
      const dead = 0.28;
      // Always keep WASD synthesis as a reliable fallback path.
      syncKey('KeyW', y < -dead);
      syncKey('KeyS', y > dead);
      syncKey('KeyA', x < -dead);
      syncKey('KeyD', x > dead);
      window.dispatchEvent(new CustomEvent('riskmulate:mobile-move', { detail: { x, y } }));
    },
    get() {
      return {
        x: window.__riskmulateMoveX || 0,
        y: window.__riskmulateMoveY || 0,
      };
    },
  };

  function progressFromStorage() {
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith('riskmulate:')) {
          return JSON.parse(localStorage.getItem(key) || '{}') || {};
        }
      }
    } catch {
      /* ignore */
    }
    return {};
  }

  function raycastFindingId() {
    const bridge = window.RiskMulateScene;
    if (!bridge?.scene || !bridge?.camera || !bridge?.THREE) return null;
    const THREE = bridge.THREE;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, bridge.camera);
    const hits = raycaster.intersectObjects(bridge.scene.children, true);
    for (const hit of hits) {
      let object = hit.object;
      while (object) {
        if (object.userData?.interactable && object.userData?.findingId && hit.distance <= 4.2) {
          return object.userData.findingId;
        }
        object = object.parent;
      }
    }
    return null;
  }

  function resolveActiveFindingId() {
    const exposed = window.RiskMulateInteraction?.activeInteractable?.userData?.findingId;
    if (exposed) return exposed;
    const rayHit = raycastFindingId();
    if (rayHit) return rayHit;
    const progress = progressFromStorage();
    const inspected = Array.isArray(progress.inspectedFindingIds) ? progress.inspectedFindingIds : [];
    for (let i = inspected.length - 1; i >= 0; i -= 1) {
      const id = inspected[i];
      if (isFindingFixable(id, progress)) return id;
    }
    return null;
  }

  function syncFixReadyClass() {
    const findingId = resolveActiveFindingId();
    const progress = progressFromStorage();
    const ready = Boolean(findingId && isFindingFixable(findingId, progress));
    document.body.classList.toggle('field-fix-ready', ready);

    // When looking at a fixable finding, upgrade the prompt text if possible.
    if (ready && promptEl && !document.querySelector('#tablet')?.classList.contains('open')) {
      const repair = getRepairForFinding(findingId);
      const coarse = matchMedia('(pointer: coarse)').matches;
      const verb = repair?.verb || 'Apply field control';
      promptEl.textContent = coarse ? `FIX · ${verb}` : `F · ${verb}`;
      promptEl.classList.add('show');
    }
    return ready;
  }

  function doFix() {
    const findingId = resolveActiveFindingId();
    if (!findingId) {
      if (promptEl) {
        promptEl.textContent = 'Aim at inspected equipment to apply field control';
        promptEl.classList.add('show');
      }
      return;
    }
    const result = applyFieldRepair(findingId);
    if (!result.ok) {
      if (promptEl && result.message) {
        promptEl.textContent = result.message;
        promptEl.classList.add('show');
      }
      return;
    }
    window.dispatchEvent(new CustomEvent('riskmulate:hands-interact', {
      detail: { kind: 'fix', findingId, verb: result.verb },
    }));
    if (promptEl) {
      promptEl.textContent = `CONTROLLED · ${result.verb}`;
      promptEl.classList.add('show');
    }
    syncFixReadyClass();
  }

  mobileFix?.addEventListener('click', (event) => {
    event.preventDefault();
    doFix();
  });

  addEventListener('keydown', (event) => {
    if (event.code === 'KeyF' && !event.repeat) {
      doFix();
    }
  });

  window.addEventListener('riskmulate:progress', () => syncFixReadyClass());
  window.addEventListener('riskmulate:field-repair', () => syncFixReadyClass());
  setInterval(syncFixReadyClass, 350);

  const tabletBody = document.querySelector('#tabletBody');
  if (tabletBody) {
    const observer = new MutationObserver(() => {
      if (tabletBody.querySelector('.field-fix-cta')) return;
      if (!tabletBody.querySelector('.evidence-card h3')) return;
      const progress = progressFromStorage();
      const inspected = Array.isArray(progress.inspectedFindingIds) ? progress.inspectedFindingIds : [];
      for (const findingId of inspected) {
        if (!isFindingFixable(findingId, progress)) continue;
        const repair = getRepairForFinding(findingId);
        if (!repair) continue;
        const coarse = matchMedia('(pointer: coarse)').matches;
        const cta = document.createElement('div');
        cta.className = 'field-fix-cta';
        cta.innerHTML = `<strong>Field control available</strong><span>Return to this equipment and press <kbd>${coarse ? 'FIX' : 'F'}</kbd> to ${repair.verb.toLowerCase()}. Treatment happens at the plant — not only on the tablet.</span>`;
        tabletBody.querySelector('.evidence-card')?.appendChild(cta);
        break;
      }
    });
    observer.observe(tabletBody, { childList: true, subtree: true });
  }

  // High-vis glove tint after procedural hands boot (does not require hands.js rewrite).
  window.addEventListener('riskmulate:hands-ready', () => {
    const overlay = window.RiskMulateHands?.overlay;
    if (!overlay?.root) return;
    overlay.root.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const mat = object.material;
      // Dark glove-like materials only.
      if (mat.color && mat.color.getHex && mat.color.getHex() <= 0x30393d) {
        mat.color.setHex(0xd4a24a);
        if ('emissive' in mat && mat.emissive?.setHex) mat.emissive.setHex(0x5a3a12);
        mat.needsUpdate = true;
      }
    });
  });

  const api = { installed: true, doFix, syncFixReadyClass, resolveActiveFindingId };
  window.RiskMulateFieldFixInteraction = api;
  return api;
}
