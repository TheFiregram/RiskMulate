function mark(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeISectionGeometry(THREE, length, depth = 0.34, flangeWidth = 0.28, flangeThickness = 0.07, webThickness = 0.08) {
  const hw = flangeWidth / 2;
  const hd = depth / 2;
  const wt = webThickness / 2;
  const ft = flangeThickness;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, hd);
  shape.lineTo(hw, hd);
  shape.lineTo(hw, hd - ft);
  shape.lineTo(wt, hd - ft);
  shape.lineTo(wt, -hd + ft);
  shape.lineTo(hw, -hd + ft);
  shape.lineTo(hw, -hd);
  shape.lineTo(-hw, -hd);
  shape.lineTo(-hw, -hd + ft);
  shape.lineTo(-wt, -hd + ft);
  shape.lineTo(-wt, hd - ft);
  shape.lineTo(-hw, hd - ft);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, steps: 1 });
  geometry.translate(0, 0, -length / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function addIBeam(THREE, parent, start, end, material, profile = {}) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const length = direction.length();
  const mesh = mark(new THREE.Mesh(
    makeISectionGeometry(
      THREE,
      length,
      profile.depth ?? 0.34,
      profile.flangeWidth ?? 0.28,
      profile.flangeThickness ?? 0.07,
      profile.webThickness ?? 0.08,
    ),
    material,
  ));
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
  parent.add(mesh);
  return mesh;
}

function addPipe(THREE, parent, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, 'centripetal');
  const mesh = mark(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 12), radius, 12, false), material));
  parent.add(mesh);
  return mesh;
}

function addGrating(THREE, parent, center, width, length, material) {
  const group = new THREE.Group();
  group.position.set(...center);
  parent.add(group);
  const longitudinal = new THREE.BoxGeometry(0.035, 0.045, length);
  const transverse = new THREE.BoxGeometry(width, 0.04, 0.035);
  const countX = Math.floor(width / 0.18) + 1;
  const countZ = Math.floor(length / 0.42) + 1;
  const barsX = new THREE.InstancedMesh(longitudinal, material, countX);
  const barsZ = new THREE.InstancedMesh(transverse, material, countZ);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < countX; i += 1) {
    dummy.position.set(-width / 2 + (i / Math.max(1, countX - 1)) * width, 0, 0);
    dummy.updateMatrix();
    barsX.setMatrixAt(i, dummy.matrix);
  }
  for (let i = 0; i < countZ; i += 1) {
    dummy.position.set(0, 0.01, -length / 2 + (i / Math.max(1, countZ - 1)) * length);
    dummy.updateMatrix();
    barsZ.setMatrixAt(i, dummy.matrix);
  }
  barsX.instanceMatrix.needsUpdate = true;
  barsZ.instanceMatrix.needsUpdate = true;
  barsX.castShadow = barsZ.castShadow = true;
  barsX.receiveShadow = barsZ.receiveShadow = true;
  group.add(barsX, barsZ);
}

function hidePrimitiveBridge(density) {
  density.traverse((object) => {
    if (object.name === 'bridge-columns' || object.name === 'bridge-beams') object.visible = false;
  });
  for (const child of density.children) {
    if (!child.isGroup || Math.abs(child.position.z + 20.5) > 0.02) continue;
    for (const nested of child.children) {
      if (nested.name === 'bridge-columns' || nested.name === 'bridge-beams') nested.visible = false;
      if (nested.isMesh && nested.geometry?.type === 'CylinderGeometry') nested.visible = false;
    }
  }
}

function buildBridge(THREE, density) {
  if (!density || density.userData.authoredOverheadBridgeInstalled) return;
  density.userData.authoredOverheadBridgeInstalled = true;
  hidePrimitiveBridge(density);

  const steel = new THREE.MeshStandardMaterial({ color: 0x3d494f, roughness: 0.5, metalness: 0.72 });
  const edgeSteel = new THREE.MeshStandardMaterial({ color: 0x242d31, roughness: 0.58, metalness: 0.7 });
  const galvanized = new THREE.MeshStandardMaterial({ color: 0x9aa6a8, roughness: 0.42, metalness: 0.76 });
  const pipeA = new THREE.MeshStandardMaterial({ color: 0x75888d, roughness: 0.44, metalness: 0.62 });
  const pipeB = new THREE.MeshStandardMaterial({ color: 0x9a6845, roughness: 0.52, metalness: 0.48 });
  const pipeC = new THREE.MeshStandardMaterial({ color: 0x4d6a72, roughness: 0.46, metalness: 0.6 });
  const safety = new THREE.MeshStandardMaterial({ color: 0xc58e24, roughness: 0.5, metalness: 0.38 });

  const root = new THREE.Group();
  root.name = 'authored-overhead-process-bridge';
  root.position.set(0, 0, -20.5);
  density.add(root);

  const frames = [-10, -5, 0, 5, 10];
  for (const x of frames) {
    addIBeam(THREE, root, [x, 0.3, -1.35], [x, 8.05, -1.35], steel, { depth: 0.38, flangeWidth: 0.32 });
    addIBeam(THREE, root, [x, 0.3, 1.35], [x, 8.05, 1.35], steel, { depth: 0.38, flangeWidth: 0.32 });
    addIBeam(THREE, root, [x, 5.55, -1.35], [x, 5.55, 1.35], steel);
    addIBeam(THREE, root, [x, 7.72, -1.35], [x, 7.72, 1.35], steel);
    const footingGeo = new THREE.CylinderGeometry(0.48, 0.58, 0.32, 12);
    for (const z of [-1.35, 1.35]) {
      const footing = mark(new THREE.Mesh(footingGeo, edgeSteel));
      footing.position.set(x, 0.16, z);
      root.add(footing);
    }
  }

  for (let i = 0; i < frames.length - 1; i += 1) {
    const x0 = frames[i];
    const x1 = frames[i + 1];
    for (const z of [-1.35, 1.35]) {
      addIBeam(THREE, root, [x0, 7.72, z], [x1, 7.72, z], steel);
      addIBeam(THREE, root, [x0, 5.55, z], [x1, 5.55, z], steel, { depth: 0.3, flangeWidth: 0.25 });
      addIBeam(THREE, root, [x0, 5.72, z], [x1, 7.55, z], edgeSteel, { depth: 0.2, flangeWidth: 0.18, flangeThickness: 0.045, webThickness: 0.055 });
      addIBeam(THREE, root, [x0, 7.55, z], [x1, 5.72, z], edgeSteel, { depth: 0.2, flangeWidth: 0.18, flangeThickness: 0.045, webThickness: 0.055 });
    }
  }

  addGrating(THREE, root, [0, 5.77, 0], 2.35, 20.4, galvanized);
  const railXs = [];
  for (let x = -10; x <= 10; x += 1.25) railXs.push(x);
  const postGeometry = new THREE.CylinderGeometry(0.028, 0.028, 1.0, 8);
  const posts = new THREE.InstancedMesh(postGeometry, galvanized, railXs.length * 2);
  const dummy = new THREE.Object3D();
  let index = 0;
  for (const z of [-1.12, 1.12]) {
    for (const x of railXs) {
      dummy.position.set(x, 6.28, z);
      dummy.updateMatrix();
      posts.setMatrixAt(index++, dummy.matrix);
    }
  }
  posts.instanceMatrix.needsUpdate = true;
  posts.castShadow = true;
  root.add(posts);
  for (const z of [-1.12, 1.12]) {
    for (const y of [6.38, 6.78]) addPipe(THREE, root, [[-10.2, y, z], [0, y, z], [10.2, y, z]], 0.028, galvanized);
  }

  const pipeSpecs = [
    { y: 6.25, z: -0.58, r: 0.22, material: pipeA },
    { y: 6.72, z: 0.0, r: 0.16, material: pipeB },
    { y: 7.18, z: 0.55, r: 0.13, material: pipeC },
  ];
  for (const spec of pipeSpecs) {
    addPipe(THREE, root, [
      [-12.2, spec.y, spec.z],
      [-10.7, spec.y, spec.z],
      [-9.7, spec.y + 0.25, spec.z],
      [-3.1, spec.y + 0.25, spec.z],
      [-2.2, spec.y + 0.55, spec.z],
      [2.2, spec.y + 0.55, spec.z],
      [3.1, spec.y + 0.25, spec.z],
      [9.7, spec.y + 0.25, spec.z],
      [10.7, spec.y, spec.z],
      [12.2, spec.y, spec.z],
    ], spec.r, spec.material);
  }

  for (const x of [-8.7, -3.8, 1.2, 6.2]) {
    const saddle = mark(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.55), edgeSteel));
    saddle.position.set(x, 6.02, 0);
    root.add(saddle);
    const clamp = mark(new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 7, 18, Math.PI), safety));
    clamp.rotation.y = Math.PI / 2;
    clamp.position.set(x, 6.27, -0.58);
    root.add(clamp);
  }

  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 160;
  const ctx = signCanvas.getContext('2d');
  ctx.fillStyle = '#c79020';
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = '#171b1d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 48px Arial, sans-serif';
  ctx.fillText('PIPE BRIDGE PB-01', 256, 80);
  const texture = new THREE.CanvasTexture(signCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.72), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  sign.position.set(0, 7.18, 1.39);
  root.add(sign);
}

export function installOverheadProcessBridgeDetail(THREE) {
  if (globalThis.__riskmulateOverheadProcessBridgeDetailInstalled) return;
  globalThis.__riskmulateOverheadProcessBridgeDetailInstalled = true;
  const originalAdd = THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add = function patchedAdd(...objects) {
    const result = originalAdd.apply(this, objects);
    for (const object of objects) {
      if (object?.name !== 'foreground-industrial-density') continue;
      queueMicrotask(() => buildBridge(THREE, object));
    }
    return result;
  };
}
