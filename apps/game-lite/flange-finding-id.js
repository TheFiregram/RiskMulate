/**
 * Flange findingId stamp
 * ---------------------
 * Class-ready: ensure leaking flange meshes carry findingId = 'flange-leak'
 * so field FIX raycast, plant response indexing, and residual feedback
 * share one consistent key without rewriting the core flanges module.
 */

function stamp(scene) {
  if (!scene) return 0;
  let count = 0;
  scene.traverse((object) => {
    if (!object?.userData) return;
    if (object.userData.leaking || (object.userData.flange && String(object.userData.label || '').toLowerCase().includes('leak'))) {
      if (object.userData.findingId !== 'flange-leak') {
        object.userData.findingId = 'flange-leak';
        count += 1;
      }
      if (object.userData.interactable == null) object.userData.interactable = true;
    }
  });
  return count;
}

export function installFlangeFindingId() {
  if (window.RiskMulateFlangeFindingId?.installed) {
    return window.RiskMulateFlangeFindingId;
  }

  const tryStamp = () => {
    const scene = window.RiskMulateScene?.scene;
    if (!scene) return false;
    stamp(scene);
    return true;
  };

  tryStamp();
  window.addEventListener('riskmulate:scene-ready', () => tryStamp());
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (tryStamp() || attempts > 40) clearInterval(timer);
  }, 400);

  const api = { installed: true, stamp: () => stamp(window.RiskMulateScene?.scene) };
  window.RiskMulateFlangeFindingId = api;
  return api;
}
