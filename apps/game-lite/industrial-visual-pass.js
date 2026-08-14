function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makeGrimeTexture(THREE) {
  const random = seededRandom(92231);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#242728';
  ctx.fillRect(0, 0, 256, 256);
  for (let index = 0; index < 6000; index += 1) {
    const tone = 28 + Math.floor(random() * 52);
    ctx.globalAlpha = 0.035 + random() * 0.13;
    ctx.fillStyle = `rgb(${tone},${tone},${tone - 2})`;
    const size = 0.5 + random() * 2.2;
    ctx.fillRect(random() * 256, random() * 256, size, size);
  }
  for (let index = 0; index < 28; index += 1) {
    ctx.globalAlpha = 0.05 + random() * 0.12;
    ctx.fillStyle = index % 3 === 0 ? '#0f1719' : '#3f352b';
    ctx.beginPath();
    ctx.ellipse(
      random() * 256,
      random() * 256,
      8 + random() * 34,
      4 + random() * 18,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  return texture;
}

function addGroundDecal(THREE, root, material, x, z, width, depth, rotation = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.position.set(x, 0.047, z);
  mesh.rotation.set(-Math.PI / 2, 0, rotation);
  mesh.receiveShadow = true;
  mesh.renderOrder = 2;
  root.add(mesh);
  return mesh;
}

function addDrainGrate(THREE, root, x, z, width, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0.055, z);
  group.rotation.y = rotation;
  root.add(group);

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x20282b,
    metalness: 0.78,
    roughness: 0.42,
  });
  const barMaterial = new THREE.MeshStandardMaterial({
    color: 0x303a3d,
    metalness: 0.84,
    roughness: 0.34,
  });

  const bed = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, 0.54), frameMaterial);
  bed.receiveShadow = true;
  group.add(bed);

  const railA = new THREE.Mesh(new THREE.BoxGeometry(width, 0.07, 0.045), barMaterial);
  railA.position.z = -0.245;
  railA.castShadow = true;
  railA.receiveShadow = true;
  group.add(railA);
  const railB = railA.clone();
  railB.position.z = 0.245;
  group.add(railB);

  const count = Math.max(8, Math.floor(width / 0.24));
  for (let index = 0; index < count; index += 1) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.065, 0.48), barMaterial);
    bar.position.x = -width / 2 + 0.12 + index * ((width - 0.24) / Math.max(1, count - 1));
    bar.castShadow = true;
    bar.receiveShadow = true;
    group.add(bar);
  }
  return group;
}

function addPalletStack(THREE, root, x, z, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0.04, z);
  group.rotation.y = rotation;
  root.add(group);

  const timber = new THREE.MeshStandardMaterial({ color: 0x66513b, roughness: 0.92, metalness: 0.01 });
  const crate = new THREE.MeshStandardMaterial({ color: 0x4a5554, roughness: 0.72, metalness: 0.24 });
  const band = new THREE.MeshStandardMaterial({ color: 0x22292b, roughness: 0.48, metalness: 0.7 });

  for (let layer = 0; layer < 2; layer += 1) {
    for (const offsetZ of [-0.48, 0, 0.48]) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.11, 0.34), timber);
      slat.position.set(0, 0.08 + layer * 0.18, offsetZ);
      slat.castShadow = true;
      slat.receiveShadow = true;
      group.add(slat);
    }
  }

  const box = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.86, 1.05), crate);
  box.position.y = 0.68;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);

  for (const offsetX of [-0.48, 0.48]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.9, 1.08), band);
    strap.position.set(offsetX, 0.68, 0);
    strap.castShadow = true;
    group.add(strap);
  }
  return group;
}

function addServiceBollard(THREE, root, x, z) {
  const yellow = new THREE.MeshStandardMaterial({ color: 0xc79a20, roughness: 0.58, metalness: 0.28 });
  const black = new THREE.MeshStandardMaterial({ color: 0x202526, roughness: 0.52, metalness: 0.42 });
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  root.add(group);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.92, 12), yellow);
  post.position.y = 0.46;
  post.castShadow = true;
  post.receiveShadow = true;
  group.add(post);

  for (const y of [0.27, 0.63]) {
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.1, 12), black);
    stripe.position.y = y;
    stripe.castShadow = true;
    group.add(stripe);
  }
  return group;
}

function tuneProductionMaterial(material) {
  if (!material) return;
  const name = String(material.name || '').toLowerCase();

  if (name.includes('collider')) return;
  if (name.includes('pipe_amber')) {
    material.color?.setHex(0x743018);
    material.metalness = 0.48;
    material.roughness = 0.4;
  } else if (name.includes('pipe_steel')) {
    material.color?.setHex(0x69777b);
    material.metalness = 0.78;
    material.roughness = 0.32;
  } else if (name.includes('pipe_dark')) {
    material.color?.setHex(0x314044);
    material.metalness = 0.68;
    material.roughness = 0.38;
  } else if (name.includes('galvanized') || name.includes('weathered_steel')) {
    material.metalness = 0.76;
    material.roughness = 0.36;
  } else if (name.includes('rack_dark') || name.includes('dark_steel') || name.includes('rack_brace')) {
    material.metalness = 0.72;
    material.roughness = 0.39;
  } else if (name.includes('safety_yellow') || name.includes('service_yellow')) {
    material.color?.offsetHSL(0, 0.04, 0.035);
    material.metalness = 0.22;
    material.roughness = 0.52;
  } else if (name.includes('concrete')) {
    material.metalness = 0.01;
    material.roughness = 0.94;
  }

  if ('envMapIntensity' in material) material.envMapIntensity = Math.max(1.05, material.envMapIntensity || 1);
  material.needsUpdate = true;
}

function tuneProductionRoot(root, coarsePointer) {
  if (!root) return;
  root.traverse((object) => {
    if (!object.isMesh || object.name?.startsWith('COLLIDER_')) return;
    object.receiveShadow = true;
    object.castShadow = !coarsePointer || (object.geometry?.attributes?.position?.count || 0) < 9000;
    if (Array.isArray(object.material)) object.material.forEach(tuneProductionMaterial);
    else tuneProductionMaterial(object.material);
  });
}

function tuneLighting(THREE, scene, renderer, coarsePointer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
  renderer.toneMappingExposure = coarsePointer ? 1.08 : 1.12;

  if (scene.fog?.isFogExp2) {
    scene.fog.color.setHex(0x82959b);
    scene.fog.density = 0.0092;
  }
  if (scene.background?.isColor) scene.background.setHex(0x6f8792);

  let strongestDirectional = null;
  scene.traverse((object) => {
    if (object.isHemisphereLight) {
      object.intensity = Math.min(object.intensity, 1.08);
      object.groundColor.setHex(0x2d352f);
    }
    if (object.isDirectionalLight && (!strongestDirectional || object.intensity > strongestDirectional.intensity)) {
      strongestDirectional = object;
    }
  });

  if (strongestDirectional) {
    strongestDirectional.castShadow = true;
    strongestDirectional.intensity = Math.max(strongestDirectional.intensity, 2.75);
    strongestDirectional.shadow.mapSize.set(coarsePointer ? 1024 : 2048, coarsePointer ? 1024 : 2048);
    strongestDirectional.shadow.bias = -0.00012;
    strongestDirectional.shadow.normalBias = 0.025;
    strongestDirectional.shadow.camera.near = 1;
    strongestDirectional.shadow.camera.far = 72;
    strongestDirectional.shadow.camera.left = -32;
    strongestDirectional.shadow.camera.right = 32;
    strongestDirectional.shadow.camera.top = 32;
    strongestDirectional.shadow.camera.bottom = -32;
  }

  const coolFill = new THREE.DirectionalLight(0xa8c0c9, 0.34);
  coolFill.position.set(18, 12, -22);
  coolFill.castShadow = false;
  coolFill.userData.riskmulateVisualFill = true;
  scene.add(coolFill);
}

function buildGroundDetail(THREE, scene) {
  const root = new THREE.Group();
  root.name = 'riskmulate-industrial-ground-detail';
  root.userData.visualOnly = true;
  scene.add(root);

  const grime = new THREE.MeshStandardMaterial({
    color: 0x4a4843,
    map: makeGrimeTexture(THREE),
    roughness: 0.98,
    metalness: 0.01,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const wet = new THREE.MeshPhysicalMaterial({
    color: 0x172126,
    roughness: 0.2,
    metalness: 0.08,
    clearcoat: 0.72,
    clearcoatRoughness: 0.18,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
  });
  const fadedPaint = new THREE.MeshStandardMaterial({
    color: 0xc5a43b,
    roughness: 0.88,
    metalness: 0.01,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });

  const grimeSpecs = [
    [-0.2, -6.6, 9.4, 2.2, -0.02],
    [-11.8, -10.1, 5.4, 2.7, 0.12],
    [12.6, -10.8, 5.9, 2.4, -0.08],
    [-8.5, 3.4, 4.2, 1.7, 0.18],
    [9.6, 5.4, 3.8, 1.5, -0.14],
  ];
  grimeSpecs.forEach((spec) => addGroundDecal(THREE, root, grime, ...spec));

  const puddleSpecs = [
    [4.1, -5.25, 2.5, 0.72, -0.08],
    [-6.4, -9.65, 1.75, 0.58, 0.16],
    [12.3, 8.6, 1.4, 0.52, -0.12],
  ];
  puddleSpecs.forEach((spec) => addGroundDecal(THREE, root, wet, ...spec));

  for (const [x, z, width, rotation] of [
    [-6.8, -4.05, 4.2, 0],
    [6.8, -4.05, 4.2, 0],
    [0, -11.4, 5.4, 0],
  ]) addDrainGrate(THREE, root, x, z, width, rotation);

  for (let index = 0; index < 7; index += 1) {
    addGroundDecal(THREE, root, fadedPaint, -4.8 + index * 1.6, -3.35, 0.82, 0.12, -0.16);
  }

  addPalletStack(THREE, root, -8.1, -4.4, 0.12);
  addPalletStack(THREE, root, 8.5, -11.9, -0.2);
  for (const [x, z] of [[-4.5, -5.2], [-3.85, -5.2], [4.7, -5.2], [5.35, -5.2]]) {
    addServiceBollard(THREE, root, x, z);
  }

  return root;
}

export function installIndustrialVisualPass(THREE, scene, renderer, { coarsePointer = false } = {}) {
  if (scene.userData.riskmulateIndustrialVisualPass) return scene.userData.riskmulateIndustrialVisualPass;

  tuneLighting(THREE, scene, renderer, coarsePointer);
  const groundDetail = buildGroundDetail(THREE, scene);

  const tuneLoadedAsset = (event) => {
    const id = event.detail?.id;
    if (!id) return;
    const root = scene.children.find((child) => child.userData?.productionAsset === id);
    tuneProductionRoot(root, coarsePointer);
  };
  window.addEventListener('riskmulate:asset-loaded', tuneLoadedAsset);

  scene.traverse((object) => {
    if (object.userData?.productionAsset) tuneProductionRoot(object, coarsePointer);
  });

  const state = { groundDetail, tuneLoadedAsset };
  scene.userData.riskmulateIndustrialVisualPass = state;
  return state;
}
