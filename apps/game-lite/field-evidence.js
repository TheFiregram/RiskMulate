import { buildEmergencyResponseStation } from './emergency-response-station.js';

function makeMaterials(THREE) {
  return {
    steel: new THREE.MeshStandardMaterial({ color: 0x4b5356, roughness: 0.72, metalness: 0.5 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x262d30, roughness: 0.8, metalness: 0.48 }),
    rust: new THREE.MeshStandardMaterial({ color: 0x7a3f24, roughness: 0.95, metalness: 0.08 }),
    freshWear: new THREE.MeshStandardMaterial({ color: 0xb4aaa0, roughness: 0.62, metalness: 0.45 }),
    scorch: new THREE.MeshStandardMaterial({ color: 0x1c1b19, roughness: 1, metalness: 0, transparent: true, opacity: 0.74 }),
    conduit: new THREE.MeshStandardMaterial({ color: 0x5b6365, roughness: 0.68, metalness: 0.55 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x161a1b, roughness: 0.96, metalness: 0.01 }),
    stain: new THREE.MeshStandardMaterial({ color: 0x33251c, roughness: 1, metalness: 0, transparent: true, opacity: 0.58 }),
    debris: new THREE.MeshStandardMaterial({ color: 0x51493c, roughness: 1, metalness: 0 }),
    warning: new THREE.MeshStandardMaterial({ color: 0xc88924, emissive: 0x5d2b04, emissiveIntensity: 0.36, roughness: 0.55 }),
    pallet: new THREE.MeshStandardMaterial({ color: 0x705038, roughness: 0.96, metalness: 0 }),
  };
}

function addBox(THREE, group, size, material, position, rotation = [0, 0, 0]) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  group.add(object);
  return object;
}

function addCylinder(THREE, group, radius, length, material, position, axis = 'y', segments = 12) {
  const object = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material);
  if (axis === 'x') object.rotation.z = Math.PI / 2;
  if (axis === 'z') object.rotation.x = Math.PI / 2;
  object.position.set(...position);
  group.add(object);
  return object;
}

function addHitVolume(THREE, group, size, position = [0, 0, 0]) {
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hit.position.set(...position);
  hit.userData.hitVolume = true;
  group.add(hit);
  return hit;
}

function makeFindingRoot(THREE, scene, findingId, label, position) {
  const root = new THREE.Group();
  root.position.set(...position);
  root.userData.interactable = true;
  root.userData.findingId = findingId;
  root.userData.label = label;
  root.userData.fieldFinding = true;
  scene.add(root);
  return root;
}

function createDamagedSupport(THREE, scene, materials) {
  const root = makeFindingRoot(THREE, scene, 'support-vibration', 'Inspect damaged pipe support', [0, 0, -7.6]);

  const wear = new THREE.Mesh(new THREE.TorusGeometry(0.266, 0.012, 6, 18, Math.PI * 0.72), materials.freshWear);
  wear.rotation.y = Math.PI / 2;
  wear.rotation.x = -0.28;
  wear.position.set(0.04, 2.04, 0);
  root.add(wear);

  const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 7, 20, Math.PI * 0.82), materials.darkSteel);
  clamp.rotation.y = Math.PI / 2;
  clamp.rotation.x = 0.72;
  clamp.position.set(0.08, 2.12, 0.04);
  root.add(clamp);

  addCylinder(THREE, root, 0.035, 0.46, materials.rust, [0.15, 1.6, 0.23], 'y', 8);
  addBox(THREE, root, [0.12, 0.045, 0.08], materials.darkSteel, [0.15, 1.39, 0.23], [0, 0, 0.2]);
  addHitVolume(THREE, root, [1.25, 1.55, 1.2], [0, 2.0, 0]);
  return root;
}

function createElectricalFault(THREE, scene, materials) {
  const root = makeFindingRoot(THREE, scene, 'electrical-panel', 'Inspect damaged electrical entry', [10.7, 0, 6.64]);

  const scorch = new THREE.Mesh(new THREE.CircleGeometry(0.34, 14), materials.scorch);
  scorch.position.set(0.82, 1.78, 0.19);
  root.add(scorch);

  addCylinder(THREE, root, 0.035, 0.65, materials.conduit, [0.82, 1.27, 0.26], 'y', 10);
  const broken = addCylinder(THREE, root, 0.035, 0.42, materials.conduit, [0.9, 0.78, 0.31], 'y', 10);
  broken.rotation.z = -0.28;
  addCylinder(THREE, root, 0.018, 0.28, materials.cable, [0.96, 0.58, 0.33], 'y', 8);

  const warning = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), materials.warning);
  warning.position.set(0.79, 1.98, 0.23);
  root.add(warning);

  addHitVolume(THREE, root, [1.45, 2.2, 0.9], [0.65, 1.2, 0.25]);
  return root;
}

function createStormDrainFinding(THREE, scene, materials) {
  const root = makeFindingRoot(THREE, scene, 'storm-drain', 'Inspect stained process drain', [2.4, 0, -2.5]);

  const stain = new THREE.Mesh(new THREE.CircleGeometry(0.82, 18), materials.stain);
  stain.rotation.x = -Math.PI / 2;
  stain.scale.set(1.7, 0.72, 1);
  stain.position.set(-0.15, 0.075, 0.18);
  root.add(stain);

  for (let i = -4; i <= 4; i += 1) {
    addBox(THREE, root, [0.05, 0.045, 0.48], materials.steel, [i * 0.13, 0.105, 0]);
  }
  addBox(THREE, root, [1.22, 0.04, 0.05], materials.darkSteel, [0, 0.11, -0.22]);
  addBox(THREE, root, [1.22, 0.04, 0.05], materials.darkSteel, [0, 0.11, 0.22]);

  for (const [x, z, s] of [[-0.33, 0.03, 0.12], [0.18, -0.08, 0.09], [0.42, 0.11, 0.08]]) {
    const debris = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), materials.debris);
    debris.position.set(x, 0.16, z);
    debris.rotation.set(x * 2, z * 3, x - z);
    root.add(debris);
  }

  addHitVolume(THREE, root, [2.0, 0.8, 1.4], [0, 0.32, 0]);
  return root;
}

function createAccessObstruction(THREE, scene, materials) {
  const root = makeFindingRoot(THREE, scene, 'access-obstruction', 'Inspect service-route obstruction', [12.25, 0, 9.9]);

  for (const z of [-0.36, -0.12, 0.12, 0.36]) {
    addBox(THREE, root, [1.55, 0.055, 0.1], materials.pallet, [0, 0.12, z]);
  }
  for (const x of [-0.58, 0, 0.58]) {
    addBox(THREE, root, [0.12, 0.1, 0.92], materials.pallet, [x, 0.055, 0]);
  }
  for (let i = 0; i < 5; i += 1) {
    addCylinder(THREE, root, 0.035, 1.72, materials.conduit, [0, 0.25 + (i % 2) * 0.075, -0.3 + i * 0.15], 'x', 12);
  }
  addBox(THREE, root, [0.04, 0.025, 0.8], materials.darkSteel, [-0.42, 0.35, 0]);
  addBox(THREE, root, [0.04, 0.025, 0.8], materials.darkSteel, [0.42, 0.35, 0]);
  addHitVolume(THREE, root, [2.2, 1.0, 1.45], [0, 0.4, 0]);
  return root;
}

function createCosmeticRust(THREE, scene, materials) {
  const root = makeFindingRoot(THREE, scene, 'cosmetic-rust', 'Inspect tank discoloration', [14.5, 4.45, -9.86]);

  for (const [x, y, radius] of [[-0.28, 0.14, 0.22], [0.08, -0.08, 0.17], [0.31, 0.1, 0.13], [-0.04, 0.28, 0.11]]) {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(radius, 12), materials.rust);
    patch.position.set(x, y, 0);
    patch.scale.y = 0.62;
    root.add(patch);
  }
  addHitVolume(THREE, root, [1.45, 1.25, 0.75], [0, 0, 0.05]);
  return root;
}

export function buildFieldEvidence(THREE, scene) {
  const materials = makeMaterials(THREE);

  // Existing emergency controls make the process yard read like an operated facility,
  // not a collection of hazards. The station remains a control, not a scored finding.
  buildEmergencyResponseStation(THREE, scene, {
    x: 6.5,
    y: 0,
    z: -3.35,
    rotationY: 0,
  });

  return [
    createDamagedSupport(THREE, scene, materials),
    createElectricalFault(THREE, scene, materials),
    createStormDrainFinding(THREE, scene, materials),
    createAccessObstruction(THREE, scene, materials),
    createCosmeticRust(THREE, scene, materials),
  ];
}
