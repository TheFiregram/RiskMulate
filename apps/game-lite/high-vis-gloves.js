/**
 * High-visibility industrial work gloves
 * --------------------------------------
 * Tints procedural first-person glove meshes to readable yellow-orange so
 * field interaction reads clearly on mobile and desktop.
 */

const GLOVE = 0xd4a24a;
const EMISSIVE = 0x5a3a12;

function tint(root) {
  if (!root) return 0;
  let count = 0;
  root.traverse((object) => {
    if (!object.isMesh || !object.material?.color?.getHex) return;
    const hex = object.material.color.getHex();
    if (hex <= 0x404850) {
      object.material.color.setHex(GLOVE);
      if (object.material.emissive?.setHex) object.material.emissive.setHex(EMISSIVE);
      object.material.needsUpdate = true;
      count += 1;
    }
  });
  return count;
}

export function installHighVisGloves() {
  if (window.RiskMulateHighVisGloves?.installed) return window.RiskMulateHighVisGloves;

  const apply = () => {
    const overlay = window.RiskMulateHands?.overlay;
    if (overlay?.root) tint(overlay.root);
  };

  window.addEventListener('riskmulate:hands-ready', apply);
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    apply();
    if (attempts > 24) clearInterval(timer);
  }, 400);

  const api = { installed: true, apply };
  window.RiskMulateHighVisGloves = api;
  return api;
}
