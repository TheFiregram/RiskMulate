/**
 * Field FIX interaction patch
 * --------------------------
 * Educational purpose: after inspection + recording, the student returns to the
 * equipment and applies a control with hands on the pathway (F / Fix button).
 * This module patches the live interaction loop if game.js has not yet integrated
 * field repairs natively.
 */
import {
  applyFieldRepair,
  getRepairForFinding,
  isFindingFixable,
  isFindingFixed,
} from './field-repair.js';

export function installFieldFixInteraction() {
  if (window.RiskMulateFieldFixInteraction?.installed) {
    return window.RiskMulateFieldFixInteraction;
  }

  const promptEl = document.querySelector('#prompt');
  const mobileFix = document.querySelector('#mobileFix');

  // Free joystick → movement bridge.
  // game.js stores mobileMove in a closure; when the bridge is absent we map stick
  // deflection onto synthetic WASD key events so the existing movePlayer path works.
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
  if (!window.RiskMulateMobileMove) {
    let x = 0;
    let y = 0;
    window.RiskMulateMobileMove = {
      set(nx, ny) {
        x = nx || 0;
        y = ny || 0;
        window.__riskmulateMoveX = x;
        window.__riskmulateMoveY = y;
        const dead = 0.28;
        syncKey('KeyW', y < -dead);
        syncKey('KeyS', y > dead);
        syncKey('KeyA', x < -dead);
        syncKey('KeyD', x > dead);
        window.dispatchEvent(new CustomEvent('riskmulate:mobile-move', { detail: { x, y } }));
      },
      get() {
        return { x, y };
      },
    };
  }

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

  function resolveActiveFindingId() {
    const exposed = window.RiskMulateInteraction?.activeInteractable?.userData?.findingId;
    if (exposed) return exposed;
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
    if (ready && promptEl && !document.querySelector('#tablet')?.classList.contains('open')) {
      const repair = getRepairForFinding(findingId);
      const coarse = matchMedia('(pointer: coarse)').matches;
      const verb = repair?.verb || 'Apply field control';
      if (promptEl.classList.contains('show')) {
        promptEl.textContent = coarse ? `FIX \u00b7 ${verb}` : `F \u00b7 ${verb}`;
      }
    }
  }

  function doFix() {
    const findingId = resolveActiveFindingId();
    if (!findingId) {
      if (promptEl) {
        promptEl.textContent = 'Inspect equipment first, then return to apply field control';
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
  setInterval(syncFixReadyClass, 400);

  const tabletBody = document.querySelector('#tabletBody');
  if (tabletBody) {
    const observer = new MutationObserver(() => {
      if (tabletBody.querySelector('.field-fix-cta')) return;
      const heading = tabletBody.querySelector('.evidence-card h3');
      if (!heading) return;
      const progress = progressFromStorage();
      const inspected = Array.isArray(progress.inspectedFindingIds) ? progress.inspectedFindingIds : [];
      for (const findingId of inspected) {
        if (!isFindingFixable(findingId, progress)) continue;
        const repair = getRepairForFinding(findingId);
        if (!repair) continue;
        const coarse = matchMedia('(pointer: coarse)').matches;
        const cta = document.createElement('div');
        cta.className = 'field-fix-cta';
        cta.innerHTML = `<strong>Field control available</strong><span>Return to this equipment and press <kbd>${coarse ? 'FIX' : 'F'}</kbd> to ${repair.verb.toLowerCase()}. Treatment happens at the plant \u2014 not only on the tablet.</span>`;
        const card = tabletBody.querySelector('.evidence-card');
        card?.appendChild(cta);
        break;
      }
    });
    observer.observe(tabletBody, { childList: true, subtree: true });
  }

  const api = { installed: true, doFix, syncFixReadyClass };
  window.RiskMulateFieldFixInteraction = api;
  return api;
}
