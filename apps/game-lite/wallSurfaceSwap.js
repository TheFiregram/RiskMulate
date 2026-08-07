let cachedPaintedBuildingMaterial;
let cachedDirtyConcreteFenceMaterial;

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

function makeDirtyConcreteAlbedoCanvas(size = 512, seed = 202) {
  const node = canvas(size);
  const ctx = node.getContext('2d');
  const random = seededRandom(seed);

  ctx.fillStyle = '#88857c';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 9000; i += 1) {
    const tone = 108 + Math.floor(random() * 58);
    const warm = Math.max(0, tone - Math.floor(random() * 10));
    ctx.globalAlpha = 0.025 + random() * 0.08;
    ctx.fillStyle = `rgb(${tone},${warm},${Math.max(0, warm - 5)})`;
    const dot = 0.3 + random() * 2.2;
    ctx.fillRect(random() * size, random() * size, dot, dot);
  }

  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = '#66625a';
  ctx.lineWidth = Math.max(1, size / 512);
  for (const y of [size * 0.33, size * 0.66]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(size * 0.5, 0);
  ctx.lineTo(size * 0.5, size);
  ctx.stroke();

  ctx.globalAlpha = 0.28;
  for (const y of [size * 0.165, size * 0.5, size * 0.835]) {
    for (const x of [size * 0.25, size * 0.75]) {
      ctx.fillStyle = '#5b5750';
      ctx.beginPath();
      ctx.arc(x, y, size * 0.006, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#aaa69b';
      ctx.beginPath();
      ctx.arc(x - size * 0.0015, y - size * 0.0015, size * 0.0024, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.28;
    }
  }

  for (let i = 0; i < 82; i += 1) {
    const x = random() * size;
    const y = random() * size * 0.8;
    const height = size * (0.04 + random() * 0.24);
    const width = 1 + random() * 6;
    const strength = 0.08 + random() * 0.16;
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, 'rgba(54,49,43,0)');
    gradient.addColorStop(0.32, `rgba(54,49,43,${strength})`);
    gradient.addColorStop(1, 'rgba(54,49,43,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
  }

  for (let i = 0; i < 55; i += 1) {
    const x = random() * size;
    const y = size * (0.55 + random() * 0.42);
    const radius = size * (0.004 + random() * 0.025);
    ctx.globalAlpha = 0.035 + random() * 0.09;
    ctx.fillStyle = random() > 0.5 ? '#4e4a43' : '#9a8e7b';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const baseGrime = ctx.createLinearGradient(0, size * 0.65, 0, size);
  baseGrime.addColorStop(0, 'rgba(38,36,32,0)');
  baseGrime.addColorStop(1, 'rgba(38,36,32,0.34)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = baseGrime;
  ctx.fillRect(0, size * 0.65, size, size * 0.35);

  return node;
}

function makeDirtyConcreteHeightCanvas(size = 512, seed = 203) {
  const node = canvas(size);
  const ctx = node.getContext('2d');
  const random = seededRandom(seed);
  const image = ctx.createImageData(size, size);

  for (let i = 0; i < image.data.length; i += 4) {
    const value = 146 + Math.floor((random() - 0.5) * 52);
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);

  ctx.fillStyle = '#777';
  ctx.globalAlpha = 0.85;
  const seam = Math.max(2, Math.round(size * 0.004));
  for (const y of [size * 0.33, size * 0.66]) ctx.fillRect(0, y - seam / 2, size, seam);
  ctx.fillRect(size * 0.5 - seam / 2, 0, seam, size);

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

function getDirtyConcreteFenceMaterial(THREE) {
  if (cachedDirtyConcreteFenceMaterial) return cachedDirtyConcreteFenceMaterial;
  cachedDirtyConcreteFenceMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture(THREE, makeDirtyConcreteAlbedoCanvas()),
    bumpMap: texture(THREE, makeDirtyConcreteHeightCanvas()),
    bumpScale: 0.018,
    roughness: 0.96,
    metalness: 0.01,
  });
  return cachedDirtyConcreteFenceMaterial;
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

function dirtyConcreteMaterialForFenceMesh(THREE, mesh) {
  const base = getDirtyConcreteFenceMaterial(THREE);
  const material = base.clone();
  const params = mesh.geometry?.parameters || {};
  const width = Math.max(0.2, params.width || 2);
  const height = Math.max(0.2, params.height || 1);
  const tileWidth = 2.4;
  const tileHeight = 2.5;
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

function swapFenceToDirtyConcrete(THREE, object) {
  const wallType = String(object?.userData?.wallType || '');
  if (!wallType.startsWith('painted-concrete')) return;

  object.traverse((node) => {
    if (!node?.isMesh || node.userData.surfaceSwapApplied) return;
    if (!node.name.includes('PaintedBand') && !node.name.includes('UpperConcrete')) return;
    node.material = dirtyConcreteMaterialForFenceMesh(THREE, node);
    node.userData.surfaceSwapApplied = 'dirty-concrete-fence';
  });
  object.userData.surfaceSwapApplied = 'dirty-concrete-fence';
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
      swapFenceToDirtyConcrete(THREE, object);
    }
    return result;
  };
}
