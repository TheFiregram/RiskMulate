const WALL_GRID = 1;
const WALL_HEIGHT = 2.5;
const WALL_THICKNESS = 0.2;
const WALL_BASE_HEIGHT = 0.18;
const WALL_PAINT_BAND_HEIGHT = 0.68;
const WALL_CAP_HEIGHT = 0.09;

let cachedWallMaterials;

export const PAINTED_CONCRETE_WALL_DIMENSIONS = Object.freeze({
  grid: WALL_GRID,
  height: WALL_HEIGHT,
  thickness: WALL_THICKNESS,
  baseHeight: WALL_BASE_HEIGHT,
  paintedBandHeight: WALL_PAINT_BAND_HEIGHT,
  capHeight: WALL_CAP_HEIGHT,
});

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function colorChannels(THREE, color) {
  const c = new THREE.Color(color);
  return {
    r: Math.round(c.r * 255),
    g: Math.round(c.g * 255),
    b: Math.round(c.b * 255),
  };
}

function createSurfaceCanvas(THREE, {
  color,
  seed,
  size = 384,
  variation = 18,
  dirt = 0.16,
  paint = false,
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  const data = image.data;
  const random = seededRandom(seed);
  const base = colorChannels(THREE, color);

  for (let y = 0; y < size; y += 1) {
    const lowerGrime = Math.max(0, (y / size - 0.64) * 2.8);
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const noise = (random() - 0.5) * variation;
      const broad = Math.sin(x * 0.034) * 2.1 + Math.sin(y * 0.021) * 2.7;
      const grime = lowerGrime * dirt * 95 * (0.4 + random() * 0.6);
      let r = base.r + noise + broad - grime;
      let g = base.g + noise + broad - grime;
      let b = base.b + noise + broad - grime;

      if (random() < 0.0065) {
        const pore = 32 + random() * 46;
        r -= pore;
        g -= pore;
        b -= pore;
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);

  // Horizontal form-work lines keep repeated bays visually connected.
  ctx.globalAlpha = paint ? 0.11 : 0.18;
  ctx.strokeStyle = paint ? '#31433f' : '#5b574e';
  ctx.lineWidth = 1;
  for (const y of [size * 0.34, size * 0.68]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Fine downward staining.
  ctx.globalAlpha = paint ? 0.09 : 0.13;
  for (let i = 0; i < 28; i += 1) {
    const x = random() * size;
    const y = random() * size * 0.78;
    const h = size * (0.04 + random() * 0.22);
    const w = 1 + random() * 4;
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, 'rgba(66,54,45,0)');
    gradient.addColorStop(0.35, 'rgba(66,54,45,0.7)');
    gradient.addColorStop(1, 'rgba(66,54,45,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
  }

  if (paint) {
    // A few small chips reveal a neutral concrete tone beneath the painted strip.
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#9b978d';
    for (let i = 0; i < 34; i += 1) {
      const x = random() * size;
      const y = random() * size;
      const w = 1 + random() * 7;
      const h = 1 + random() * 4;
      ctx.fillRect(x, y, w, h);
    }
  }

  ctx.globalAlpha = 1;
  return canvas;
}

function createHeightCanvas(seed, size = 384) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  const random = seededRandom(seed);

  for (let i = 0; i < image.data.length; i += 4) {
    const v = 112 + Math.floor((random() - 0.5) * 64);
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
}

function makeTexture(THREE, canvas, repeatX = 2, repeatY = 2) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 2;
  texture.needsUpdate = true;
  return texture;
}

function createMaterial(THREE, {
  name,
  color,
  seed,
  roughness,
  metalness = 0,
  bumpScale = 0.025,
  variation = 18,
  dirt = 0.16,
  paint = false,
  repeat = [2, 2],
} = {}) {
  const map = makeTexture(
    THREE,
    createSurfaceCanvas(THREE, { color, seed, variation, dirt, paint }),
    repeat[0],
    repeat[1],
  );
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = makeTexture(
    THREE,
    createHeightCanvas(seed + 101),
    repeat[0],
    repeat[1],
  );

  return new THREE.MeshStandardMaterial({
    name,
    color: 0xffffff,
    map,
    bumpMap,
    bumpScale,
    roughness,
    metalness,
  });
}

export function getPaintedConcreteWallMaterials(THREE) {
  if (cachedWallMaterials) return cachedWallMaterials;

  cachedWallMaterials = {
    upper: createMaterial(THREE, {
      name: 'PaintedConcrete_Upper',
      color: 0xb9b5aa,
      seed: 2404,
      roughness: 0.9,
      bumpScale: 0.026,
      variation: 18,
      dirt: 0.16,
      repeat: [2, 2.5],
    }),
    paintedBand: createMaterial(THREE, {
      name: 'PaintedConcrete_GreenBand',
      color: 0x627670,
      seed: 2414,
      roughness: 0.84,
      bumpScale: 0.02,
      variation: 13,
      dirt: 0.11,
      paint: true,
      repeat: [2, 1.15],
    }),
    concreteBase: createMaterial(THREE, {
      name: 'PaintedConcrete_Base',
      color: 0x777169,
      seed: 2424,
      roughness: 0.94,
      bumpScale: 0.034,
      variation: 23,
      dirt: 0.2,
      repeat: [2, 0.55],
    }),
    metal: createMaterial(THREE, {
      name: 'WallCap_Metal',
      color: 0x666b69,
      seed: 2434,
      roughness: 0.63,
      metalness: 0.7,
      bumpScale: 0.012,
      variation: 10,
      dirt: 0.05,
      repeat: [2, 0.4],
    }),
    rusted: createMaterial(THREE, {
      name: 'WallCap_RustedMetal',
      color: 0x704d38,
      seed: 2444,
      roughness: 0.85,
      metalness: 0.46,
      bumpScale: 0.018,
      variation: 29,
      dirt: 0.24,
      repeat: [2, 0.4],
    }),
  };

  return cachedWallMaterials;
}

function markMesh(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(THREE, group, width, height, depth, material, x = 0, y = 0, z = 0) {
  const object = markMesh(new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material));
  object.position.set(x, y, z);
  group.add(object);
  return object;
}

function materialForBase(materials, baseType) {
  if (baseType === 'metal') return materials.metal;
  if (baseType === 'rusted') return materials.rusted;
  return materials.concreteBase;
}

function materialForCap(materials, capType) {
  if (capType === 'metal' || capType === 'corrugated') return materials.metal;
  if (capType === 'rusted') return materials.rusted;
  return materials.concreteBase;
}

function addSnapPoint(group, name, x, y, z, rotationY = 0) {
  if (!group.userData.snapPoints) group.userData.snapPoints = [];
  group.userData.snapPoints.push({ name, position: [x, y, z], rotationY });
}

function addCollider(group, x, y, z, width, height, depth) {
  if (!group.userData.colliders) group.userData.colliders = [];
  group.userData.colliders.push({
    type: 'box',
    center: [x, y, z],
    size: [width, height, depth],
  });
}

function buildStraightGroup(THREE, options = {}) {
  const {
    length = 2,
    height = WALL_HEIGHT,
    thickness = WALL_THICKNESS,
    baseType = 'concrete',
    capType = 'concrete',
    paintedBandHeight = WALL_PAINT_BAND_HEIGHT,
    name = 'PaintedConcrete_Straight',
  } = options;

  const materials = getPaintedConcreteWallMaterials(THREE);
  const group = new THREE.Group();
  group.name = name;
  group.userData.wall = true;
  group.userData.wallType = 'painted-concrete-straight';

  const hasBase = baseType !== 'none';
  const hasCap = capType !== 'none';
  const baseHeight = hasBase ? WALL_BASE_HEIGHT : 0;
  const capHeight = hasCap ? WALL_CAP_HEIGHT : 0;
  const usableHeight = height - baseHeight - capHeight;
  const bandHeight = Math.min(paintedBandHeight, usableHeight * 0.45);
  const upperHeight = usableHeight - bandHeight;

  if (hasBase) {
    const base = box(
      THREE,
      group,
      length + 0.06,
      baseHeight,
      thickness + 0.06,
      materialForBase(materials, baseType),
      0,
      baseHeight / 2,
      0,
    );
    base.name = `${name}_Base_${baseType}`;
  }

  const band = box(
    THREE,
    group,
    length,
    bandHeight,
    thickness,
    materials.paintedBand,
    0,
    baseHeight + bandHeight / 2,
    0,
  );
  band.name = `${name}_PaintedBand`;

  const upper = box(
    THREE,
    group,
    length,
    upperHeight,
    thickness,
    materials.upper,
    0,
    baseHeight + bandHeight + upperHeight / 2,
    0,
  );
  upper.name = `${name}_UpperConcrete`;

  if (hasCap) {
    const capDepth = capType === 'concrete' ? thickness + 0.035 : thickness + 0.075;
    const cap = box(
      THREE,
      group,
      length + 0.07,
      capHeight,
      capDepth,
      materialForCap(materials, capType),
      0,
      height - capHeight / 2,
      0,
    );
    cap.name = `${name}_Cap_${capType}`;

    const lipHeight = 0.032;
    const lip = box(
      THREE,
      group,
      length + 0.1,
      lipHeight,
      capDepth + 0.025,
      materialForCap(materials, capType),
      0,
      height - capHeight - lipHeight / 2,
      0,
    );
    lip.name = `${name}_CapLip`;
  }

  // Narrow vertical joints make adjacent bays readable without large geometry cost.
  const jointDepth = thickness + 0.008;
  const jointMaterial = materials.concreteBase;
  box(THREE, group, 0.025, height - baseHeight - capHeight, jointDepth, jointMaterial, -length / 2 + 0.013, baseHeight + usableHeight / 2, 0);
  box(THREE, group, 0.025, height - baseHeight - capHeight, jointDepth, jointMaterial, length / 2 - 0.013, baseHeight + usableHeight / 2, 0);

  group.userData.dimensions = { length, height, thickness };
  addSnapPoint(group, 'left', -length / 2, 0, 0, Math.PI);
  addSnapPoint(group, 'right', length / 2, 0, 0, 0);
  addCollider(group, 0, height / 2, 0, length, height, thickness);

  return group;
}

/**
 * Reusable straight wall bay based on reference wall 04: pale concrete over a muted green painted band.
 */
export function createPaintedConcreteWallSegment(THREE, scene, options = {}) {
  const {
    x = 0,
    y = 0,
    z = 0,
    rotationY = 0,
  } = options;

  const group = buildStraightGroup(THREE, options);
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  scene?.add(group);
  return group;
}

/**
 * 90-degree modular corner. direction -1 mirrors the second arm.
 */
export function createPaintedConcreteCorner90(THREE, scene, options = {}) {
  const {
    x = 0,
    y = 0,
    z = 0,
    height = WALL_HEIGHT,
    armLength = 1,
    thickness = WALL_THICKNESS,
    rotationY = 0,
    direction = 1,
    baseType = 'concrete',
    capType = 'concrete',
    name = 'PaintedConcrete_Corner90',
  } = options;

  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  group.userData.wall = true;
  group.userData.wallType = 'painted-concrete-corner-90';

  const armA = buildStraightGroup(THREE, {
    length: armLength,
    height,
    thickness,
    baseType,
    capType,
    name: `${name}_ArmA`,
  });
  armA.position.x = armLength / 2 - thickness / 2;

  const armB = buildStraightGroup(THREE, {
    length: armLength,
    height,
    thickness,
    baseType,
    capType,
    name: `${name}_ArmB`,
  });
  armB.rotation.y = Math.PI / 2;
  armB.position.z = direction * (armLength / 2 - thickness / 2);

  group.add(armA, armB);
  addSnapPoint(group, 'arm-a-end', armLength - thickness / 2, 0, 0, 0);
  addSnapPoint(
    group,
    'arm-b-end',
    0,
    0,
    direction * (armLength - thickness / 2),
    direction > 0 ? Math.PI / 2 : -Math.PI / 2,
  );
  addCollider(group, armLength / 2, height / 2, 0, armLength, height, thickness);
  addCollider(group, 0, height / 2, direction * armLength / 2, thickness, height, armLength);

  scene?.add(group);
  return group;
}

export function createWallTopCap(THREE, scene, options = {}) {
  const {
    x = 0,
    y = 0,
    z = 0,
    length = 2,
    rotationY = 0,
    thickness = WALL_THICKNESS,
    capType = 'concrete',
  } = options;
  const materials = getPaintedConcreteWallMaterials(THREE);
  const group = new THREE.Group();
  group.name = `WallTopCap_${capType}`;
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  box(
    THREE,
    group,
    length + 0.07,
    WALL_CAP_HEIGHT,
    thickness + 0.06,
    materialForCap(materials, capType),
    0,
    WALL_CAP_HEIGHT / 2,
    0,
  );
  group.userData.wallType = 'painted-concrete-top-cap';
  scene?.add(group);
  return group;
}

export function createWallBase(THREE, scene, options = {}) {
  const {
    x = 0,
    y = 0,
    z = 0,
    length = 2,
    rotationY = 0,
    thickness = WALL_THICKNESS,
    baseType = 'concrete',
  } = options;
  const materials = getPaintedConcreteWallMaterials(THREE);
  const group = new THREE.Group();
  group.name = `WallBase_${baseType}`;
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  if (baseType !== 'none') {
    box(
      THREE,
      group,
      length + 0.06,
      WALL_BASE_HEIGHT,
      thickness + 0.06,
      materialForBase(materials, baseType),
      0,
      WALL_BASE_HEIGHT / 2,
      0,
    );
  }
  group.userData.wallType = 'painted-concrete-base';
  scene?.add(group);
  return group;
}

export function createWallEndCap(THREE, scene, options = {}) {
  const {
    x = 0,
    y = 0,
    z = 0,
    height = WALL_HEIGHT,
    rotationY = 0,
    thickness = WALL_THICKNESS,
    materialType = 'concrete',
  } = options;
  const materials = getPaintedConcreteWallMaterials(THREE);
  const material = materialType === 'metal'
    ? materials.metal
    : materialType === 'rusted'
      ? materials.rusted
      : materials.concreteBase;
  const group = new THREE.Group();
  group.name = `WallEndCap_${materialType}`;
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  box(THREE, group, thickness + 0.055, height, thickness + 0.04, material, 0, height / 2, 0);
  group.userData.wallType = 'painted-concrete-end-cap';
  addCollider(group, 0, height / 2, 0, thickness + 0.055, height, thickness + 0.04);
  scene?.add(group);
  return group;
}

export function snapWallTransform(object, options = {}) {
  const grid = options.grid ?? WALL_GRID;
  const rotationStep = options.rotationStep ?? Math.PI / 2;
  const x = options.x ?? object.position.x;
  const z = options.z ?? object.position.z;
  const rotationY = options.rotationY ?? object.rotation.y;
  object.position.x = Math.round(x / grid) * grid;
  object.position.z = Math.round(z / grid) * grid;
  object.rotation.y = Math.round(rotationY / rotationStep) * rotationStep;
  return object;
}

export function getWallColliderDescriptors(object) {
  return object.userData.colliders || [];
}

/**
 * Compatibility aliases retained so existing plant code keeps working.
 */
export function createConcreteWallSegment(THREE, scene, options = {}) {
  return createPaintedConcreteWallSegment(THREE, scene, options);
}

export function createConcreteCorner(THREE, scene, options = {}) {
  return createPaintedConcreteCorner90(THREE, scene, {
    ...options,
    armLength: options.armLength ?? options.legLength ?? 1,
  });
}

/**
 * Perimeter builder used by the live game. Repeated bays share one material set and snap to the same metric scale.
 */
export function buildConcretePerimeter(THREE, scene, options = {}) {
  const {
    halfSize = 27.2,
    segmentLength = 4,
    height = WALL_HEIGHT,
    baseType = 'concrete',
    capType = 'concrete',
  } = options;

  const span = halfSize * 2;
  const count = Math.max(1, Math.floor(span / segmentLength));
  const actualLength = span / count;

  for (let i = 0; i < count; i += 1) {
    const offset = -halfSize + actualLength / 2 + i * actualLength;

    createPaintedConcreteWallSegment(THREE, scene, {
      x: offset,
      z: -halfSize,
      length: actualLength,
      height,
      rotationY: 0,
      baseType,
      capType,
    });
    createPaintedConcreteWallSegment(THREE, scene, {
      x: offset,
      z: halfSize,
      length: actualLength,
      height,
      rotationY: 0,
      baseType,
      capType,
    });
    createPaintedConcreteWallSegment(THREE, scene, {
      x: -halfSize,
      z: offset,
      length: actualLength,
      height,
      rotationY: Math.PI / 2,
      baseType,
      capType,
    });
    createPaintedConcreteWallSegment(THREE, scene, {
      x: halfSize,
      z: offset,
      length: actualLength,
      height,
      rotationY: Math.PI / 2,
      baseType,
      capType,
    });
  }

  // Dedicated corner modules close the four 90-degree turns.
  createPaintedConcreteCorner90(THREE, scene, {
    x: -halfSize,
    z: -halfSize,
    height,
    rotationY: 0,
    direction: 1,
    armLength: 1,
    baseType,
    capType,
  });
  createPaintedConcreteCorner90(THREE, scene, {
    x: halfSize,
    z: -halfSize,
    height,
    rotationY: Math.PI / 2,
    direction: 1,
    armLength: 1,
    baseType,
    capType,
  });
  createPaintedConcreteCorner90(THREE, scene, {
    x: halfSize,
    z: halfSize,
    height,
    rotationY: Math.PI,
    direction: 1,
    armLength: 1,
    baseType,
    capType,
  });
  createPaintedConcreteCorner90(THREE, scene, {
    x: -halfSize,
    z: halfSize,
    height,
    rotationY: -Math.PI / 2,
    direction: 1,
    armLength: 1,
    baseType,
    capType,
  });
}
