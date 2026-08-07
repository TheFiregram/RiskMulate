let cachedMaterials;

function getMaterials(THREE) {
  if (cachedMaterials) return cachedMaterials;

  cachedMaterials = {
    concrete: new THREE.MeshStandardMaterial({ color: 0x85827a, roughness: 0.97, metalness: 0.01 }),
    concreteDark: new THREE.MeshStandardMaterial({ color: 0x54534f, roughness: 0.99, metalness: 0.01 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x555d5e, roughness: 0.72, metalness: 0.56 }),
    steelDark: new THREE.MeshStandardMaterial({ color: 0x2a2f30, roughness: 0.76, metalness: 0.58 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xc6a537, roughness: 0.9, metalness: 0.03 }),
    yellowWorn: new THREE.MeshStandardMaterial({ color: 0xa88931, roughness: 0.96, metalness: 0.01 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x785234, roughness: 0.95, metalness: 0.01 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x4f3523, roughness: 0.97, metalness: 0.01 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x202323, roughness: 0.97, metalness: 0.01 }),
    slab: new THREE.MeshStandardMaterial({ color: 0x5b5a54, roughness: 1, metalness: 0 }),
    stain: new THREE.MeshStandardMaterial({ color: 0x302f2b, roughness: 1, metalness: 0, transparent: true, opacity: 0.2 }),
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

  box(THREE, stop, 1.7, 0.11, 0.2, materials.concrete, 0, 0.055, 0);
  box(THREE, stop, 1.52, 0.055, 0.14, materials.concrete, 0, 0.138, 0);
  box(THREE, stop, 0.08, 0.075, 0.205, materials.concreteDark, -0.8, 0.06, 0);
  box(THREE, stop, 0.08, 0.075, 0.205, materials.concreteDark, 0.8, 0.06, 0);
  cylinder(THREE, stop, 0.02, 0.02, materials.steelDark, -0.54, 0.185, 0, 'y', 10);
  cylinder(THREE, stop, 0.02, 0.02, materials.steelDark, 0.54, 0.185, 0, 'y', 10);
}

function addBollard(THREE, group, materials, x, z) {
  const bollard = new THREE.Group();
  bollard.position.set(x, 0, z);
  group.add(bollard);

  // Slimmer guard posts fit the pedestrian-scale electrical service area.
  box(THREE, bollard, 0.19, 0.026, 0.19, materials.steelDark, 0, 0.013, 0);
  cylinder(THREE, bollard, 0.055, 0.78, materials.yellow, 0, 0.415, 0, 'y', 18);
  cylinder(THREE, bollard, 0.059, 0.04, materials.steelDark, 0, 0.815, 0, 'y', 18);
  cylinder(THREE, bollard, 0.058, 0.035, materials.steelDark, 0, 0.28, 0, 'y', 18);
  cylinder(THREE, bollard, 0.058, 0.035, materials.steelDark, 0, 0.57, 0, 'y', 18);

  for (const bx of [-0.065, 0.065]) {
    for (const bz of [-0.065, 0.065]) {
      cylinder(THREE, bollard, 0.008, 0.012, materials.steelDark, bx, 0.034, bz, 'y', 8);
    }
  }
}

function addUtilityCover(THREE, group, materials, x, z, rotationY = 0) {
  const cover = new THREE.Group();
  cover.position.set(x, 0.016, z);
  cover.rotation.y = rotationY;
  group.add(cover);

  box(THREE, cover, 0.92, 0.038, 0.68, materials.steelDark, 0, 0.019, 0);
  box(THREE, cover, 0.84, 0.045, 0.6, materials.steel, 0, 0.045, 0);
  for (const rx of [-0.3, -0.15, 0, 0.15, 0.3]) {
    box(THREE, cover, 0.028, 0.014, 0.52, materials.steelDark, rx, 0.076, 0);
  }
  for (const rz of [-0.19, 0, 0.19]) {
    box(THREE, cover, 0.72, 0.014, 0.024, materials.steelDark, 0, 0.077, rz);
  }
}

function addDrain(THREE, group, materials, x, z, rotationY = 0) {
  const drain = new THREE.Group();
  drain.position.set(x, 0.008, z);
  drain.rotation.y = rotationY;
  group.add(drain);

  box(THREE, drain, 1.25, 0.045, 0.28, materials.concreteDark, 0, 0.0225, 0);
  box(THREE, drain, 1.16, 0.02, 0.2, materials.steelDark, 0, 0.057, 0);
  for (let i = -5; i <= 5; i += 1) {
    box(THREE, drain, 0.028, 0.02, 0.18, materials.steel, i * 0.1, 0.073, 0);
  }
  box(THREE, drain, 1.14, 0.02, 0.02, materials.steel, 0, 0.073, -0.085);
  box(THREE, drain, 1.14, 0.02, 0.02, materials.steel, 0, 0.073, 0.085);
}

function addCableReel(THREE, group, materials, x, z, rotationY = 0) {
  const reel = new THREE.Group();
  reel.position.set(x, 0, z);
  reel.rotation.y = rotationY;
  group.add(reel);

  cylinder(THREE, reel, 0.045, 0.62, materials.steelDark, 0, 0.38, 0, 'x', 16);
  for (const rx of [-0.265, 0.265]) {
    cylinder(THREE, reel, 0.4, 0.065, materials.wood, rx, 0.38, 0, 'x', 18);
    cylinder(THREE, reel, 0.09, 0.075, materials.woodDark, rx * 1.03, 0.38, 0, 'x', 16);
  }
  cylinder(THREE, reel, 0.255, 0.46, materials.cable, 0, 0.38, 0, 'x', 22);
  box(THREE, reel, 0.24, 0.08, 0.14, materials.woodDark, -0.18, 0.04, 0);
  box(THREE, reel, 0.24, 0.08, 0.14, materials.woodDark, 0.18, 0.04, 0);
}

function addPalletConduit(THREE, group, materials, x, z, rotationY = 0) {
  const pallet = new THREE.Group();
  pallet.position.set(x, 0, z);
  pallet.rotation.y = rotationY;
  group.add(pallet);

  for (let i = -2; i <= 3; i += 1) {
    box(THREE, pallet, 1.05, 0.045, 0.09, materials.wood, 0, 0.13, i * 0.115 - 0.058);
  }
  for (const px of [-0.42, 0, 0.42]) {
    box(THREE, pallet, 0.1, 0.1, 0.72, materials.woodDark, px, 0.06, 0);
  }

  for (const yLevel of [0.205, 0.28]) {
    const offsets = yLevel < 0.24 ? [-0.32, -0.11, 0.11, 0.32] : [-0.24, 0, 0.24];
    for (const conduitZ of offsets) {
      cylinder(THREE, pallet, 0.028, 0.92, materials.steel, 0, yLevel, conduitZ, 'x', 12);
    }
  }

  for (const sx of [-0.27, 0.27]) {
    box(THREE, pallet, 0.028, 0.018, 0.68, materials.steelDark, sx, 0.325, 0);
  }
}

function addKeepClearMarking(THREE, group, materials, centerX, centerZ) {
  const marking = new THREE.Group();
  marking.position.set(centerX, 0.026, centerZ);
  group.add(marking);

  // Electrical panel clearance zone: compact border with restrained hatch marks.
  const width = 3.65;
  const depth = 1.7;
  const line = 0.045;
  box(THREE, marking, width, 0.009, line, materials.yellow, 0, 0, -depth / 2);
  box(THREE, marking, width, 0.009, line, materials.yellow, 0, 0, depth / 2);
  box(THREE, marking, line, 0.009, depth, materials.yellow, -width / 2, 0, 0);
  box(THREE, marking, line, 0.009, depth, materials.yellow, width / 2, 0, 0);

  for (const stripeX of [-1.05, -0.35, 0.35, 1.05]) {
    box(THREE, marking, 0.04, 0.007, 1.28, materials.yellowWorn, stripeX, 0.002, 0, Math.PI / 4);
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

  // A tighter maintenance apron keeps the rear yard from reading like a car park.
  box(THREE, group, 9.0, 0.016, 6.8, materials.slab, buildingX, 0.018, buildingBackZ + 3.6);

  for (const [sx, sz, sw, sd] of [
    [buildingX - 2.4, buildingBackZ + 3.7, 0.95, 0.35],
    [buildingX + 1.75, buildingBackZ + 4.9, 0.75, 0.3],
    [buildingX - 0.4, buildingBackZ + 5.8, 1.15, 0.4],
  ]) {
    box(THREE, group, sw, 0.005, sd, materials.stain, sx, 0.03, sz);
  }

  addKeepClearMarking(THREE, group, materials, buildingX, buildingBackZ + 1.05);

  // Guards now flank the panel bank instead of sitting in the center of the walkway.
  addBollard(THREE, group, materials, buildingX - 1.68, buildingBackZ + 1.15);
  addBollard(THREE, group, materials, buildingX + 1.68, buildingBackZ + 1.15);

  addWheelStop(THREE, group, materials, buildingX - 3.0, buildingBackZ + 3.9, Math.PI / 2);
  addWheelStop(THREE, group, materials, buildingX + 3.0, buildingBackZ + 3.9, Math.PI / 2);

  addUtilityCover(THREE, group, materials, buildingX + 0.55, buildingBackZ + 3.8, 0.05);

  for (let i = -2; i <= 2; i += 1) {
    addDrain(THREE, group, materials, buildingX + i * 1.18, buildingBackZ + 5.25, 0);
  }

  // Storage props sit against the rear edge, leaving the service path open.
  addCableReel(THREE, group, materials, buildingX - 2.55, buildingBackZ + 6.0, Math.PI / 2);
  addPalletConduit(THREE, group, materials, buildingX + 2.45, buildingBackZ + 5.95, -0.08);

  scene.add(group);
  removeRockPlaceholders(scene);
  return group;
}
