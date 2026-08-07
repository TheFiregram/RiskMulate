let cachedMaterials;

function getMaterials(THREE) {
  if (cachedMaterials) return cachedMaterials;

  cachedMaterials = {
    concrete: new THREE.MeshStandardMaterial({ color: 0x7d7b73, roughness: 0.96, metalness: 0.02 }),
    concreteDark: new THREE.MeshStandardMaterial({ color: 0x53524d, roughness: 0.98, metalness: 0.01 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x515859, roughness: 0.72, metalness: 0.56 }),
    steelDark: new THREE.MeshStandardMaterial({ color: 0x2b3031, roughness: 0.76, metalness: 0.58 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xcaa630, roughness: 0.88, metalness: 0.04 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x7a5534, roughness: 0.94, metalness: 0.01 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x523823, roughness: 0.96, metalness: 0.01 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x202222, roughness: 0.96, metalness: 0.02 }),
    slab: new THREE.MeshStandardMaterial({ color: 0x55544e, roughness: 1, metalness: 0 }),
    stain: new THREE.MeshStandardMaterial({ color: 0x302f2b, roughness: 1, metalness: 0, transparent: true, opacity: 0.26 }),
  };

  return cachedMaterials;
}

function box(THREE, group, w, h, d, material, x, y, z, rotationY = 0) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  object.position.set(x, y, z);
  object.rotation.y = rotationY;
  group.add(object);
  return object;
}

function cylinder(THREE, group, radius, length, material, x, y, z, axis = 'y', sections = 14) {
  const object = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, sections), material);
  if (axis === 'x') object.rotation.z = Math.PI / 2;
  if (axis === 'z') object.rotation.x = Math.PI / 2;
  object.position.set(x, y, z);
  group.add(object);
  return object;
}

function addWheelStop(THREE, group, materials, x, z, rotationY = 0) {
  const stop = new THREE.Group();
  stop.position.set(x, 0, z);
  stop.rotation.y = rotationY;
  group.add(stop);

  box(THREE, stop, 1.8, 0.12, 0.22, materials.concrete, 0, 0.06, 0);
  box(THREE, stop, 1.62, 0.07, 0.16, materials.concrete, 0, 0.145, 0);
  box(THREE, stop, 0.1, 0.09, 0.225, materials.concreteDark, -0.85, 0.065, 0);
  box(THREE, stop, 0.1, 0.09, 0.225, materials.concreteDark, 0.85, 0.065, 0);
  cylinder(THREE, stop, 0.025, 0.025, materials.steelDark, -0.58, 0.205, 0, 'y', 10);
  cylinder(THREE, stop, 0.025, 0.025, materials.steelDark, 0.58, 0.205, 0, 'y', 10);
}

function addBollard(THREE, group, materials, x, z) {
  const bollard = new THREE.Group();
  bollard.position.set(x, 0, z);
  group.add(bollard);

  box(THREE, bollard, 0.26, 0.035, 0.26, materials.steelDark, 0, 0.0175, 0);
  cylinder(THREE, bollard, 0.075, 0.95, materials.yellow, 0, 0.51, 0, 'y', 18);
  cylinder(THREE, bollard, 0.082, 0.07, materials.steelDark, 0, 0.985, 0, 'y', 18);
  cylinder(THREE, bollard, 0.078, 0.07, materials.steelDark, 0, 0.31, 0, 'y', 18);
  cylinder(THREE, bollard, 0.078, 0.07, materials.steelDark, 0, 0.67, 0, 'y', 18);

  for (const bx of [-0.09, 0.09]) {
    for (const bz of [-0.09, 0.09]) {
      cylinder(THREE, bollard, 0.012, 0.018, materials.steelDark, bx, 0.047, bz, 'y', 10);
    }
  }
}

function addUtilityCover(THREE, group, materials, x, z, rotationY = 0) {
  const cover = new THREE.Group();
  cover.position.set(x, 0.018, z);
  cover.rotation.y = rotationY;
  group.add(cover);

  box(THREE, cover, 1.0, 0.045, 0.76, materials.steelDark, 0, 0.0225, 0);
  box(THREE, cover, 0.9, 0.055, 0.66, materials.steel, 0, 0.0525, 0);
  for (const rx of [-0.34, -0.17, 0, 0.17, 0.34]) {
    box(THREE, cover, 0.035, 0.018, 0.58, materials.steelDark, rx, 0.09, 0);
  }
  for (const rz of [-0.22, 0, 0.22]) {
    box(THREE, cover, 0.78, 0.018, 0.028, materials.steelDark, 0, 0.091, rz);
  }
}

function addDrain(THREE, group, materials, x, z, rotationY = 0) {
  const drain = new THREE.Group();
  drain.position.set(x, 0.01, z);
  drain.rotation.y = rotationY;
  group.add(drain);

  box(THREE, drain, 1.4, 0.055, 0.34, materials.concreteDark, 0, 0.0275, 0);
  box(THREE, drain, 1.28, 0.025, 0.25, materials.steelDark, 0, 0.07, 0);
  for (let i = -6; i <= 6; i += 1) {
    box(THREE, drain, 0.035, 0.025, 0.22, materials.steel, i * 0.097, 0.09, 0);
  }
  box(THREE, drain, 1.26, 0.028, 0.025, materials.steel, 0, 0.09, -0.105);
  box(THREE, drain, 1.26, 0.028, 0.025, materials.steel, 0, 0.09, 0.105);
}

function addCableReel(THREE, group, materials, x, z, rotationY = 0) {
  const reel = new THREE.Group();
  reel.position.set(x, 0, z);
  reel.rotation.y = rotationY;
  group.add(reel);

  cylinder(THREE, reel, 0.055, 0.72, materials.steelDark, 0, 0.45, 0, 'x', 16);
  for (const rx of [-0.31, 0.31]) {
    cylinder(THREE, reel, 0.48, 0.075, materials.wood, rx, 0.45, 0, 'x', 18);
    cylinder(THREE, reel, 0.11, 0.09, materials.woodDark, rx * 1.03, 0.45, 0, 'x', 16);
  }
  cylinder(THREE, reel, 0.3, 0.56, materials.cable, 0, 0.45, 0, 'x', 24);
  box(THREE, reel, 0.28, 0.1, 0.16, materials.woodDark, -0.22, 0.05, 0);
  box(THREE, reel, 0.28, 0.1, 0.16, materials.woodDark, 0.22, 0.05, 0);
}

function addPalletConduit(THREE, group, materials, x, z, rotationY = 0) {
  const pallet = new THREE.Group();
  pallet.position.set(x, 0, z);
  pallet.rotation.y = rotationY;
  group.add(pallet);

  for (let i = -2; i <= 3; i += 1) {
    box(THREE, pallet, 1.2, 0.055, 0.11, materials.wood, 0, 0.16, i * 0.136 - 0.068);
  }
  for (const px of [-0.48, 0, 0.48]) {
    box(THREE, pallet, 0.12, 0.12, 0.86, materials.woodDark, px, 0.075, 0);
  }

  for (const zLevel of [0.245, 0.335]) {
    const offsets = zLevel < 0.3 ? [-0.39, -0.13, 0.13, 0.39] : [-0.3, 0, 0.3];
    for (const conduitZ of offsets) {
      cylinder(THREE, pallet, 0.035, 1.05, materials.steel, 0, zLevel, conduitZ, 'x', 12);
    }
  }

  for (const sx of [-0.32, 0.32]) {
    box(THREE, pallet, 0.035, 0.02, 0.82, materials.steelDark, sx, 0.39, 0);
  }
}

function addKeepClearMarking(THREE, group, materials, centerX, centerZ) {
  const marking = new THREE.Group();
  marking.position.set(centerX, 0.026, centerZ);
  group.add(marking);

  const width = 4.5;
  const depth = 2.8;
  box(THREE, marking, width, 0.012, 0.08, materials.yellow, 0, 0, -depth / 2);
  box(THREE, marking, width, 0.012, 0.08, materials.yellow, 0, 0, depth / 2);
  box(THREE, marking, 0.08, 0.012, depth, materials.yellow, -width / 2, 0, 0);
  box(THREE, marking, 0.08, 0.012, depth, materials.yellow, width / 2, 0, 0);

  for (let i = -4; i <= 4; i += 1) {
    const stripe = box(THREE, marking, 0.08, 0.01, 2.45, materials.yellow, i * 0.48, 0.002, 0, Math.PI / 4);
    stripe.material = materials.yellow;
  }
}

function removeRockPlaceholders(scene) {
  setTimeout(() => {
    const rocks = scene.children.filter((child) => child.geometry?.type === 'DodecahedronGeometry');
    for (const rock of rocks) {
      scene.remove(rock);
      rock.geometry?.dispose?.();
      rock.material?.dispose?.();
    }
  }, 0);
}

export function createServiceYardProps(THREE, scene, options = {}) {
  const {
    buildingX = 10.5,
    buildingBackZ = 6.64,
  } = options;

  const materials = getMaterials(THREE);
  const group = new THREE.Group();
  group.userData.assetType = 'rear-service-yard';

  // Dark maintenance apron behind the electrical-panel wall.
  box(THREE, group, 10.2, 0.018, 8.4, materials.slab, buildingX, 0.019, buildingBackZ + 4.3);

  // Oil/wear patches break up the slab without adding large textures.
  for (const [sx, sz, sw, sd] of [
    [buildingX - 2.9, buildingBackZ + 3.0, 1.3, 0.6],
    [buildingX + 1.8, buildingBackZ + 5.7, 1.1, 0.5],
    [buildingX - 0.3, buildingBackZ + 6.7, 1.6, 0.7],
  ]) {
    box(THREE, group, sw, 0.006, sd, materials.stain, sx, 0.032, sz);
  }

  addKeepClearMarking(THREE, group, materials, buildingX, buildingBackZ + 1.65);
  addBollard(THREE, group, materials, buildingX - 2.05, buildingBackZ + 1.45);
  addBollard(THREE, group, materials, buildingX + 2.05, buildingBackZ + 1.45);

  addWheelStop(THREE, group, materials, buildingX - 3.25, buildingBackZ + 4.1, Math.PI / 2);
  addWheelStop(THREE, group, materials, buildingX + 3.25, buildingBackZ + 4.1, Math.PI / 2);

  addUtilityCover(THREE, group, materials, buildingX + 0.6, buildingBackZ + 4.4, 0.08);

  for (let i = -2; i <= 2; i += 1) {
    addDrain(THREE, group, materials, buildingX + i * 1.32, buildingBackZ + 6.1, 0);
  }

  addCableReel(THREE, group, materials, buildingX - 2.7, buildingBackZ + 6.9, Math.PI / 2);
  addPalletConduit(THREE, group, materials, buildingX + 2.6, buildingBackZ + 6.8, -0.12);

  scene.add(group);
  removeRockPlaceholders(scene);
  return group;
}
