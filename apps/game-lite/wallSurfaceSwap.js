let cachedPaintedBuildingMaterial;
let cachedCinderFenceMaterial;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function canvas(size = 512) {
  const node = document.createElement('canvas');
  node.width = size;
  node.height = size;
  return node;
}

function makePaintedConcreteCanvas(size = 512, seed = 4040) {
  const node = canvas(size);
  const ctx = node.getContext('2d');
  const random = seededRandom(seed);
  const bandStart = Math.floor(size * 0.74);

  ctx.fillStyle = '#bbb7ac';
  ctx.fillRect(0, 0, size, bandStart);
  ctx.fillStyle = '#627670';
  ctx.fillRect(0, bandStart, size, size - bandStart);

  for (let i = 0; i < 7200; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const dot = 0.35 + random() * 2;
    ctx.globalAlpha = 0.015 + random() * 0.055;
    ctx.fillStyle = random() > 0.52 ? '#f1ece2' : '#302f2b';
    ctx.fillRect(x, y, dot, dot);
  }

  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 34; i += 1) {
    const x = random() * size;
    const y = random() * size * 0.82;
    const height = size * (0.04 + random() * 0.2);
    const width = 1 + random() * 5;
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, 'rgba(80,67,54,0)');
    gradient.addColorStop(0.38, 'rgba(80,67,54,0.65)');
    gradient.addColorStop(1, 'rgba(80,67,54,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
  }

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#aaa69b';
  for (let i = 0; i < 44; i += 1) {
    const x = random() * size;
    const y = bandStart + random() * (size - bandStart);
    ctx.fillRect(x, y, 1 + random() * 7, 1 + random() * 4);
  }

  const grime = ctx.createLinearGradient(0, size * 0.64, 0, size);
  grime.addColorStop(0, 'rgba(60,53,46,0)');
  grime.addColorStop(1, 'rgba(60,53,46,0.25)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = grime;
  ctx.fillRect(0, size * 0.64, size, size * 0.36);

  return node;
}

function makeCinderAlbedoCanvas(size = 512, seed = 8808) {
  const node = canvas(size);
  const ctx = node.getContext('2d');
  const random = seededRandom(seed);
  const cols = 4;
  const rows = 8;
  const blockWidth = size / cols;
  const rowHeight = size / rows;
  const mortar = Math.max(4, Math.round(size * 0.008));

  ctx.fillStyle = '#9f9d94';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 6200; i += 1) {
    const tone = 136 + Math.floor(random() * 42);
    ctx.globalAlpha = 0.025 + random() * 0.07;
    ctx.fillStyle = `rgb(${tone},${tone},${Math.max(0, tone - 5)})`;
    const dot = 0.5 + random() * 2.1;
    ctx.fillRect(random() * size, random() * size, dot, dot);
  }

  ctx.globalAlpha = 0.96;
  ctx.fillStyle = '#c2beb4';
  for (let row = 0; row < rows; row += 1) {
    const y = row * rowHeight;
    const offset = row % 2 === 0 ? 0 : blockWidth / 2;
    ctx.fillRect(0, y, size, mortar);
    for (let col = -1; col < cols + 1; col += 1) {
      const x = col * blockWidth + offset;
      ctx.fillRect(x - mortar / 2, y, mortar, rowHeight);
    }
  }

  const grime = ctx.createLinearGradient(0, size * 0.7, 0, size);
  grime.addColorStop(0, 'rgba(77,69,59,0)');
  grime.addColorStop(1, 'rgba(77,69,59,0.3)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = grime;
  ctx.fillRect(0, size * 0.7, size, size * 0.3);

  return node;
}

function makeCinderHeightCanvas(size = 512) {
  const node = canvas(size);
  const ctx = node.getContext('2d');
  const cols = 4;
  const rows = 8;
  const blockWidth = size / cols;
  const rowHeight = size / rows;
  const mortar = Math.max(4, Math.round(size * 0.008));

  ctx.fillStyle = '#a5a5a5';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#777';
  for (let row = 0; row < rows; row += 1) {
    const y = row * rowHeight;
    const offset = row % 2 === 0 ? 0 : blockWidth / 2;
    ctx.fillRect(0, y, size, mortar);
    for (let col = -1; col < cols + 1; col += 1) {
      const x = col * blockWidth + offset;
      ctx.fillRect(x - mortar / 2, y, mortar, rowHeight);
    }
  }
  return node;
}

function texture(THREE, source) {
  const result = new THREE.CanvasTexture(source);
  result.colorSpace = THREE.SRGBColorSpace;
  result.wrapS = THREE.RepeatWrapping;
  result.wrapT = THREE.RepeatWrapping;
  result.needsUpdate = true;
  return result;
}

function getPaintedBuildingMaterial(THREE) {
  if (cachedPaintedBuildingMaterial) return cachedPaintedBuildingMaterial;
  cachedPaintedBuildingMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture(THREE, makePaintedConcreteCanvas()),
    roughness: 0.9,
    metalness: 0.02,
  });
  return cachedPaintedBuildingMaterial;
}

function getCinderFenceMaterial(THREE) {
  if (cachedCinderFenceMaterial) return cachedCinderFenceMaterial;
  cachedCinderFenceMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture(THREE, makeCinderAlbedoCanvas()),
    bumpMap: texture(THREE, makeCinderHeightCanvas()),
    bumpScale: 0.022,
    roughness: 0.95,
    metalness: 0.02,
  });
  return cachedCinderFenceMaterial;
}

function paintedMaterialForBuildingMesh(THREE, mesh) {
  const base = getPaintedBuildingMaterial(THREE);
  const material = base.clone();
  const width = Math.max(1, mesh.geometry?.parameters?.width || 4);
  material.map = base.map.clone();
  material.map.repeat.set(width / 2, 1);
  material.map.needsUpdate = true;
  return material;
}

function cinderMaterialForFenceMesh(THREE, mesh) {
  const base = getCinderFenceMaterial(THREE);
  const material = base.clone();
  const params = mesh.geometry?.parameters || {};
  const width = Math.max(0.2, params.width || 2);
  const height = Math.max(0.2, params.height || 1);
  const tileWidth = 2;
  const tileHeight = 1.6;
  const bottom = (mesh.position?.y || 0) - height / 2;
  const yOffset = ((bottom / tileHeight) % 1 + 1) % 1;

  material.map = base.map.clone();
  material.map.repeat.set(width / tileWidth, height / tileHeight);
  material.map.offset.set(0, yOffset);
  material.map.needsUpdate = true;

  material.bumpMap = base.bumpMap.clone();
  material.bumpMap.repeat.set(width / tileWidth, height / tileHeight);
  material.bumpMap.offset.set(0, yOffset);
  material.bumpMap.needsUpdate = true;

  return material;
}

function swapBuildingToFenceSurface(THREE, object) {
  const isBuilding = object?.userData?.buildingModule === true
    || String(object?.userData?.wallType || '').startsWith('building-');
  if (!isBuilding) return;

  object.traverse((node) => {
    if (!node?.isMesh || node.userData.surfaceSwapApplied) return;
    const params = node.geometry?.parameters;
    if (!params || node.geometry.type !== 'BoxGeometry') return;

    const looksLikeCinderFacade = node.material?.bumpMap
      && node.material?.roughness >= 0.94
      && params.height > 1
      && params.depth <= 0.4;
    if (!looksLikeCinderFacade) return;

    node.material = paintedMaterialForBuildingMesh(THREE, node);
    node.userData.surfaceSwapApplied = 'painted-concrete-building';
  });
}

function swapFenceToBuildingSurface(THREE, object) {
  const wallType = String(object?.userData?.wallType || '');
  if (!wallType.startsWith('painted-concrete')) return;

  object.traverse((node) => {
    if (!node?.isMesh || node.userData.surfaceSwapApplied) return;
    if (!node.name.includes('PaintedBand') && !node.name.includes('UpperConcrete')) return;
    node.material = cinderMaterialForFenceMesh(THREE, node);
    node.userData.surfaceSwapApplied = 'cinder-block-fence';
  });
  object.userData.surfaceSwapApplied = 'cinder-block-fence';
}

export function installWallSurfaceSwap(THREE) {
  const proto = THREE.Scene.prototype;
  if (proto.__riskmulateWallSurfaceSwapInstalled) return;

  const previousAdd = proto.add;
  Object.defineProperty(proto, '__riskmulateWallSurfaceSwapInstalled', {
    value: true,
    configurable: true,
  });

  proto.add = function swappedSceneAdd(...objects) {
    const result = previousAdd.apply(this, objects);
    for (const object of objects) {
      swapBuildingToFenceSurface(THREE, object);
      swapFenceToBuildingSurface(THREE, object);
    }
    return result;
  };
}
