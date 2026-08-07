let cachedMaterials;
const animatedDrops = [];

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createRustTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(31000);

  ctx.fillStyle = '#a45f34';
  ctx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 520; i += 1) {
    const x = random() * 128;
    const y = random() * 128;
    const radius = 0.4 + random() * 2.5;
    const dark = random() > 0.58;
    ctx.globalAlpha = 0.08 + random() * 0.22;
    ctx.fillStyle = dark ? '#241c18' : '#d38b52';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 18; i += 1) {
    const y = random() * 128;
    ctx.fillStyle = '#2d211a';
    ctx.fillRect(0, y, 128, 0.5 + random() * 1.4);
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.6, 1.2);
  texture.anisotropy = 2;
  return texture;
}

export function getIndustrialMaterials(THREE) {
  if (cachedMaterials) return cachedMaterials;
  const rustTexture = createRustTexture(THREE);

  cachedMaterials = {
    pipe: new THREE.MeshStandardMaterial({
      color: 0xa7643a,
      map: rustTexture,
      roughness: 0.86,
      metalness: 0.31,
    }),
    flange: new THREE.MeshStandardMaterial({
      color: 0x544c45,
      roughness: 0.74,
      metalness: 0.57,
    }),
    flangeEdge: new THREE.MeshStandardMaterial({
      color: 0x3a332e,
      roughness: 0.82,
      metalness: 0.48,
    }),
    gasket: new THREE.MeshStandardMaterial({
      color: 0x171514,
      roughness: 0.98,
      metalness: 0.02,
    }),
    bolt: new THREE.MeshStandardMaterial({
      color: 0x3b3531,
      roughness: 0.7,
      metalness: 0.64,
    }),
    washer: new THREE.MeshStandardMaterial({
      color: 0x625950,
      roughness: 0.67,
      metalness: 0.62,
    }),
    leak: new THREE.MeshStandardMaterial({
      color: 0xc77a24,
      emissive: 0x5d2505,
      emissiveIntensity: 0.24,
      roughness: 0.24,
      metalness: 0,
      transparent: true,
      opacity: 0.88,
    }),
    stain: new THREE.MeshStandardMaterial({
      color: 0x4f2a16,
      roughness: 0.92,
      metalness: 0.06,
      transparent: true,
      opacity: 0.72,
    }),
  };
  return cachedMaterials;
}

function orientAlongX(object) {
  object.rotation.z = Math.PI / 2;
  return object;
}

function addCylinder(THREE, group, radius, length, material, x = 0, y = 0, z = 0, segments = 16) {
  const item = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material);
  orientAlongX(item);
  item.position.set(x, y, z);
  group.add(item);
  return item;
}

function addNut(THREE, group, x, y, z, material) {
  return addCylinder(THREE, group, 0.073, 0.062, material, x, y, z, 6);
}

function addWasher(THREE, group, x, y, z, material) {
  const washer = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.013, 5, 10), material);
  washer.rotation.y = Math.PI / 2;
  washer.position.set(x, y, z);
  group.add(washer);
  return washer;
}

export function createIndustrialFlange(THREE, scene, options = {}) {
  const {
    x = 0,
    y = 0,
    z = 0,
    axis = 'x',
    leaking = false,
    interactive = false,
    label = 'Inspect flange',
    scale = 1,
  } = options;

  const materials = getIndustrialMaterials(THREE);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  group.userData.flange = true;
  if (interactive) {
    group.userData.interactable = true;
    group.userData.label = label;
  }

  // Short rusty pipe sleeves match the approved flange reference and visually
  // bridge the detailed joint into the lower-poly plant pipe network.
  addCylinder(THREE, group, 0.268, 0.82, materials.pipe, -0.45, 0, 0, 14);
  addCylinder(THREE, group, 0.268, 0.82, materials.pipe, 0.45, 0, 0, 14);

  // Twin steel flange plates with the compressed gasket visible between them.
  addCylinder(THREE, group, 0.515, 0.145, materials.flange, -0.095, 0, 0, 18);
  addCylinder(THREE, group, 0.515, 0.145, materials.flange, 0.095, 0, 0, 18);
  addCylinder(THREE, group, 0.435, 0.036, materials.gasket, 0, 0, 0, 18);
  addCylinder(THREE, group, 0.405, 0.19, materials.flangeEdge, -0.205, 0, 0, 16);
  addCylinder(THREE, group, 0.405, 0.19, materials.flangeEdge, 0.205, 0, 0, 16);

  // Eight bolt sets reproduce the heavy industrial joint visible in the approved asset.
  const boltRadius = 0.39;
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const by = Math.cos(angle) * boltRadius;
    const bz = Math.sin(angle) * boltRadius;
    addCylinder(THREE, group, 0.034, 0.48, materials.bolt, 0, by, bz, 8);
    addWasher(THREE, group, -0.235, by, bz, materials.washer);
    addWasher(THREE, group, 0.235, by, bz, materials.washer);
    addNut(THREE, group, -0.278, by, bz, materials.bolt);
    addNut(THREE, group, 0.278, by, bz, materials.bolt);
  }

  if (leaking) {
    // Dark wet streak at the failed gasket edge.
    const stain = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.31, 3, 6), materials.stain);
    stain.position.set(0.02, -0.48, 0.24);
    stain.rotation.z = 0.08;
    group.add(stain);

    const dropSpecs = [
      { x: 0.02, y: -0.68, z: 0.25, size: 0.052, phase: 0.1 },
      { x: 0.06, y: -0.82, z: 0.25, size: 0.038, phase: 0.55 },
      { x: -0.03, y: -0.59, z: 0.245, size: 0.028, phase: 0.82 },
    ];
    for (const spec of dropSpecs) {
      const drop = new THREE.Mesh(new THREE.SphereGeometry(spec.size, 8, 6), materials.leak);
      drop.scale.y = 1.8;
      drop.position.set(spec.x, spec.y, spec.z);
      drop.userData.baseY = spec.y;
      drop.userData.phase = spec.phase;
      group.add(drop);
      animatedDrops.push(drop);
    }
  }

  if (interactive) {
    // Invisible hit volume makes the detailed joint easy to inspect on touch screens.
    const hit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.64, 0.64, 0.82, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    orientAlongX(hit);
    hit.userData.hitVolume = true;
    group.add(hit);
  }

  if (axis === 'z') group.rotation.y = Math.PI / 2;
  if (axis === 'y') group.rotation.z = Math.PI / 2;

  scene.add(group);
  return group;
}

export function updateFlangeEffects(timeSeconds) {
  for (const drop of animatedDrops) {
    const cycle = (timeSeconds * 0.42 + drop.userData.phase) % 1;
    drop.position.y = drop.userData.baseY - cycle * 0.18;
    const fade = 1 - Math.max(0, (cycle - 0.72) / 0.28);
    drop.material.opacity = 0.5 + fade * 0.38;
  }
}
