/**
 * Rear gate / admin apron environment
 * -----------------------------------
 * Fills the empty positive-Z side behind spawn (player starts at z≈15 looking −Z).
 * Industrial gate house, service road, fencing, and yard props so a 180° turn
 * still reads as a working facility — not an empty skybox edge.
 */

function mat(THREE, color, roughness = 0.86, metalness = 0.12) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function box(THREE, parent, w, h, d, material, x, y, z, ry = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cyl(THREE, parent, rTop, rBot, h, material, x, y, z, segments = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildRearGate(THREE, scene) {
  if (scene.getObjectByName('rear-gate-environment')) return null;

  const group = new THREE.Group();
  group.name = 'rear-gate-environment';
  group.userData.assetType = 'rear-gate-environment';

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

  box(THREE, group, 42, 0.04, 7.5, asphalt, 0, 0.02, 21.5);
  box(THREE, group, 42, 0.015, 0.18, stripe, 0, 0.045, 21.5);

  box(THREE, group, 5.2, 3.1, 4.0, brick, -11.5, 1.55, 22.8);
  box(THREE, group, 5.5, 0.28, 4.3, roof, -11.5, 3.25, 22.8);
  box(THREE, group, 1.8, 1.4, 0.08, glass, -11.5, 1.9, 20.85);
  box(THREE, group, 0.9, 2.1, 0.08, metalDark, -13.4, 1.15, 20.85);
  box(THREE, group, 3.2, 0.1, 1.6, metal, -11.5, 2.85, 20.4);
  cyl(THREE, group, 0.06, 0.06, 2.7, metalDark, -12.8, 1.35, 20.4);
  cyl(THREE, group, 0.06, 0.06, 2.7, metalDark, -10.2, 1.35, 20.4);

  cyl(THREE, group, 0.14, 0.14, 1.15, yellow, -6.2, 0.58, 20.2, 10);
  cyl(THREE, group, 0.14, 0.14, 1.15, yellow, 6.2, 0.58, 20.2, 10);
  const boom = box(THREE, group, 11.6, 0.12, 0.12, yellow, 0, 1.15, 20.2);
  boom.rotation.z = -0.08;

  for (let i = -10; i <= 10; i += 1) {
    const x = i * 2.4;
    if (Math.abs(x) < 7) continue;
    cyl(THREE, group, 0.05, 0.05, 2.4, metalDark, x, 1.2, 25.2, 8);
    box(THREE, group, 2.35, 0.04, 0.04, metal, x + 1.15, 2.25, 25.2);
    box(THREE, group, 2.35, 0.04, 0.04, metal, x + 1.15, 1.35, 25.2);
    box(THREE, group, 2.35, 0.04, 0.04, metal, x + 1.15, 0.55, 25.2);
  }

  box(THREE, group, 8.5, 3.6, 5.5, concreteDark, 14.5, 1.8, 22.5);
  box(THREE, group, 8.9, 0.3, 5.9, roof, 14.5, 3.7, 22.5);
  box(THREE, group, 2.4, 2.6, 0.12, metalDark, 14.5, 1.4, 19.8);
  box(THREE, group, 6.0, 0.55, 2.2, concrete, 14.5, 0.28, 19.2);

  for (const x of [-16, -4, 4, 16]) {
    cyl(THREE, group, 0.08, 0.1, 5.2, metalDark, x, 2.6, 18.8, 8);
    box(THREE, group, 0.9, 0.12, 0.35, yellow, x, 5.15, 18.8);
  }

  box(THREE, group, 4.8, 2.0, 2.2, metal, -17.5, 1.15, 19.5);
  box(THREE, group, 1.6, 1.1, 2.15, metalDark, -20.2, 1.4, 19.5);
  cyl(THREE, group, 0.42, 0.42, 0.35, metalDark, -16.2, 0.42, 18.6, 12);
  cyl(THREE, group, 0.42, 0.42, 0.35, metalDark, -16.2, 0.42, 20.4, 12);
  cyl(THREE, group, 0.42, 0.42, 0.35, metalDark, -18.8, 0.42, 18.6, 12);
  cyl(THREE, group, 0.42, 0.42, 0.35, metalDark, -18.8, 0.42, 20.4, 12);

  for (const [x, z] of [[8.5, 18.2], [9.8, 18.5], [8.9, 19.4]]) {
    box(THREE, group, 1.1, 0.95, 1.1, mat(THREE, 0x7a5a3a, 0.95, 0.02), x, 0.48, z);
  }
  for (const [x, z] of [[-3.2, 18.0], [-2.1, 18.3]]) {
    cyl(THREE, group, 0.38, 0.38, 1.05, mat(THREE, 0x3d6b4f, 0.7, 0.25), x, 0.55, z, 14);
  }

  box(THREE, group, 3.5, 0.02, 0.35, yellow, 0, 0.05, 19.6);
  box(THREE, group, 0.35, 0.02, 2.8, yellow, -2.0, 0.05, 20.8);
  box(THREE, group, 0.35, 0.02, 2.8, yellow, 2.0, 0.05, 20.8);
  box(THREE, group, 2.8, 0.02, 0.55, stripe, 0, 0.05, 17.8);

  scene.add(group);
  return group;
}

export function installRearGateEnvironment(THREE) {
  if (window.RiskMulateRearGate?.installed) return window.RiskMulateRearGate;

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    const scene = window.RiskMulateScene?.scene;
    const T = window.RiskMulateScene?.THREE || THREE;
    if (scene) {
      buildRearGate(T, scene);
      clearInterval(timer);
    } else if (attempts > 40) {
      clearInterval(timer);
    }
  }, 250);

  const api = { installed: true };
  window.RiskMulateRearGate = api;
  return api;
}
