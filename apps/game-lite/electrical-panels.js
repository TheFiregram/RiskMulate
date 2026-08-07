import { createServiceYardProps } from './service-yard-props.js';

let cachedMaterials;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createMetalTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(5031);

  ctx.fillStyle = '#6f7473';
  ctx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 1400; i += 1) {
    const tone = 70 + Math.floor(random() * 85);
    ctx.globalAlpha = 0.03 + random() * 0.11;
    ctx.fillStyle = `rgb(${tone},${tone},${Math.max(0, tone - 4)})`;
    const size = 0.4 + random() * 1.8;
    ctx.fillRect(random() * 128, random() * 128, size, size);
  }

  for (let i = 0; i < 22; i += 1) {
    ctx.globalAlpha = 0.05 + random() * 0.08;
    ctx.fillStyle = random() > 0.5 ? '#463c35' : '#9b8b79';
    ctx.fillRect(random() * 128, random() * 128, 2 + random() * 8, 12 + random() * 42);
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.2, 1.4);
  texture.anisotropy = 2;
  return texture;
}

function createWarningTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#d6b62c';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#161616';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 116, 116);

  ctx.fillStyle = '#161616';
  ctx.beginPath();
  ctx.moveTo(64, 20);
  ctx.lineTo(108, 100);
  ctx.lineTo(20, 100);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d6b62c';
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', 64, 73);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function getMaterials(THREE) {
  if (cachedMaterials) return cachedMaterials;

  cachedMaterials = {
    cabinet: new THREE.MeshStandardMaterial({
      color: 0x777b78,
      map: createMetalTexture(THREE),
      roughness: 0.74,
      metalness: 0.5,
    }),
    cabinetDark: new THREE.MeshStandardMaterial({
      color: 0x4f5554,
      roughness: 0.8,
      metalness: 0.44,
    }),
    conduit: new THREE.MeshStandardMaterial({
      color: 0x555b5b,
      roughness: 0.7,
      metalness: 0.58,
    }),
    hardware: new THREE.MeshStandardMaterial({
      color: 0x2e3232,
      roughness: 0.66,
      metalness: 0.62,
    }),
    warning: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: createWarningTexture(THREE),
      roughness: 0.82,
      metalness: 0.02,
    }),
    cable: new THREE.MeshStandardMaterial({
      color: 0x1f2424,
      roughness: 0.92,
      metalness: 0.02,
    }),
  };

  return cachedMaterials;
}

function box(THREE, group, width, height, depth, material, x, y, z) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  object.position.set(x, y, z);
  group.add(object);
  return object;
}

function cylinder(THREE, group, radius, length, material, x, y, z, axis = 'y') {
  const object = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material);
  if (axis === 'x') object.rotation.z = Math.PI / 2;
  if (axis === 'z') object.rotation.x = Math.PI / 2;
  object.position.set(x, y, z);
  group.add(object);
  return object;
}

function addCabinet(THREE, group, materials, options) {
  const { x, y, width, height, depth, warning = false } = options;
  const cabinet = box(THREE, group, width, height, depth, materials.cabinet, x, y, 0);

  box(THREE, group, width * 0.92, height * 0.93, 0.018, materials.cabinetDark, x, y, depth / 2 + 0.012);
  box(THREE, group, 0.025, height * 0.78, 0.028, materials.hardware, x - width * 0.42, y, depth / 2 + 0.026);
  box(THREE, group, 0.025, height * 0.78, 0.028, materials.hardware, x + width * 0.42, y, depth / 2 + 0.026);

  const latch = box(
    THREE,
    group,
    0.06,
    0.14,
    0.045,
    materials.hardware,
    x + width * 0.31,
    y,
    depth / 2 + 0.04,
  );
  latch.rotation.z = Math.PI / 2;

  if (warning) {
    box(
      THREE,
      group,
      Math.min(0.28, width * 0.34),
      Math.min(0.28, height * 0.22),
      0.018,
      materials.warning,
      x,
      y + height * 0.16,
      depth / 2 + 0.045,
    );
  }

  return cabinet;
}

export function createElectricalPanelCluster(THREE, scene, options = {}) {
  const {
    x = 0,
    y = 1.5,
    z = 0,
    rotationY = 0,
    scale = 1,
  } = options;

  const materials = getMaterials(THREE);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  group.scale.setScalar(scale);
  group.userData.assetType = 'electrical-panel-cluster';

  addCabinet(THREE, group, materials, {
    x: -1.08,
    y: 0.06,
    width: 0.72,
    height: 1.05,
    depth: 0.24,
  });
  addCabinet(THREE, group, materials, {
    x: -0.2,
    y: 0.03,
    width: 0.62,
    height: 1.18,
    depth: 0.25,
  });
  addCabinet(THREE, group, materials, {
    x: 0.82,
    y: 0.18,
    width: 0.94,
    height: 1.55,
    depth: 0.31,
    warning: true,
  });

  addCabinet(THREE, group, materials, {
    x: 0.1,
    y: -0.76,
    width: 0.44,
    height: 0.42,
    depth: 0.2,
  });

  const conduitXs = [-1.28, -0.96, -0.36, -0.04, 0.58, 0.86, 1.06];
  for (const conduitX of conduitXs) {
    cylinder(THREE, group, 0.025, 1.26, materials.conduit, conduitX, -1.08, 0.03, 'y');
  }

  cylinder(THREE, group, 0.03, 2.55, materials.conduit, -0.05, -1.68, 0.03, 'x');
  cylinder(THREE, group, 0.024, 1.72, materials.cable, -0.18, 0.86, -0.03, 'x');

  for (const topX of [-0.4, 0.7, 0.94]) {
    cylinder(THREE, group, 0.024, 0.62, materials.conduit, topX, 1.02, -0.02, 'y');
  }

  scene.add(group);

  createServiceYardProps(THREE, scene, {
    buildingX: x,
    buildingBackZ: z,
  });

  return group;
}
