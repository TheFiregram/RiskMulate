function mark(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addCylinder(THREE, parent, radius, length, material, position, axis = 'y', segments = 14) {
  const mesh = mark(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material));
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addBox(THREE, parent, size, material, position, rotation = [0, 0, 0]) {
  const mesh = mark(new THREE.Mesh(new THREE.BoxGeometry(...size), material));
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function makeTagTexture(THREE, label) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d8d3c4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#222a2d';
  ctx.lineWidth = 8;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  ctx.fillStyle = '#161d20';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 38px Arial, sans-serif';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function hidePlaceholderStack(density, spec) {
  for (const child of density.children) {
    if (!child.isMesh) continue;
    const sameX = Math.abs(child.position.x - spec.x) < 0.02;
    const sameZ = Math.abs(child.position.z - spec.z) < 0.02;
    if (!sameX || !sameZ) continue;
    const isDuct = child.geometry?.type === 'CylinderGeometry' && Math.abs(child.position.y - 4.3) < 0.03;
    const isCap = child.geometry?.type === 'CylinderGeometry' && Math.abs(child.position.y - 8.15) < 0.03;
    if (isDuct || isCap) child.visible = false;
  }
}

function createUtilityStack(THREE, density, spec, materials) {
  hidePlaceholderStack(density, spec);

  const root = new THREE.Group();
  root.name = `authored-utility-stack-${spec.id}`;
  root.position.set(spec.x, 0, spec.z);
  density.add(root);

  addBox(THREE, root, [2.2, 0.32, 2.2], materials.concrete, [0, 0.16, 0]);
  addBox(THREE, root, [1.55, 0.22, 1.55], materials.darkSteel, [0, 0.43, 0]);

  const profile = [
    new THREE.Vector2(0.98, 0.48),
    new THREE.Vector2(0.95, 0.72),
    new THREE.Vector2(0.82, 1.35),
    new THREE.Vector2(0.76, 4.8),
    new THREE.Vector2(0.66, 6.65),
    new THREE.Vector2(0.61, 7.45),
  ];
  const shell = mark(new THREE.Mesh(new THREE.LatheGeometry(profile, 32), materials.shell));
  shell.name = `utility-stack-shell-${spec.id}`;
  root.add(shell);

  for (const y of [0.72, 2.4, 4.65, 6.55]) {
    const ring = mark(new THREE.Mesh(new THREE.TorusGeometry(y < 1 ? 0.96 : y < 5 ? 0.78 : 0.67, 0.055, 8, 28), materials.seam));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    root.add(ring);
  }

  const platformY = 5.35;
  const platform = mark(new THREE.Mesh(new THREE.RingGeometry(0.8, 1.48, 32), materials.grating));
  platform.rotation.x = -Math.PI / 2;
  platform.position.y = platformY;
  root.add(platform);

  const railTop = mark(new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.032, 7, 32), materials.galvanized));
  railTop.rotation.x = Math.PI / 2;
  railTop.position.y = platformY + 0.92;
  root.add(railTop);
  const railMid = mark(new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.024, 7, 32), materials.galvanized));
  railMid.rotation.x = Math.PI / 2;
  railMid.position.y = platformY + 0.48;
  root.add(railMid);
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    addCylinder(
      THREE,
      root,
      0.026,
      0.98,
      materials.galvanized,
      [Math.cos(angle) * 1.45, platformY + 0.46, Math.sin(angle) * 1.45],
      'y',
      7,
    );
  }

  const ladderX = 1.2;
  addCylinder(THREE, root, 0.034, 5.1, materials.galvanized, [ladderX, 2.95, -0.25], 'y', 8);
  addCylinder(THREE, root, 0.034, 5.1, materials.galvanized, [ladderX, 2.95, 0.25], 'y', 8);
  for (let i = 0; i < 13; i += 1) {
    addCylinder(THREE, root, 0.022, 0.5, materials.galvanized, [ladderX, 0.6 + i * 0.39, 0], 'z', 7);
  }
  for (let i = 0; i < 5; i += 1) {
    const hoop = mark(new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.024, 7, 18, Math.PI), materials.galvanized));
    hoop.rotation.y = Math.PI / 2;
    hoop.position.set(ladderX + 0.32, 1.45 + i * 0.82, 0);
    root.add(hoop);
  }

  const branchY = 1.85;
  addCylinder(THREE, root, 0.34, 1.35, materials.duct, [1.28, branchY, 0], 'x', 18);
  const elbow = mark(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.34, 10, 24, Math.PI / 2), materials.duct));
  elbow.rotation.x = Math.PI / 2;
  elbow.rotation.z = Math.PI;
  elbow.position.set(1.92, branchY + 0.62, 0);
  root.add(elbow);
  addCylinder(THREE, root, 0.34, 1.4, materials.duct, [2.54, branchY + 1.25, 0], 'y', 18);

  const branchFlange = mark(new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.07, 8, 24), materials.seam));
  branchFlange.rotation.y = Math.PI / 2;
  branchFlange.position.set(0.66, branchY, 0);
  root.add(branchFlange);

  const hood = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.66, 0.34, 24), materials.safety));
  hood.position.y = 7.67;
  root.add(hood);
  addCylinder(THREE, root, 0.05, 0.42, materials.darkSteel, [0, 7.98, 0], 'y', 8);
  const rainCap = mark(new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.34, 24), materials.darkSteel));
  rainCap.position.y = 8.22;
  root.add(rainCap);

  const instrumentStem = addCylinder(THREE, root, 0.025, 0.42, materials.seam, [-0.72, 4.1, 0], 'x', 8);
  instrumentStem.rotation.z = Math.PI / 2;
  const gauge = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.07, 18), materials.instrument));
  gauge.rotation.z = Math.PI / 2;
  gauge.position.set(-0.95, 4.1, 0);
  root.add(gauge);

  const tag = mark(new THREE.Mesh(
    new THREE.PlaneGeometry(0.82, 0.31),
    new THREE.MeshBasicMaterial({ map: makeTagTexture(THREE, spec.id), side: THREE.DoubleSide }),
  ));
  tag.position.set(0.84, 1.05, 0.02);
  tag.rotation.y = Math.PI / 2;
  root.add(tag);
}

function decorateDensity(THREE, density) {
  if (!density || density.userData.authoredUtilityStacksInstalled) return;
  density.userData.authoredUtilityStacksInstalled = true;

  const materials = {
    shell: new THREE.MeshStandardMaterial({ color: 0x59666b, roughness: 0.48, metalness: 0.62 }),
    seam: new THREE.MeshStandardMaterial({ color: 0x252f33, roughness: 0.58, metalness: 0.68 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x20282c, roughness: 0.62, metalness: 0.64 }),
    galvanized: new THREE.MeshStandardMaterial({ color: 0xa3adaf, roughness: 0.42, metalness: 0.72 }),
    grating: new THREE.MeshStandardMaterial({ color: 0x5c686c, roughness: 0.68, metalness: 0.54, side: THREE.DoubleSide }),
    duct: new THREE.MeshStandardMaterial({ color: 0x6d797d, roughness: 0.5, metalness: 0.58 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x6d7270, roughness: 0.94, metalness: 0.02 }),
    safety: new THREE.MeshStandardMaterial({ color: 0xb88920, roughness: 0.56, metalness: 0.36 }),
    instrument: new THREE.MeshStandardMaterial({ color: 0x182126, roughness: 0.32, metalness: 0.54 }),
  };

  const specs = [
    { id: 'U-301', x: -20.5, z: -10 },
    { id: 'U-302', x: 20.5, z: -8 },
    { id: 'U-303', x: -20.5, z: 7 },
    { id: 'U-304', x: 20.5, z: 8 },
  ];

  for (const spec of specs) createUtilityStack(THREE, density, spec, materials);
}

export function installUtilityStackDetail(THREE) {
  if (globalThis.__riskmulateUtilityStackDetailInstalled) return;
  globalThis.__riskmulateUtilityStackDetailInstalled = true;

  const originalAdd = THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add = function patchedAdd(...objects) {
    const result = originalAdd.apply(this, objects);
    for (const object of objects) {
      if (object?.name !== 'foreground-industrial-density') continue;
      queueMicrotask(() => decorateDensity(THREE, object));
    }
    return result;
  };
}
