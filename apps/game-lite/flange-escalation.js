/**
 * Flange leak escalation visuals
 * ------------------------------
 * Educational purpose: untreated initiating events worsen the physical pathway
 * while the student delays field treatment (ISO 31000 continuous monitoring).
 */

let intensity = 1;

export function setFlangeLeakIntensity(multiplier = 1) {
  intensity = Math.max(0.2, Math.min(2.4, Number(multiplier) || 1));
  const scene = window.RiskMulateScene?.scene;
  if (!scene) return intensity;

  scene.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    if (object.userData?.leakDrop) {
      object.visible = true;
      object.material.opacity = Math.min(1, 0.55 + intensity * 0.28);
      object.material.needsUpdate = true;
    }
    if (object.userData?.leakStain) {
      object.material.opacity = Math.min(0.95, 0.55 + intensity * 0.18);
      object.material.needsUpdate = true;
    }
    let node = object;
    while (node) {
      if (node.userData?.leaking && node.userData?.interactable && intensity > 1.15 && !node.userData.controlled) {
        node.userData.label = 'Worsening flange leak \u2014 apply field isolation';
        break;
      }
      node = node.parent;
    }
  });
  return intensity;
}

export function getFlangeLeakIntensity() {
  return intensity;
}

export function installFlangeEscalation() {
  if (window.RiskMulateFlangeEscalation?.installed) return window.RiskMulateFlangeEscalation;
  window.addEventListener('riskmulate:timed-event', (event) => {
    if (event.detail?.findingId === 'flange-leak') setFlangeLeakIntensity(1.85);
  });
  window.addEventListener('riskmulate:field-repair', (event) => {
    if (event.detail?.findingId === 'flange-leak') setFlangeLeakIntensity(1);
  });
  const api = { installed: true, setFlangeLeakIntensity, getFlangeLeakIntensity };
  window.RiskMulateFlangeEscalation = api;
  return api;
}
