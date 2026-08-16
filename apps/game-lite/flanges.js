import { buildTankConnections } from './tank-connections.js';

let cachedMaterials;
const animatedDrops = [];
let rackNormalized = false;
let leakingFlangeGroup = null;

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
    support: new THREE.MeshStandardMaterial({
      color: 0x424c51,
      roughness: 0.7,
      metalness: 0.48,
    }),
    supportDark: new THREE.MeshStandardMaterial({
      color: 0x293238,
      roughness: 0.76,
      metalness: 0.5,
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

function addWorldPipe(THREE, scene, material, x, y, z, length, radius) {
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 16), material);
  orientAlongX(pipe);
  pipe.position.set(x, y, z);
  pipe.userData.organizedPipe = true;
  scene.add(pipe);
  return pipe;
}

function addWorldBox(THREE, scene, material, x, y, z, width, height, depth) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  object.position.set(x, y, z);
  object.userData.pipeRackSupport = true;
  scene.add(object);
  return object;
}

function near(value, target, tolerance = 0.08) {
  return Math.abs(value - target) <= tolerance;
}

function removeLegacyPipeGeometry(scene, materials) {
  const oldPipes = scene.children.filter(
    (child) => child.isMesh
      && child.geometry?.type === 'CylinderGeometry'
      && child.material === materials.pipe
      && !child.userData.organizedPipe,
  );

  for (const pipe of oldPipes) {
    scene.remove(pipe);
    pipe.geometry?.dispose?.();
  }

  const oldSupports = scene.children.filter((child) => {
    if (!child.isMesh || child.geometry?.type !== 'BoxGeometry') return false;
    const leftSupport = near(child.position.x, -3.4) && near(child.position.y, 1.3) && near(child.position.z, -6.8);
    const rightSupport = near(child.position.x, 5.8) && near(child.position.y, 1.3) && near(child.position.z, -6.8);
    return leftSupport || rightSupport;
  });

  for (const support of oldSupports) {
    scene.remove(support);
    support.geometry?.dispose?.();
  }
}

function buildOrganizedPipeRack(THREE, scene, materials) {
  if (rackNormalized) return;
  rackNormalized = true;

  removeLegacyPipeGeometry(scene, materials);

  const rackZ = -7.6;
  const serviceYellow = new THREE.MeshStandardMaterial({ color: 0xc9a329, roughness: 0.72, metalness: 0.22 });
  const clampMaterial = new THREE.MeshStandardMaterial({ color: 0x252b2e, roughness: 0.72, metalness: 0.62 });
  const lineSpecs = [
    { y: 1.46, length: 19.5, radius: 0.14, z: rackZ + 0.48 },
    { y: 2.05, length: 22, radius: 0.25, z: rackZ },
    { y: 2.62, length: 20.5, radius: 0.17, z: rackZ - 0.42 },
    { y: 3.2, length: 21, radius: 0.23, z: rackZ },
  ];

  for (const line of lineSpecs) {
    addWorldPipe(THREE, scene, materials.pipe, 0, line.y, line.z, line.length, line.radius);
  }

  for (const supportX of [-8.5, -4.25, 0, 4.25, 8.5]) {
    for (const postZ of [rackZ - 0.72, rackZ + 0.72]) {
      addWorldBox(THREE, scene, materials.support, supportX, 1.9, postZ, 0.24, 3.8, 0.24);
      addWorldBox(THREE, scene, materials.supportDark, supportX, 0.06, postZ, 0.58, 0.12, 0.58);
    }
    for (const beamY of [1.18, 1.78, 2.38, 2.94, 3.58]) {
      addWorldBox(THREE, scene, materials.supportDark, supportX, beamY, rackZ, 0.3, 0.1, 1.68);
    }

    for (const line of lineSpecs) {
      const clamp = new THREE.Mesh(new THREE.TorusGeometry(line.radius + 0.045, 0.025, 6, 16), clampMaterial);
      clamp.rotation.y = Math.PI / 2;
      clamp.position.set(supportX, line.y, line.z);
      clamp.userData.pipeRackSupport = true;
      scene.add(clamp);
    }
  }

  addWorldBox(THREE, scene, materials.supportDark, 0, 4.02, rackZ + 0.76, 19.2, 0.1, 0.56);
  addWorldBox(THREE, scene, materials.support, 0, 4.13, rackZ + 0.49, 19.2, 0.16, 0.06);
  addWorldBox(THREE, scene, materials.support, 0, 4.13, rackZ + 1.03, 19.2, 0.16, 0.06);

  for (const markerX of [-6.2, -1.8, 2.6, 7.0]) {
    addWorldBox(THREE, scene, serviceYellow, markerX, 2.05, rackZ - 0.27, 0.34, 0.12, 0.03);
  }

  buildTankConnections(THREE, scene, materials);
}

function resolveLegacyPlacement(options) {
  const placement = { ...options };

  if (options.leaking) {
    return { ...placement, x: 4.25, y: 2.05, z: -7.6, axis: 'x', scale: 0.82 };
  }

  if (near(options.x ?? 0, -4.4) && near(options.y ?? 0, 2.05) && near(options.z ?? 0, -6.8)) {
    return { ...placement, x: -5.1, y: 2.05, z: -7.6, axis: 'x', scale: 0.8 };
  }

  if (near(options.x ?? 0, 0.4) && near(options.y ?? 0, 3.2) && near(options.z ?? 0, -10.5)) {
    return { ...placement, x: 4.9, y: 3.2, z: -7.6, axis: 'x', scale: 0.76 };
  }

  if (near(options.x ?? 0, 4.2) && near(options.y ?? 0, 1.2) && near(options.z ?? 0, -4.7)) {
    return { ...placement, x: -2.75, y: 3.2, z: -7.6, axis: 'x', scale: 0.76 };
  }

  return placement;
}

export function createIndustrialFlange(THREE, scene, options = {}) {
  const materials = getIndustrialMaterials(THREE);
  buildOrganizedPipeRack(THREE, scene, materials);

  const resolved = resolveLegacyPlacement(options);
  const {
    x = 0,
    y = 0,
    z = 0,
    axis = 'x',
    leaking = false,
    interactive = false,
    label = 'Inspect flange',
    scale = 1,
  } = resolved;

  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  group.userData.flange = true;
  group.userData.leaking = Boolean(leaking);
  group.userData.controlled = false;
  if (interactive) {
    group.userData.interactable = true;
    group.userData.label = label;
  }

  addCylinder(THREE, group, 0.268, 0.82, materials.pipe, -0.45, 0, 0, 14);
  addCylinder(THREE, group, 0.268, 0.82, materials.pipe, 0.45, 0, 0, 14);

  addCylinder(THREE, group, 0.515, 0.145, materials.flange, -0.095, 0, 0, 18);
  addCylinder(THREE, group, 0.515, 0.145, materials.flange, 0.095, 0, 0, 18);
  addCylinder(THREE, group, 0.435, 0.036, materials.gasket, 0, 0, 0, 18);
  addCylinder(THREE, group, 0.405, 0.19, materials.flangeEdge, -0.205, 0, 0, 16);
  addCylinder(THREE, group, 0.405, 0.19, materials.flangeEdge, 0.205, 0, 0, 16);

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
    leakingFlangeGroup = group;

    const stain = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.31, 3, 6), materials.stain);
    stain.position.set(0.02, -0.48, 0.24);
    stain.rotation.z = 0.08;
    stain.userData.leakStain = true;
    group.add(stain);

    const dropSpecs = [
      { x: 0.02, y: -0.68, z: 0.25, size: 0.052, phase: 0.1 },
      { x: 0.06, y: -0.82, z: 0.25, size: 0.038, phase: 0.55 },
      { x: -0.03, y: -0.59, z: 0.245, size: 0.028, phase: 0.82 },
    ];
    for (const spec of dropSpecs) {
      const drop = new THREE.Mesh(new THREE.SphereGeometry(spec.size, 8, 6), materials.leak.clone());
      drop.scale.y = 1.8;
      drop.position.set(spec.x, spec.y, spec.z);
      drop.userData.baseY = spec.y;
      drop.userData.phase = spec.phase;
      drop.userData.leakDrop = true;
      group.add(drop);
      animatedDrops.push(drop);
    }
  }

  if (interactive) {
    const hit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.92, 12),
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

/**
 * Educational plant response: isolating the solvent line stops the visible leak pathway.
 * Projected plans fade the leak; committed isolation hides drips and dries the joint.
 */
export function setLeakingFlangeControlled(controlled, { projected = false } = {}) {
  if (!leakingFlangeGroup) return false;
  leakingFlangeGroup.userData.controlled = Boolean(controlled);
  leakingFlangeGroup.userData.projectedControl = Boolean(projected && controlled);

  for (const drop of animatedDrops) {
    if (controlled && !projected) {
      drop.visible = false;
      drop.material.opacity = 0;
    } else if (controlled && projected) {
      drop.visible = true;
      drop.material.opacity = 0.28;
    } else {
      drop.visible = true;
      drop.material.opacity = 0.88;
    }
  }

  leakingFlangeGroup.traverse((child) => {
    if (child.userData?.leakStain && child.material) {
      child.material.opacity = controlled
        ? (projected ? 0.32 : 0.18)
        : 0.72;
      child.material.needsUpdate = true;
    }
  });

  if (controlled && !projected) {
    leakingFlangeGroup.userData.label = 'Isolated flange (controlled)';
  } else if (controlled && projected) {
    leakingFlangeGroup.userData.label = 'Projected isolation — leak pathway reduced';
  } else {
    leakingFlangeGroup.userData.label = 'Inspect leaking flange';
  }
  return true;
}

export function updateFlangeEffects(timeSeconds) {
  for (const drop of animatedDrops) {
    if (!drop.visible) continue;
    const cycle = (timeSeconds * 0.42 + drop.userData.phase) % 1;
    drop.position.y = drop.userData.baseY - cycle * 0.18;
    const fade = 1 - Math.max(0, (cycle - 0.72) / 0.28);
    const baseOpacity = drop.material.opacity > 0.4 ? 0.5 : 0.18;
    drop.material.opacity = baseOpacity + fade * (drop.material.opacity > 0.4 ? 0.38 : 0.12);
  }
}
