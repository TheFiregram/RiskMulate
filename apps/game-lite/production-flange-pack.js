let installed = false;
let upgradedCount = 0;

function mark(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.productionHardware = true;
  return mesh;
}

function orientAlongX(object) {
  object.rotation.z = Math.PI / 2;
  return object;
}

function addCylinder(THREE, parent, radius, length, material, position, segments = 18) {
  const mesh = mark(new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, segments),
    material,
  ));
  orientAlongX(mesh);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addRing(THREE, parent, radius, tube, material, position, radialSegments = 8, tubularSegments = 24) {
  const ring = mark(new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments),
    material,
  ));
  ring.rotation.y = Math.PI / 2;
  ring.position.set(...position);
  parent.add(ring);
  return ring;
}

function addBox(THREE, parent, size, material, position, rotation = [0, 0, 0]) {
  const mesh = mark(new THREE.Mesh(new THREE.BoxGeometry(...size), material));
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function makeMaterials(THREE) {
  return {
    forgedSteel: new THREE.MeshStandardMaterial({
      color: 0x4b4743,
      roughness: 0.66,
      metalness: 0.66,
    }),
    darkSteel: new THREE.MeshStandardMaterial({
      color: 0x302e2c,
      roughness: 0.74,
      metalness: 0.58,
    }),
    machined: new THREE.MeshStandardMaterial({
      color: 0x756f68,
      roughness: 0.48,
      metalness: 0.76,
    }),
    bolt: new THREE.MeshStandardMaterial({
      color: 0x363330,
      roughness: 0.62,
      metalness: 0.72,
    }),
    tag: new THREE.MeshStandardMaterial({
      color: 0xb89b48,
      roughness: 0.68,
      metalness: 0.32,
    }),
    leakWitness: new THREE.MeshStandardMaterial({
      color: 0x5e301c,
      roughness: 0.96,
      metalness: 0.04,
      transparent: true,
      opacity: 0.62,
    }),
  };
}

function addBoltCaps(THREE, parent, materials) {
  const boltRadius = 0.39;
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const y = Math.cos(angle) * boltRadius;
    const z = Math.sin(angle) * boltRadius;

    for (const x of [-0.323, 0.323]) {
      addCylinder(THREE, parent, 0.071, 0.065, materials.bolt, [x, y, z], 6);
      addRing(THREE, parent, 0.064, 0.012, materials.machined, [x * 0.91, y, z], 5, 10);
    }
  }
}

function addEquipmentTag(THREE, parent, materials, leaking) {
  addCylinder(THREE, parent, 0.012, 0.42, materials.darkSteel, [0.06, 0.48, 0.03], 7)
    .rotation.z += 0.22;
  const tag = addBox(
    THREE,
    parent,
    [0.24, 0.13, 0.026],
    materials.tag,
    [0.105, 0.67, 0.03],
    [0, 0, -0.08],
  );
  tag.userData.equipmentTag = leaking ? 'FLG-LK-01' : 'FLG';
}

function buildHighDetail(THREE, materials, leaking) {
  const group = new THREE.Group();
  group.userData.productionFlangeLevel = 'high';

  for (const side of [-1, 1]) {
    addCylinder(THREE, group, 0.342, 0.19, materials.forgedSteel, [side * 0.39, 0, 0], 22);
    addCylinder(THREE, group, 0.405, 0.17, materials.darkSteel, [side * 0.235, 0, 0], 22);
    addRing(THREE, group, 0.49, 0.032, materials.machined, [side * 0.095, 0, 0], 8, 28);
    addRing(THREE, group, 0.286, 0.018, materials.darkSteel, [side * 0.49, 0, 0], 7, 22);
  }

  addRing(THREE, group, 0.432, 0.018, materials.machined, [0, 0, 0], 8, 28);
  addBoltCaps(THREE, group, materials);
  addEquipmentTag(THREE, group, materials, leaking);

  if (leaking) {
    const witness = addBox(
      THREE,
      group,
      [0.03, 0.42, 0.12],
      materials.leakWitness,
      [0.015, -0.38, 0.255],
      [0.05, 0.08, 0.03],
    );
    witness.userData.leakWitness = true;
  }

  return group;
}

function buildLowDetail(THREE, materials) {
  const group = new THREE.Group();
  group.userData.productionFlangeLevel = 'low';

  for (const side of [-1, 1]) {
    addCylinder(THREE, group, 0.39, 0.18, materials.forgedSteel, [side * 0.23, 0, 0], 14);
    addRing(THREE, group, 0.485, 0.028, materials.darkSteel, [side * 0.095, 0, 0], 6, 16);
  }
  return group;
}

function upgradeFlange(THREE, group, materials) {
  if (!group?.userData?.flange || group.userData.productionFlangePack) return;

  const leaking = String(group.userData.label || '').toLowerCase().includes('leak');
  const lod = new THREE.LOD();
  lod.userData.productionHardware = true;
  lod.addLevel(buildHighDetail(THREE, materials, leaking), 0);
  lod.addLevel(buildLowDetail(THREE, materials), 18);
  lod.autoUpdate = true;
  group.add(lod);

  group.userData.productionFlangePack = true;
  group.userData.hardwareLodDistance = 18;
  upgradedCount += 1;

  if (typeof window !== 'undefined') {
    window.RiskMulateHardware = {
      installed: true,
      upgradedFlanges: upgradedCount,
      lodDistance: 18,
    };
  }
}

export function installProductionFlangePack(THREE) {
  if (installed) return;
  installed = true;

  const materials = makeMaterials(THREE);
  const originalAdd = THREE.Scene.prototype.add;

  THREE.Scene.prototype.add = function addWithProductionHardware(...objects) {
    for (const object of objects) upgradeFlange(THREE, object, materials);
    return originalAdd.apply(this, objects);
  };

  if (typeof window !== 'undefined') {
    window.RiskMulateHardware = {
      installed: true,
      upgradedFlanges: 0,
      lodDistance: 18,
    };
  }
}
