const BUILDING_WALL_HEIGHT = 4.6;
const BUILDING_WALL_THICKNESS = 0.24;
const BUILDING_PLINTH_HEIGHT = 0.18;
const BUILDING_EAVE_HEIGHT = 0.16;
const BUILDING_GRID = 1;

let cachedBuildingMaterials;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createCanvas(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function createGenericTextureCanvas(baseColor, seed = 1, size = 256) {
  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const random = seededRandom(seed);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 3800; i += 1) {
    const tone = 56 + Math.floor(random() * 42);
    ctx.globalAlpha = 0.02 + random() * 0.06;
    ctx.fillStyle = `rgb(${tone},${tone + 3},${tone + 4})`;
    const s = 0.35 + random() * 1.7;
    ctx.fillRect(random() * size, random() * size, s, s);
  }

  ctx.globalAlpha = 1;
  return canvas;
}

function createCinderBlockAlbedoCanvas(size = 512, seed = 8808) {
  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const random = seededRandom(seed);

  ctx.fillStyle = '#a19f96';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 6400; i += 1) {
    const tone = 138 + Math.floor(random() * 40);
    ctx.globalAlpha = 0.03 + random() * 0.08;
    ctx.fillStyle = `rgb(${tone},${tone},${Math.max(0, tone - 5)})`;
    const s = 0.5 + random() * 2.2;
    ctx.fillRect(random() * size, random() * size, s, s);
  }

  const cols = 4;
  const rows = 8;
  const blockW = size / cols;
  const rowH = size / rows;
  const mortar = Math.max(4, Math.round(size * 0.008));

  for (let row = 0; row < rows; row += 1) {
    const y = row * rowH;
    const offset = row % 2 === 0 ? 0 : blockW / 2;
    ctx.fillStyle = '#c4c0b6';
    ctx.globalAlpha = 0.95;
    ctx.fillRect(0, y, size, mortar);

    for (let col = -1; col < cols + 1; col += 1) {
      const x = col * blockW + offset;
      ctx.fillRect(x - mortar / 2, y, mortar, rowH);
    }

    for (let col = -1; col < cols + 1; col += 1) {
      const x = col * blockW + offset + mortar * 0.5;
      const w = blockW - mortar;
      if (x >= size || x + w <= 0) continue;

      const shade = 148 + Math.floor(random() * 18) - row * 2;
      ctx.globalAlpha = 0.11;
      ctx.fillStyle = `rgb(${shade},${shade},${shade - 4})`;
      ctx.fillRect(x, y + mortar, w, rowH - mortar);

      ctx.globalAlpha = 0.07;
      ctx.strokeStyle = 'rgba(70,64,58,0.65)';
      ctx.strokeRect(x + 1, y + mortar + 1, w - 2, rowH - mortar - 2);

      if (random() > 0.45) {
        ctx.globalAlpha = 0.1;
        const stainX = x + random() * w;
        const stainY = y + random() * rowH * 0.4;
        const stainH = rowH * (0.2 + random() * 0.45);
        const grad = ctx.createLinearGradient(stainX, stainY, stainX, stainY + stainH);
        grad.addColorStop(0, 'rgba(90,80,67,0)');
        grad.addColorStop(0.35, 'rgba(90,80,67,0.8)');
        grad.addColorStop(1, 'rgba(90,80,67,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(stainX, stainY, 2 + random() * 5, stainH);
      }
    }
  }

  const groundGrime = ctx.createLinearGradient(0, size * 0.68, 0, size);
  groundGrime.addColorStop(0, 'rgba(82,72,60,0)');
  groundGrime.addColorStop(1, 'rgba(82,72,60,0.32)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = groundGrime;
  ctx.fillRect(0, size * 0.68, size, size * 0.32);

  return canvas;
}

function createCinderBlockHeightCanvas(size = 512, seed = 8817) {
  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const random = seededRandom(seed);
  const cols = 4;
  const rows = 8;
  const blockW = size / cols;
  const rowH = size / rows;
  const mortar = Math.max(4, Math.round(size * 0.008));

  ctx.fillStyle = 'rgb(152,152,152)';
  ctx.fillRect(0, 0, size, size);

  for (let row = 0; row < rows; row += 1) {
    const y = row * rowH;
    const offset = row % 2 === 0 ? 0 : blockW / 2;

    ctx.fillStyle = 'rgb(118,118,118)';
    ctx.fillRect(0, y, size, mortar);

    for (let col = -1; col < cols + 1; col += 1) {
      const x = col * blockW + offset;
      ctx.fillRect(x - mortar / 2, y, mortar, rowH);
    }

    for (let col = -1; col < cols + 1; col += 1) {
      const x = col * blockW + offset + mortar * 0.5;
      const w = blockW - mortar;
      if (x >= size || x + w <= 0) continue;
      const tone = 160 + Math.floor(random() * 10);
      ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
      ctx.fillRect(x, y + mortar, w, rowH - mortar);
      ctx.strokeStyle = 'rgba(185,185,185,0.45)';
      ctx.strokeRect(x + 1, y + mortar + 1, w - 2, rowH - mortar - 2);
    }
  }

  return canvas;
}

function createTexture(THREE, canvas, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 2;
  texture.needsUpdate = true;
  return texture;
}

export function getBuildingWallMaterials(THREE) {
  if (cachedBuildingMaterials) return cachedBuildingMaterials;

  const cinderBlockMap = createTexture(THREE, createCinderBlockAlbedoCanvas(512, 8808), 1.15, 1.15);
  const cinderBlockBump = createTexture(THREE, createCinderBlockHeightCanvas(512, 8817), 1.15, 1.15);
  const trimMap = createTexture(THREE, createGenericTextureCanvas('#262d31', 3017), 1.2, 0.5);
  const plinthMap = createTexture(THREE, createGenericTextureCanvas('#747067', 3023), 1.3, 0.65);
  const glassMap = createTexture(THREE, createGenericTextureCanvas('#6d8794', 3031), 1, 1);
  const louverMap = createTexture(THREE, createGenericTextureCanvas('#2b3338', 3049), 1, 1);

  cachedBuildingMaterials = {
    facade: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: cinderBlockMap,
      bumpMap: cinderBlockBump,
      bumpScale: 0.022,
      roughness: 0.95,
      metalness: 0.02,
    }),
    trim: new THREE.MeshStandardMaterial({ color: 0xffffff, map: trimMap, roughness: 0.72, metalness: 0.22 }),
    plinth: new THREE.MeshStandardMaterial({ color: 0xffffff, map: plinthMap, roughness: 0.94, metalness: 0.02 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xffffff, map: glassMap, roughness: 0.22, metalness: 0.08, transparent: true, opacity: 0.92 }),
    louver: new THREE.MeshStandardMaterial({ color: 0xffffff, map: louverMap, roughness: 0.78, metalness: 0.28 }),
  };

  return cachedBuildingMaterials;
}

function mark(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(THREE, group, w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
  mesh.position.set(x, y, z);
  mesh.userData.buildingModulePart = true;
  group.add(mesh);
  return mesh;
}

function louverPanel(THREE, group, width, height, materials, x, y, z) {
  const frame = box(THREE, group, width, height, 0.03, materials.trim, x, y, z);
  frame.name = 'LouverFrame';
  const slatCount = 8;
  const innerWidth = width - 0.1;
  const innerHeight = height - 0.1;
  for (let i = 0; i < slatCount; i += 1) {
    const yy = y - innerHeight / 2 + (i + 0.5) * (innerHeight / slatCount);
    const slat = box(THREE, group, innerWidth, 0.055, 0.025, materials.louver, x, yy, z + 0.01);
    slat.rotation.x = -0.22;
  }
}

function addWallCore(THREE, group, width, height, thickness, materials) {
  box(THREE, group, width, height - BUILDING_PLINTH_HEIGHT, thickness, materials.facade, 0, BUILDING_PLINTH_HEIGHT + (height - BUILDING_PLINTH_HEIGHT) / 2, 0);
  box(THREE, group, width + 0.03, BUILDING_PLINTH_HEIGHT, thickness + 0.03, materials.plinth, 0, BUILDING_PLINTH_HEIGHT / 2, 0);
  box(THREE, group, width + 0.08, BUILDING_EAVE_HEIGHT, thickness + 0.1, materials.trim, 0, height - BUILDING_EAVE_HEIGHT / 2, 0);
  box(THREE, group, width + 0.18, 0.045, thickness + 0.18, materials.trim, 0, height - BUILDING_EAVE_HEIGHT - 0.0225, 0);
}

export function createBuildingWallBay(THREE, scene, options = {}) {
  const {
    x = 0,
    y = 0,
    z = 0,
    width = 4,
    height = BUILDING_WALL_HEIGHT,
    thickness = BUILDING_WALL_THICKNESS,
    rotationY = 0,
    variant = 'blank',
    name = `BuildingWall_${variant}`,
  } = options;

  const materials = getBuildingWallMaterials(THREE);
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  group.userData.wall = true;
  group.userData.wallType = `building-${variant}`;
  group.userData.dimensions = { width, height, thickness };

  addWallCore(THREE, group, width, height, thickness, materials);

  if (variant === 'window') {
    const winW = Math.min(4.2, width * 0.52);
    const winH = Math.min(1.9, height * 0.46);
    const sillY = 2.05;
    box(THREE, group, winW + 0.1, winH + 0.1, 0.05, materials.trim, 0, sillY, thickness / 2 + 0.005);
    box(THREE, group, winW, winH, 0.025, materials.glass, 0, sillY, thickness / 2 + 0.02);
    box(THREE, group, 0.045, winH, 0.04, materials.trim, 0, sillY, thickness / 2 + 0.025);
  }

  if (variant === 'louver') {
    louverPanel(THREE, group, Math.min(1.2, width * 0.28), 0.95, materials, 0, 0.95, thickness / 2 + 0.01);
  }

  if (variant === 'service-door') {
    const doorW = 1.15;
    const doorH = 2.2;
    box(THREE, group, doorW + 0.1, doorH + 0.1, 0.05, materials.trim, 0, 1.16, thickness / 2 + 0.005);
    box(THREE, group, doorW, doorH, 0.03, materials.trim, 0, 1.16, thickness / 2 + 0.02);
    box(THREE, group, 0.08, 0.08, 0.05, materials.glass, doorW * 0.28, 1.16, thickness / 2 + 0.035);
    box(THREE, group, 0.14, 0.03, 0.04, materials.louver, -doorW * 0.28, 1.16, thickness / 2 + 0.03);
    louverPanel(THREE, group, 0.88, 0.44, materials, width * 0.32, 0.65, thickness / 2 + 0.008);
  }

  scene?.add(group);
  return group;
}

export function createBuildingCorner(THREE, scene, options = {}) {
  const {
    x = 0,
    y = 0,
    z = 0,
    legLength = 4,
    height = BUILDING_WALL_HEIGHT,
    thickness = BUILDING_WALL_THICKNESS,
    rotationY = 0,
    variantA = 'blank',
    variantB = 'blank',
  } = options;

  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  group.userData.wallType = 'building-corner';

  const a = createBuildingWallBay(THREE, null, { width: legLength, height, thickness, variant: variantA, name: 'CornerArmA' });
  a.position.x = legLength / 2 - thickness / 2;
  const b = createBuildingWallBay(THREE, null, { width: legLength, height, thickness, variant: variantB, name: 'CornerArmB' });
  b.rotation.y = Math.PI / 2;
  b.position.z = legLength / 2 - thickness / 2;

  group.add(a, b);
  scene?.add(group);
  return group;
}

export function buildProcessBuilding(THREE, scene, options = {}) {
  const {
    x = 10.5,
    y = 0,
    z = 2.5,
    width = 9,
    depth = 8,
    height = BUILDING_WALL_HEIGHT,
  } = options;

  const halfW = width / 2;
  const halfD = depth / 2;
  const materials = getBuildingWallMaterials(THREE);
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.name = 'ProcessBuilding';
  root.userData.buildingModule = true;

  const front = createBuildingWallBay(THREE, null, { width, height, z: -halfD, variant: 'window' });
  root.add(front);

  const back = createBuildingWallBay(THREE, null, { width, height, z: halfD, rotationY: Math.PI, variant: 'blank' });
  root.add(back);

  const left = createBuildingWallBay(THREE, null, { width: depth, height, x: -halfW, rotationY: Math.PI / 2, variant: 'service-door' });
  root.add(left);

  const right = createBuildingWallBay(THREE, null, { width: depth, height, x: halfW, rotationY: -Math.PI / 2, variant: 'louver' });
  root.add(right);

  const roof = box(THREE, root, width + 0.7, 0.18, depth + 0.7, materials.trim, 0, height + 0.12, 0);
  roof.rotation.z = -0.035;
  roof.position.x -= 0.08;

  const dome = mark(new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.65, 18, 1, false, 0, Math.PI), materials.plinth));
  dome.userData.buildingModulePart = true;
  dome.rotation.z = Math.PI / 2;
  dome.position.set(-width * 0.25, height + 0.36, -depth * 0.38);
  root.add(dome);

  scene.add(root);
  return root;
}

export function replaceGameLiteBoxesWithWallModules(THREE, scene, options = {}) {
  return {
    processBuilding: buildProcessBuilding(THREE, scene, options.processBuilding),
    officeBuilding: buildProcessBuilding(THREE, scene, {
      x: -11,
      z: 4.4,
      width: 10,
      depth: 6.5,
      ...options.officeBuilding,
    }),
  };
}

export const BUILDING_WALL_DIMENSIONS = Object.freeze({
  grid: BUILDING_GRID,
  height: BUILDING_WALL_HEIGHT,
  thickness: BUILDING_WALL_THICKNESS,
});

/**
 * Transitional adapter for the current game-lite scene.
 * It upgrades the two legacy box-shaped plant buildings at scene-add time without
 * touching the perimeter-wall module or the existing collision registration.
 * Remove this adapter once game.js constructs building modules directly.
 */
export function installLegacyBuildingWallUpgrade(THREE) {
  const proto = THREE.Scene.prototype;
  if (proto.__riskmulateBuildingUpgradeInstalled) return;

  const originalAdd = proto.add;
  Object.defineProperty(proto, '__riskmulateBuildingUpgradeInstalled', {
    value: true,
    configurable: true,
  });

  proto.add = function upgradedSceneAdd(...objects) {
    const result = originalAdd.apply(this, objects);

    for (const object of objects) {
      if (!object?.isMesh || object.userData?.buildingModulePart) continue;
      const geometry = object.geometry;
      const params = geometry?.parameters;
      if (!params || geometry.type !== 'BoxGeometry') continue;

      const materialColor = object.material?.color?.getHex?.();
      const isLegacyBuildingShell = materialColor === 0x4c5a61
        && params.width >= 8
        && params.depth >= 6
        && params.height >= 4;
      const isLegacyRoof = materialColor === 0x343d43
        && params.width >= 9
        && params.depth >= 6
        && params.height <= 0.45;
      const isLegacyFrontGlass = materialColor === 0x7696a4
        && params.width >= 4
        && params.height >= 2
        && params.depth <= 0.12;

      if (isLegacyRoof || isLegacyFrontGlass) {
        object.visible = false;
        continue;
      }

      if (!isLegacyBuildingShell || object.userData.buildingWallUpgradeApplied) continue;
      object.userData.buildingWallUpgradeApplied = true;
      object.visible = false;

      const module = buildProcessBuilding(THREE, this, {
        x: object.position.x,
        y: object.position.y - params.height / 2,
        z: object.position.z,
        width: params.width,
        depth: params.depth,
        height: params.height,
      });
      module.userData.upgradedFromLegacyShell = true;
    }

    return result;
  };
}
