/**
 * Rear gate / admin apron environment
 * -----------------------------------
 * Fills the empty positive-Z side behind spawn (player starts at z≈15 looking −Z).
 * Built only after RiskMulateScene is live so mobile (slow module load) still gets it.
 */

function mat(THREE, color, roughness = 0.86, metalness = 0.12) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function box(THREE, parent, w, h, d, material, x, y, z, ry = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  parent.add(mesh);
  return mesh;
}

function cyl(THREE, parent, rTop, rBot, h, material, x, y, z, segments = 10) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildRearGate(THREE, scene) {
  if (scene.getObjectByName('rear-gate-environment')) return scene.getObjectByName('rear-gate-environment');

  const group = new THREE.Group();
  group.name = 'rear-gate-environment';
  group.userData.assetType = 'rear-gate-environment';
  group.userData.visualOnly = true;

  const concrete = mat(THREE, 0x6a7074, 0.94, 0.04);
  const concreteDark = mat(THREE, 0x4e5559, 0.92, 0.05);
  const metal = mat(THREE, 0x5a6469, 0.62, 0.42);
  const metalDark = mat(THREE, 0x2f383c, 0.7, 0.5);
  const yellow = mat(THREE, 0xc9a329, 0.72, 0.18);
  const brick = mat(THREE, 0x6b5548, 0.9, 0.06);
  const roof = mat(THREE, 0x343d43, 0.8, 0.2);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x7a9aaa,
    roughness: 0.22,
    metalness: 0.15,
    transparent: true,
    opacity: 0.55,
  });
  const asphalt = mat(THREE, 0x2a2c2e, 0.98, 0.02);
  const stripe = mat(THREE, 0xd8d2c4, 0.9, 0.02);

  // Closer apron so it reads clearly from spawn on mobile FOV
  box(THREE, group, 42, 0.04, 8.2, asphalt, 0, 0.02, 20.8);
  box(THREE, group, 42, 0.015, 0.18, stripe, 0, 0.045, 20.8);

  box(THREE, group, 5.2, 3.1, 4.0, brick, -11.5, 1.55, 22.0);
  box(THREE, group, 5.5, 0.28, 4.3, roof, -11.5, 3.25, 22.0);
  box(THREE, group, 1.8, 1.4, 0.08, glass, -11.5, 1.9, 20.05);
  box(THREE, group, 0.9, 2.1, 0.08, metalDark, -13.4, 1.15, 20.05);
  box(THREE, group, 3.2, 0.1, 1.6, metal, -11.5, 2.85, 19.6);
  cyl(THREE, group, 0.06, 0.06, 2.7, metalDark, -12.8, 1.35, 19.6);
  cyl(THREE, group, 0.06, 0.06, 2.7, metalDark, -10.2, 1.35, 19.6);

  cyl(THREE, group, 0.14, 0.14, 1.15, yellow, -6.2, 0.58, 19.4, 10);
  cyl(THREE, group, 0.14, 0.14, 1.15, yellow, 6.2, 0.58, 19.4, 10);
  const boom = box(THREE, group, 11.6, 0.12, 0.12, yellow, 0, 1.15, 19.4);
  boom.rotation.z = -0.08;

  for (let i = -10; i <= 10; i += 1) {
    const x = i * 2.4;
    if (Math.abs(x) < 7) continue;
    cyl(THREE, group, 0.05, 0.05, 2.4, metalDark, x, 1.2, 24.6, 8);
    box(THREE, group, 2.35, 0.04, 0.04, metal, x + 1.15, 2.25, 24.6);
    box(THREE, group, 2.35, 0.04, 0.04, metal, x + 1.15, 1.35, 24.6);
    box(THREE, group, 2.35, 0.04, 0.04, metal, x + 1.15, 0.55, 24.6);
  }

  box(THREE, group, 8.5, 3.6, 5.5, concreteDark, 14.5, 1.8, 21.8);
  box(THREE, group, 8.9, 0.3, 5.9, roof, 14.5, 3.7, 21.8);
  box(THREE, group, 2.4, 2.6, 0.12, metalDark, 14.5, 1.4, 19.1);
  box(THREE, group, 6.0, 0.55, 2.2, concrete, 14.5, 0.28, 18.5);

  for (const x of [-16, -4, 4, 16]) {
    cyl(THREE, group, 0.08, 0.1, 5.2, metalDark, x, 2.6, 17.9, 8);
    box(THREE, group, 0.9, 0.12, 0.35, yellow, x, 5.15, 17.9);
  }

  box(THREE, group, 4.8, 2.0, 2.2, metal, -17.5, 1.15, 18.8);
  box(THREE, group, 1.6, 1.1, 2.15, metalDark, -20.2, 1.4, 18.8);
  cyl(THREE, group, 0.42, 0.42, 0.35, metalDark, -16.2, 0.42, 17.9, 12);
  cyl(THREE, group, 0.42, 0.42, 0.35, metalDark, -16.2, 0.42, 19.7, 12);
  cyl(THREE, group, 0.42, 0.42, 0.35, metalDark, -18.8, 0.42, 17.9, 12);
  cyl(THREE, group, 0.42, 0.42, 0.35, metalDark, -18.8, 0.42, 19.7, 12);

  for (const [x, z] of [[8.5, 17.5], [9.8, 17.8], [8.9, 18.7]]) {
    box(THREE, group, 1.1, 0.95, 1.1, mat(THREE, 0x7a5a3a, 0.95, 0.02), x, 0.48, z);
  }
  for (const [x, z] of [[-3.2, 17.3], [-2.1, 17.6]]) {
    cyl(THREE, group, 0.38, 0.38, 1.05, mat(THREE, 0x3d6b4f, 0.7, 0.25), x, 0.55, z, 12);
  }

  box(THREE, group, 3.5, 0.02, 0.35, yellow, 0, 0.05, 18.8);
  box(THREE, group, 0.35, 0.02, 2.8, yellow, -2.0, 0.05, 20.0);
  box(THREE, group, 0.35, 0.02, 2.8, yellow, 2.0, 0.05, 20.0);
  box(THREE, group, 2.8, 0.02, 0.55, stripe, 0, 0.05, 17.0);

  scene.add(group);
  return group;
}

function tryBuild() {
  const scene = window.RiskMulateScene?.scene;
  const THREE = window.RiskMulateScene?.THREE;
  if (!scene || !THREE) return false;
  try {
    buildRearGate(THREE, scene);
    if (window.RiskMulateRearGate) window.RiskMulateRearGate.built = true;
    return true;
  } catch (error) {
    console.warn('[RiskMulate] rear-gate build failed', error);
    return false;
  }
}

export function installRearGateEnvironment() {
  if (window.RiskMulateRearGate?.built) return window.RiskMulateRearGate;

  const api = window.RiskMulateRearGate || { built: false, installed: true };
  window.RiskMulateRearGate = api;

  if (tryBuild()) return api;

  const onReady = () => {
    if (tryBuild()) {
      window.removeEventListener('riskmulate:scene-ready', onReady);
    }
  };
  window.addEventListener('riskmulate:scene-ready', onReady);

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (tryBuild() || attempts > 80) {
      clearInterval(timer);
      window.removeEventListener('riskmulate:scene-ready', onReady);
    }
  }, 200);

  return api;
}
