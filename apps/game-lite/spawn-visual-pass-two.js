function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function canvasTexture(THREE, size, draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 2;
  return texture;
}

function makeAsphaltTexture(THREE) {
  const random = seededRandom(90421);
  return canvasTexture(THREE, 512, (ctx, width, height) => {
    ctx.fillStyle = '#5c6264';
    ctx.fillRect(0, 0, width, height);

    for (let index = 0; index < 12000; index += 1) {
      const tone = 62 + Math.floor(random() * 54);
      const warm = Math.floor(random() * 5);
      ctx.globalAlpha = 0.04 + random() * 0.12;
      ctx.fillStyle = `rgb(${tone + warm},${tone + warm},${tone})`;
      const radius = 0.45 + random() * 1.45;
      ctx.fillRect(random() * width, random() * height, radius, radius);
    }

    ctx.lineCap = 'round';
    for (let index = 0; index < 12; index += 1) {
      const x = random() * width;
      const y = random() * height;
      ctx.globalAlpha = 0.08 + random() * 0.08;
      ctx.strokeStyle = '#353a3c';
      ctx.lineWidth = 0.7 + random() * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let step = 1; step <= 4; step += 1) {
        ctx.lineTo(x + step * (8 + random() * 11), y + (random() - 0.5) * 18);
      }
      ctx.stroke();
    }

    for (let index = 0; index < 18; index += 1) {
      ctx.globalAlpha = 0.035 + random() * 0.05;
      ctx.fillStyle = '#303638';
      ctx.beginPath();
      ctx.ellipse(
        random() * width,
        random() * height,
        10 + random() * 32,
        3 + random() * 8,
        random() * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, 2.1, 13.5);
}

function makeApronTexture(THREE) {
  const random = seededRandom(77113);
  return canvasTexture(THREE, 512, (ctx, width, height) => {
    ctx.fillStyle = '#777a75';
    ctx.fillRect(0, 0, width, height);
    for (let index = 0; index < 7000; index += 1) {
      const tone = 92 + Math.floor(random() * 46);
      ctx.globalAlpha = 0.025 + random() * 0.07;
      ctx.fillStyle = `rgb(${tone},${tone},${tone - 3})`;
      const s = 0.4 + random() * 1.5;
      ctx.fillRect(random() * width, random() * height, s, s);
    }
    for (let index = 0; index < 24; index += 1) {
      ctx.globalAlpha = 0.035 + random() * 0.05;
      ctx.fillStyle = index % 3 === 0 ? '#4c504d' : '#89887f';
      ctx.beginPath();
      ctx.ellipse(
        random() * width,
        random() * height,
        4 + random() * 14,
        2 + random() * 7,
        random() * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, 4, 3);
}

function addPlane(THREE, root, width, depth, material, x, y, z, rotation = 0) {
  const object = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  object.position.set(x, y, z);
  object.rotation.set(-Math.PI / 2, 0, rotation);
  object.receiveShadow = true;
  object.renderOrder = 3;
  root.add(object);
  return object;
}

function addBox(THREE, root, size, position, material, castShadow = true) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  object.position.set(...position);
  object.castShadow = castShadow;
  object.receiveShadow = true;
  root.add(object);
  return object;
}

function buildRoadCorrection(THREE, scene) {
  const root = new THREE.Group();
  root.name = 'riskmulate-spawn-surface-correction';
  root.userData.visualOnly = true;
  scene.add(root);

  const asphalt = new THREE.MeshStandardMaterial({
    color: 0xb2b6b5,
    map: makeAsphaltTexture(THREE),
    roughness: 0.89,
    metalness: 0.01,
  });
  const concrete = new THREE.MeshStandardMaterial({
    color: 0xa6a69f,
    map: makeApronTexture(THREE),
    roughness: 0.94,
    metalness: 0.01,
  });
  const seam = new THREE.MeshStandardMaterial({ color: 0x454b4b, roughness: 0.98, metalness: 0 });
  const fadedYellow = new THREE.MeshStandardMaterial({
    color: 0xc5a642,
    roughness: 0.9,
    metalness: 0.01,
    transparent: true,
    opacity: 0.78,
  });
  const patch = new THREE.MeshStandardMaterial({
    color: 0x464c4e,
    roughness: 0.96,
    metalness: 0,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
  });

  // Covers the previous near-black road without changing any collision or navigation bounds.
  addPlane(THREE, root, 11.72, 69.4, asphalt, 0, 0.055, 4);

  // A concrete receiving apron around the spawn point gives the player a believable staging surface.
  addPlane(THREE, root, 17.5, 12.8, concrete, 0, 0.061, 16.4);

  for (const z of [11.8, 15.0, 18.2, 21.4]) {
    addPlane(THREE, root, 17.25, 0.055, seam, 0, 0.067, z);
  }
  for (const x of [-5.75, 5.75]) {
    addPlane(THREE, root, 0.16, 69.0, fadedYellow, x, 0.069, 4);
  }

  for (const [x, z, w, d, r] of [
    [-2.7, 7.3, 2.6, 0.65, -0.08],
    [2.2, -0.4, 2.1, 0.52, 0.05],
    [-1.3, -13.5, 3.2, 0.58, 0.03],
    [3.0, 27.4, 2.4, 0.48, -0.04],
  ]) addPlane(THREE, root, w, d, patch, x, 0.071, z, r);

  // Short, worn caution bars at the transition into the process yard.
  for (let index = 0; index < 9; index += 1) {
    addPlane(THREE, root, 0.72, 0.12, fadedYellow, -4.8 + index * 1.2, 0.073, 9.95, -0.16);
  }

  return root;
}

function makeSunTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 4, 128, 128, 124);
  gradient.addColorStop(0, 'rgba(255,244,216,0.98)');
  gradient.addColorStop(0.13, 'rgba(255,232,192,0.82)');
  gradient.addColorStop(0.34, 'rgba(255,212,158,0.28)');
  gradient.addColorStop(0.68, 'rgba(255,198,136,0.07)');
  gradient.addColorStop(1, 'rgba(255,198,136,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function softenSun(THREE, scene) {
  let sourceSun = null;
  scene.traverse((object) => {
    if (sourceSun || object.geometry?.type !== 'CircleGeometry' || !object.material?.isMeshBasicMaterial) return;
    if (object.position.y > 20) sourceSun = object;
  });

  if (sourceSun) sourceSun.visible = false;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeSunTexture(THREE),
    transparent: true,
    depthWrite: false,
    fog: false,
    opacity: 0.9,
  }));
  sprite.name = 'riskmulate-soft-sun';
  sprite.position.copy(sourceSun?.position || new THREE.Vector3(-54, 35, -72));
  sprite.scale.set(14, 14, 1);
  (sourceSun?.parent || scene).add(sprite);
  return sprite;
}

function buildFacadeServiceDetail(THREE, scene) {
  const root = new THREE.Group();
  root.name = 'riskmulate-building-service-detail';
  root.userData.visualOnly = true;
  scene.add(root);

  const trim = new THREE.MeshStandardMaterial({ color: 0x293336, roughness: 0.56, metalness: 0.54 });
  const door = new THREE.MeshStandardMaterial({ color: 0x465255, roughness: 0.62, metalness: 0.38 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x35515b,
    roughness: 0.16,
    metalness: 0.08,
    clearcoat: 0.52,
    clearcoatRoughness: 0.22,
  });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xc69a24, roughness: 0.58, metalness: 0.22 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x606c6d, roughness: 0.55, metalness: 0.46 });

  const addRearFacade = ({ x, z, width, prefix }) => {
    addBox(THREE, root, [width - 0.45, 0.22, 0.13], [x, 0.34, z], trim);

    const doorX = x - width * 0.27;
    addBox(THREE, root, [1.38, 2.42, 0.12], [doorX, 1.24, z - 0.03], trim);
    addBox(THREE, root, [1.18, 2.22, 0.08], [doorX, 1.22, z - 0.11], door);
    addBox(THREE, root, [0.18, 0.05, 0.05], [doorX + 0.38, 1.18, z - 0.17], yellow, false);

    const windowX = x + width * 0.02;
    addBox(THREE, root, [2.65, 1.42, 0.10], [windowX, 2.15, z - 0.04], trim);
    addBox(THREE, root, [2.43, 1.20, 0.055], [windowX, 2.15, z - 0.12], glass, false);
    for (const dx of [-0.61, 0, 0.61]) {
      addBox(THREE, root, [0.045, 1.21, 0.065], [windowX + dx, 2.15, z - 0.16], trim, false);
    }

    const panelX = x + width * 0.34;
    addBox(THREE, root, [0.88, 1.06, 0.18], [panelX, 1.16, z - 0.02], trim);
    addBox(THREE, root, [0.72, 0.88, 0.12], [panelX, 1.16, z - 0.13], panel);
    addBox(THREE, root, [0.28, 0.12, 0.14], [panelX, 1.42, z - 0.21], yellow, false);

    // Vertical conduits and a wall light give the flat rear elevation readable industrial scale.
    for (const dx of [-0.33, 0.33]) {
      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.35, 8), trim);
      conduit.position.set(panelX + dx, 0.51, z - 0.11);
      conduit.castShadow = true;
      conduit.receiveShadow = true;
      root.add(conduit);
    }

    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.12), new THREE.MeshStandardMaterial({
      color: 0xc9c1a3,
      emissive: 0xffdc9a,
      emissiveIntensity: 0.42,
      roughness: 0.45,
    }));
    lamp.position.set(doorX, 2.75, z - 0.13);
    root.add(lamp);
    root.userData[`${prefix}Facade`] = true;
  };

  // South-facing walls are what the player sees from the default spawn at z=15.
  addRearFacade({ x: -11.0, z: 7.78, width: 10.0, prefix: 'ops' });
  addRearFacade({ x: 10.5, z: 6.64, width: 9.0, prefix: 'process' });

  return root;
}

function tuneLoadedMaterials(root) {
  if (!root) return;
  root.traverse((object) => {
    if (!object.isMesh || object.name?.startsWith('COLLIDER_')) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      const name = String(material.name || '').toLowerCase();
      if (name.includes('facade_block')) {
        material.color?.setHex(0x6f7775);
        material.roughness = 0.82;
        material.metalness = 0.04;
      } else if (name.includes('industrial_glass')) {
        material.color?.setHex(0x35525c);
        material.roughness = 0.16;
        material.metalness = 0.10;
      } else if (name.includes('building_trim') || name.includes('building_dark')) {
        material.color?.setHex(0x303a3d);
        material.roughness = 0.48;
        material.metalness = 0.62;
      } else if (name.includes('service_door')) {
        material.color?.setHex(0x485658);
        material.roughness = 0.58;
        material.metalness = 0.42;
      } else if (name.includes('pipe_amber')) {
        material.color?.setHex(0x8d4021);
        material.roughness = 0.44;
        material.metalness = 0.40;
      } else if (name.includes('weathered_steel')) {
        material.color?.setHex(0x68767a);
        material.roughness = 0.42;
        material.metalness = 0.68;
      }
      if ('envMapIntensity' in material) material.envMapIntensity = Math.max(1.1, material.envMapIntensity || 1);
      material.needsUpdate = true;
    }
  });
}

export function installSpawnVisualPassTwo(THREE, scene, renderer, { coarsePointer = false } = {}) {
  if (scene.userData.riskmulateSpawnVisualPassTwo) return scene.userData.riskmulateSpawnVisualPassTwo;

  // The previous pass exposed shape better but left the road too dark on iOS. Keep sky exposure stable and fix the surface locally.
  renderer.toneMappingExposure = Math.max(renderer.toneMappingExposure, coarsePointer ? 1.1 : 1.12);

  const surface = buildRoadCorrection(THREE, scene);
  const sun = softenSun(THREE, scene);
  const facades = buildFacadeServiceDetail(THREE, scene);

  const tuneEvent = (event) => {
    const id = event.detail?.id;
    if (!id) return;
    const root = scene.children.find((child) => child.userData?.productionAsset === id);
    tuneLoadedMaterials(root);
  };
  window.addEventListener('riskmulate:asset-loaded', tuneEvent);
  scene.traverse((object) => {
    if (object.userData?.productionAsset) tuneLoadedMaterials(object);
  });

  const state = { surface, sun, facades, tuneEvent };
  scene.userData.riskmulateSpawnVisualPassTwo = state;
  return state;
}
