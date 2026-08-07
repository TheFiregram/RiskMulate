let cachedWallMaterials;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createConcreteTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(2018);

  ctx.fillStyle = '#706f69';
  ctx.fillRect(0, 0, 256, 256);

  // Fine mineral variation.
  for (let i = 0; i < 4200; i += 1) {
    const tone = 78 + Math.floor(random() * 70);
    ctx.globalAlpha = 0.025 + random() * 0.07;
    ctx.fillStyle = `rgb(${tone},${tone},${Math.max(0, tone - 5)})`;
    const size = 0.35 + random() * 1.8;
    ctx.fillRect(random() * 256, random() * 256, size, size);
  }

  // Form-work seams.
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = '#494a46';
  ctx.lineWidth = 1;
  for (const y of [86, 171]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.lineTo(128, 256);
  ctx.stroke();

  // Anchor impressions.
  ctx.globalAlpha = 0.38;
  for (const y of [43, 128, 214]) {
    for (const x of [64, 192]) {
      ctx.fillStyle = '#4c4b47';
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a8981';
      ctx.beginPath();
      ctx.arc(x - 0.7, y - 0.7, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Rain streaking and grime concentrated near the base.
  for (let i = 0; i < 95; i += 1) {
    const x = random() * 256;
    const width = 1 + random() * 5;
    const height = 18 + random() * 90;
    const y = random() * 95;
    ctx.globalAlpha = 0.025 + random() * 0.11;
    ctx.fillStyle = random() > 0.55 ? '#34342f' : '#8c8170';
    ctx.fillRect(x, y, width, height);
  }

  for (let i = 0; i < 150; i += 1) {
    const x = random() * 256;
    const y = 190 + random() * 66;
    const radius = 1 + random() * 8;
    ctx.globalAlpha = 0.04 + random() * 0.1;
    ctx.fillStyle = '#393a33';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.8, 1);
  texture.anisotropy = 2;
  return texture;
}

function getWallMaterials(THREE) {
  if (cachedWallMaterials) return cachedWallMaterials;
  const concreteMap = createConcreteTexture(THREE);

  cachedWallMaterials = {
    concrete: new THREE.MeshStandardMaterial({
      color: 0x8a8982,
      map: concreteMap,
      roughness: 0.94,
      metalness: 0.02,
    }),
    base: new THREE.MeshStandardMaterial({
      color: 0x5a5b56,
      roughness: 0.97,
      metalness: 0.01,
    }),
    cap: new THREE.MeshStandardMaterial({
      color: 0x76766f,
      roughness: 0.9,
      metalness: 0.02,
    }),
    stain: new THREE.MeshStandardMaterial({
      color: 0x36352f,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.18,
    }),
  };
  return cachedWallMaterials;
}

function box(THREE, group, width, height, depth, material, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  object.position.set(x, y, z);
  group.add(object);
  return object;
}

function addStainPatch(THREE, group, width, height, x, y, z, rotationY = 0) {
  const materials = getWallMaterials(THREE);
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(width, height), materials.stain);
  patch.position.set(x, y, z);
  patch.rotation.y = rotationY;
  group.add(patch);
  return patch;
}

export function createConcreteWallSegment(THREE, scene, options = {}) {
  const {
    x = 0,
    y = 0,
    z = 0,
    length = 4,
    height = 2.5,
    thickness = 0.34,
    rotationY = 0,
    stainVariant = 0,
  } = options;

  const materials = getWallMaterials(THREE);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  group.userData.wall = true;
  group.userData.wallType = 'concrete-straight';

  // Main cast-concrete panel.
  box(THREE, group, length, height - 0.22, thickness, materials.concrete, 0, 0.18 + (height - 0.22) / 2, 0);

  // Heavy kick/base and cap make the wall read as a purpose-built industrial perimeter wall.
  box(THREE, group, length + 0.12, 0.34, thickness + 0.16, materials.base, 0, 0.17, 0);
  box(THREE, group, length + 0.1, 0.16, thickness + 0.1, materials.cap, 0, height - 0.08, 0);

  // Vertical construction joint trim at both ends.
  box(THREE, group, 0.08, height - 0.34, thickness + 0.04, materials.base, -length / 2 + 0.04, height / 2, 0);
  box(THREE, group, 0.08, height - 0.34, thickness + 0.04, materials.base, length / 2 - 0.04, height / 2, 0);

  // A few subtle stains keep repeated modules from looking copied.
  const offset = ((stainVariant % 5) - 2) * 0.28;
  addStainPatch(THREE, group, 0.7, 0.72, -0.65 + offset, 0.68, -(thickness / 2 + 0.002));
  addStainPatch(THREE, group, 0.42, 0.9, 0.82 - offset * 0.4, 1.18, -(thickness / 2 + 0.003));

  scene.add(group);
  return group;
}

export function createConcreteCorner(THREE, scene, options = {}) {
  const {
    x = 0,
    y = 0,
    z = 0,
    height = 2.5,
    legLength = 2,
    thickness = 0.34,
    rotationY = 0,
  } = options;

  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  group.userData.wall = true;
  group.userData.wallType = 'concrete-corner';

  // Two shortened straight modules share a reinforced concrete corner post.
  const a = new THREE.Group();
  const b = new THREE.Group();
  group.add(a, b);

  const materials = getWallMaterials(THREE);
  box(THREE, a, legLength, height - 0.22, thickness, materials.concrete, legLength / 2, 0.18 + (height - 0.22) / 2, 0);
  box(THREE, a, legLength + 0.1, 0.34, thickness + 0.16, materials.base, legLength / 2, 0.17, 0);
  box(THREE, a, legLength + 0.08, 0.16, thickness + 0.1, materials.cap, legLength / 2, height - 0.08, 0);

  b.rotation.y = Math.PI / 2;
  box(THREE, b, legLength, height - 0.22, thickness, materials.concrete, legLength / 2, 0.18 + (height - 0.22) / 2, 0);
  box(THREE, b, legLength + 0.1, 0.34, thickness + 0.16, materials.base, legLength / 2, 0.17, 0);
  box(THREE, b, legLength + 0.08, 0.16, thickness + 0.1, materials.cap, legLength / 2, height - 0.08, 0);

  box(THREE, group, thickness + 0.22, height, thickness + 0.22, materials.base, 0, height / 2, 0);

  scene.add(group);
  return group;
}

export function buildConcretePerimeter(THREE, scene, options = {}) {
  const {
    halfSize = 27.2,
    segmentLength = 4,
    height = 2.5,
  } = options;

  const span = halfSize * 2;
  const count = Math.floor(span / segmentLength);
  const actualLength = span / count;

  for (let i = 0; i < count; i += 1) {
    const offset = -halfSize + actualLength / 2 + i * actualLength;

    createConcreteWallSegment(THREE, scene, {
      x: offset,
      z: -halfSize,
      length: actualLength,
      height,
      rotationY: 0,
      stainVariant: i,
    });
    createConcreteWallSegment(THREE, scene, {
      x: offset,
      z: halfSize,
      length: actualLength,
      height,
      rotationY: 0,
      stainVariant: i + 2,
    });
    createConcreteWallSegment(THREE, scene, {
      x: -halfSize,
      z: offset,
      length: actualLength,
      height,
      rotationY: Math.PI / 2,
      stainVariant: i + 3,
    });
    createConcreteWallSegment(THREE, scene, {
      x: halfSize,
      z: offset,
      length: actualLength,
      height,
      rotationY: Math.PI / 2,
      stainVariant: i + 1,
    });
  }

  // Dedicated 90-degree corner models close and reinforce the four perimeter turns.
  createConcreteCorner(THREE, scene, { x: -halfSize, z: -halfSize, height, rotationY: 0 });
  createConcreteCorner(THREE, scene, { x: halfSize, z: -halfSize, height, rotationY: Math.PI / 2 });
  createConcreteCorner(THREE, scene, { x: halfSize, z: halfSize, height, rotationY: Math.PI });
  createConcreteCorner(THREE, scene, { x: -halfSize, z: halfSize, height, rotationY: -Math.PI / 2 });
}
