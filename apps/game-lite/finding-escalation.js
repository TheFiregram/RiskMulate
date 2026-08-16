/**
 * Multi-finding visual escalation
 * -------------------------------
 * Educational purpose (ISO 31000 continuous monitoring):
 * Untreated initiating events worsen the physical pathway while the student
 * delays field treatment. Escalation is visual + label pressure, not a score
 * gimmick — residual likelihood rises with time on open pathways.
 */

const ESCALATED = new Set();

function escalateFinding(findingId, multiplier = 1.6) {
  const scene = window.RiskMulateScene?.scene;
  const THREE = window.RiskMulateScene?.THREE;
  if (!scene || !THREE || !findingId) return false;

  let touched = false;
  scene.traverse((object) => {
    const id = object.userData?.findingId;
    if (id !== findingId) return;
    touched = true;

    if (!object.userData.controlled) {
      const base = object.userData.label || object.userData.prompt || findingId;
      if (!String(base).includes('Worsening')) {
        object.userData.label = `Worsening — ${base}`;
      }
    }

    object.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mat = child.material;
      if (mat.emissive && typeof mat.emissive.setHex === 'function') {
        mat.emissive.setHex(0x5a2a08);
        mat.emissiveIntensity = Math.min(0.85, 0.25 + multiplier * 0.22);
        mat.needsUpdate = true;
      }
      if (child.userData?.leakDrop || child.userData?.leakStain) {
        mat.transparent = true;
        mat.opacity = Math.min(1, 0.5 + multiplier * 0.25);
        mat.needsUpdate = true;
      }
      if (child.userData?.escalationMarker || child.name?.includes('marker')) {
        const s = 1 + Math.min(0.35, (multiplier - 1) * 0.4);
        child.scale.setScalar(s);
      }
    });
  });

  if (touched) ESCALATED.add(findingId);
  return touched;
}

function clearEscalation(findingId) {
  const scene = window.RiskMulateScene?.scene;
  if (!scene || !findingId) return;
  ESCALATED.delete(findingId);
  scene.traverse((object) => {
    if (object.userData?.findingId !== findingId) return;
    object.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mat = child.material;
      if (mat.emissive && typeof mat.emissive.setHex === 'function') {
        mat.emissiveIntensity = 0.05;
        mat.needsUpdate = true;
      }
    });
  });
}

export function installFindingEscalation() {
  if (window.RiskMulateFindingEscalation?.installed) {
    return window.RiskMulateFindingEscalation;
  }

  window.addEventListener('riskmulate:timed-escalation', (event) => {
    const findingId = event.detail?.findingId;
    if (!findingId) return;
    escalateFinding(findingId, 1.7);
  });

  window.addEventListener('riskmulate:timed-event', (event) => {
    const findingId = event.detail?.findingId;
    if (!findingId) return;
    escalateFinding(findingId, 1.7);
  });

  window.addEventListener('riskmulate:field-repair', (event) => {
    const findingId = event.detail?.findingId;
    if (findingId) clearEscalation(findingId);
  });

  const api = {
    installed: true,
    escalateFinding,
    clearEscalation,
    isEscalated: (id) => ESCALATED.has(id),
  };
  window.RiskMulateFindingEscalation = api;
  return api;
}
