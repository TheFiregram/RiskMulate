function makeMaterials(THREE) {
  return {
    yellow: new THREE.MeshStandardMaterial({ color: 0xe2a51b, roughness: 0.56, metalness: 0.34 }),
    green: new THREE.MeshStandardMaterial({ color: 0x1d7f49, roughness: 0.64, metalness: 0.24 }),
    darkGreen: new THREE.MeshStandardMaterial({ color: 0x145635, roughness: 0.72, metalness: 0.28 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x697477, roughness: 0.6, metalness: 0.62 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x252c2f, roughness: 0.76, metalness: 0.5 }),
    black: new THREE.MeshStandardMaterial({ color: 0x151718, roughness: 0.92, metalness: 0.06 }),
    white: new THREE.MeshStandardMaterial({ color: 0xd9dedb, roughness: 0.76, metalness: 0.03 }),
    red: new THREE.MeshStandardMaterial({ color: 0x9d2e24, roughness: 0.68, metalness: 0.3 }),
    floorMark: new THREE.MeshBasicMaterial({ color: 0xd9a51d, transparent: true, opacity: 0.78, depthWrite: false }),
  };
}

function addBox(THREE, group, size, material, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  group.add(mesh);
  return mesh;
}

function addCylinder(THREE, group, radius, length, material, position, axis = 'y', segments = 14) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material);
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function addTube(THREE, group, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal');
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 10, false), material);
  group.add(mesh);
  return mesh;
}

function createSignTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1c7b48';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#edf5ef';
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '700 52px Arial, sans-serif';
  ctx.fillText('EMERGENCY', 256, 82);
  ctx.font = '700 42px Arial, sans-serif';
  ctx.fillText('SHOWER + EYEWASH', 256, 142);
  ctx.font = '700 30px Arial, sans-serif';
  ctx.fillText('KEEP ACCESS CLEAR', 256, 200);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createClearanceMarking(THREE, group, material) {
  const y = 0.015;
  const outer = [
    [-1.45, y, -1.08, 2.9, 0.035, 0.08],
    [-1.45, y, 1.08, 2.9, 0.035, 0.08],
    [-1.45, y, 0, 0.08, 0.035, 2.16],
    [1.45, y, 0, 0.08, 0.035, 2.16],
  ];
  for (const [x, py, z, w, h, d] of outer) addBox(THREE, group, [w, h, d], material, [x, py, z]);
  for (let i = -3; i <= 3; i += 1) {
    addBox(THREE, group, [0.08, 0.03, 1.75], material, [i * 0.38, y, 0], [0, Math.PI / 4, 0]);
  }
}

function createShowerEyewash(THREE, group, materials) {
  const root = new THREE.Group();
  root.position.set(-0.55, 0, 0);
  group.add(root);

  addCylinder(THREE, root, 0.045, 2.95, materials.green, [0, 1.48, 0]);
  addBox(THREE, root, [0.4, 0.08, 0.4], materials.darkSteel, [0, 0.04, 0]);

  addTube(THREE, root, [[0, 2.86, 0], [0, 3.15, 0], [0.48, 3.15, 0], [0.48, 2.95, 0]], 0.045, materials.green);

  const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.12, 18), materials.yellow);
  showerHead.position.set(0.48, 2.86, 0);
  root.add(showerHead);

  const pullRod = addCylinder(THREE, root, 0.015, 0.92, materials.steel, [0.26, 2.32, 0.05]);
  pullRod.rotation.z = -0.18;
  const pullHandle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 18), materials.yellow);
  pullHandle.rotation.x = Math.PI / 2;
  pullHandle.position.set(0.34, 1.88, 0.05);
  root.add(pullHandle);

  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), materials.yellow);
  bowl.scale.y = 0.38;
  bowl.rotation.x = Math.PI;
  bowl.position.set(0.26, 1.08, 0);
  root.add(bowl);

  addCylinder(THREE, root, 0.025, 0.36, materials.green, [0.12, 1.07, 0], 'x');
  for (const z of [-0.08, 0.08]) {
    addCylinder(THREE, root, 0.025, 0.13, materials.steel, [0.28, 1.18, z]);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.055, 12), materials.darkGreen);
    nozzle.position.set(0.28, 1.26, z);
    root.add(nozzle);
  }

  addBox(THREE, root, [0.28, 0.045, 0.16], materials.yellow, [0.22, 0.12, 0.26], [-0.12, 0, 0]);
  addCylinder(THREE, root, 0.018, 0.55, materials.steel, [0.08, 0.38, 0.26]);

  const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.035, 24), materials.darkSteel);
  drain.position.set(0.18, 0.035, 0);
  root.add(drain);
  for (let i = -4; i <= 4; i += 1) addBox(THREE, root, [0.045, 0.012, 0.72], materials.steel, [0.18 + i * 0.085, 0.058, 0]);
}

function createSpillCabinet(THREE, group, materials) {
  const root = new THREE.Group();
  root.position.set(0.82, 0, -0.08);
  group.add(root);

  addBox(THREE, root, [0.86, 1.28, 0.42], materials.yellow, [0, 0.64, 0]);
  addBox(THREE, root, [0.78, 1.16, 0.035], materials.darkGreen, [0, 0.65, -0.228]);
  addBox(THREE, root, [0.05, 0.18, 0.035], materials.white, [0.29, 0.66, -0.252]);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f2c62b';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#141718';
  ctx.textAlign = 'center';
  ctx.font = '900 34px Arial';
  ctx.fillText('SPILL', 128, 52);
  ctx.fillText('RESPONSE', 128, 92);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.28), new THREE.MeshBasicMaterial({ map: texture }));
  label.position.set(0, 0.93, -0.248);
  root.add(label);

  // Extinguisher mounted beside the cabinet provides another credible emergency-response cue.
  addCylinder(THREE, root, 0.09, 0.48, materials.red, [0.58, 0.54, -0.03]);
  addCylinder(THREE, root, 0.032, 0.1, materials.black, [0.58, 0.83, -0.03]);
  addTube(THREE, root, [[0.61, 0.77, -0.03], [0.78, 0.78, -0.03], [0.83, 0.66, -0.03]], 0.015, materials.black);
}

function createBollards(THREE, group, materials) {
  for (const [x, z] of [[-1.7, -1.28], [-1.7, 1.28], [1.7, -1.28], [1.7, 1.28]]) {
    addCylinder(THREE, group, 0.075, 0.92, materials.yellow, [x, 0.46, z]);
    addCylinder(THREE, group, 0.079, 0.12, materials.black, [x, 0.34, z]);
    addCylinder(THREE, group, 0.079, 0.12, materials.black, [x, 0.7, z]);
  }
}

export function buildEmergencyResponseStation(THREE, scene, options = {}) {
  const materials = makeMaterials(THREE);
  const root = new THREE.Group();
  root.position.set(options.x ?? 6.5, options.y ?? 0, options.z ?? -3.35);
  root.rotation.y = options.rotationY ?? 0;
  root.userData.environmentAsset = 'emergency-response-station';
  scene.add(root);

  createClearanceMarking(THREE, root, materials.floorMark);
  createShowerEyewash(THREE, root, materials);
  createSpillCabinet(THREE, root, materials);
  createBollards(THREE, root, materials);

  const signMaterial = new THREE.MeshBasicMaterial({ map: createSignTexture(THREE) });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.78), signMaterial);
  sign.position.set(0, 2.55, -0.22);
  sign.rotation.y = 0;
  root.add(sign);
  addCylinder(THREE, root, 0.025, 1.15, materials.steel, [-0.56, 2.03, -0.18]);
  addCylinder(THREE, root, 0.025, 1.15, materials.steel, [0.56, 2.03, -0.18]);

  return root;
}
