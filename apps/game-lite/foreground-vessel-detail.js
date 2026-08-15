function mark(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addCylinder(THREE, parent, radius, length, material, position, axis = 'y', segments = 16) {
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
  ctx.fillStyle = '#e2ded0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#252b2e';
  ctx.lineWidth = 8;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  ctx.fillStyle = '#1c2225';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 38px Arial, sans-serif';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function hidePlaceholderVessel(density, spec) {
  for (const child of density.children) {
    if (child.name === `vessel-rings-${spec.x}` || child.name === `vessel-ladder-${spec.x}`) {
      child.visible = false;
      continue;
    }
    if (!child.isMesh) continue;
    const sameX = Math.abs(child.position.x - spec.x) < 0.01;
    const sameZ = Math.abs(child.position.z - spec.z) < 0.01;
    if (!sameX || !sameZ) continue;
    const isBody = child.geometry?.type === 'CylinderGeometry' && Math.abs(child.position.y - spec.y) < 0.02;
    const isCap = child.geometry?.type === 'SphereGeometry' && Math.abs(child.position.y - (spec.y + spec.height / 2)) < 0.02;
    if (isBody || isCap) child.visible = false;
  }
}

function createVesselAssembly(THREE, density, spec, materials) {
  hidePlaceholderVessel(density, spec);

  const root = new THREE.Group();
  root.name = `authored-process-vessel-${spec.id}`;
  root.position.set(spec.x, spec.y, spec.z);
  density.add(root);

  const r = spec.radius;
  const h = spec.height;
  const head = Math.min(r * 0.58, 0.9);
  const profile = [
    new THREE.Vector2(r * 0.08, -h / 2 - head),
    new THREE.Vector2(r * 0.58, -h / 2 - head * 0.72),
    new THREE.Vector2(r * 0.9, -h / 2 - head * 0.3),
    new THREE.Vector2(r, -h / 2),
    new THREE.Vector2(r, h / 2),
    new THREE.Vector2(r * 0.9, h / 2 + head * 0.3),
    new THREE.Vector2(r * 0.58, h / 2 + head * 0.72),
    new THREE.Vector2(r * 0.08, h / 2 + head),
  ];
  const shell = mark(new THREE.Mesh(new THREE.LatheGeometry(profile, 40), materials.shell));
  shell.name = `pressure-shell-${spec.id}`;
  root.add(shell);

  for (const y of [-h * 0.31, -h * 0.08, h * 0.15, h * 0.38]) {
    const seam = mark(new THREE.Mesh(new THREE.TorusGeometry(r + 0.018, 0.028, 8, 36), materials.seam));
    seam.rotation.x = Math.PI / 2;
    seam.position.y = y;
    root.add(seam);
  }

  const skirtHeight = 1.05;
  const skirt = mark(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.82, skirtHeight, 28, 1, true), materials.darkSteel));
  skirt.position.y = -h / 2 - head - skirtHeight / 2 + 0.06;
  root.add(skirt);
  const baseRing = mark(new THREE.Mesh(new THREE.TorusGeometry(r * 0.83, 0.06, 8, 32), materials.seam));
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = skirt.position.y - skirtHeight / 2 + 0.06;
  root.add(baseRing);

  const platformY = h * 0.17;
  const platform = mark(new THREE.Mesh(new THREE.RingGeometry(r + 0.12, r + 0.72, 36), materials.grating));
  platform.rotation.x = -Math.PI / 2;
  platform.position.y = platformY;
  root.add(platform);

  const outerRail = mark(new THREE.Mesh(new THREE.TorusGeometry(r + 0.69, 0.035, 8, 40), materials.galvanized));
  outerRail.rotation.x = Math.PI / 2;
  outerRail.position.y = platformY + 0.92;
  root.add(outerRail);
  const midRail = mark(new THREE.Mesh(new THREE.TorusGeometry(r + 0.69, 0.025, 8, 40), materials.galvanized));
  midRail.rotation.x = Math.PI / 2;
  midRail.position.y = platformY + 0.48;
  root.add(midRail);
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    addCylinder(
      THREE,
      root,
      0.028,
      0.96,
      materials.galvanized,
      [Math.cos(angle) * (r + 0.69), platformY + 0.46, Math.sin(angle) * (r + 0.69)],
      'y',
      8,
    );
  }

  const ladderX = r + 0.58;
  const ladderBottom = -h / 2 - head + 0.3;
  const ladderTop = platformY + 0.95;
  const ladderHeight = ladderTop - ladderBottom;
  addCylinder(THREE, root, 0.035, ladderHeight, materials.galvanized, [ladderX, ladderBottom + ladderHeight / 2, -0.24], 'y', 8);
  addCylinder(THREE, root, 0.035, ladderHeight, materials.galvanized, [ladderX, ladderBottom + ladderHeight / 2, 0.24], 'y', 8);
  const rungCount = Math.max(8, Math.floor(ladderHeight / 0.42));
  for (let i = 0; i <= rungCount; i += 1) {
    const y = ladderBottom + (i / rungCount) * ladderHeight;
    addCylinder(THREE, root, 0.024, 0.48, materials.galvanized, [ladderX, y, 0], 'z', 8);
  }
  for (let i = 0; i < 6; i += 1) {
    const y = ladderBottom + 0.75 + i * Math.max(0.65, (ladderHeight - 1.2) / 5);
    const hoop = mark(new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.026, 7, 20, Math.PI), materials.galvanized));
    hoop.rotation.y = Math.PI / 2;
    hoop.position.set(ladderX + 0.33, y, 0);
    root.add(hoop);
  }

  const manwayY = h / 2 + head - 0.06;
  addCylinder(THREE, root, r * 0.22, 0.34, materials.darkSteel, [0, manwayY + 0.1, 0], 'y', 20);
  const manwayFlange = mark(new THREE.Mesh(new THREE.TorusGeometry(r * 0.25, 0.055, 8, 28), materials.seam));
  manwayFlange.rotation.x = Math.PI / 2;
  manwayFlange.position.y = manwayY + 0.29;
  root.add(manwayFlange);

  const nozzleY = -h * 0.12;
  addCylinder(THREE, root, 0.18, r * 0.95, materials.pipe, [r + r * 0.44, nozzleY, 0], 'x', 18);
  const nozzleFlange = mark(new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.07, 8, 24), materials.darkSteel));
  nozzleFlange.rotation.y = Math.PI / 2;
  nozzleFlange.position.set(r + r * 0.92, nozzleY, 0);
  root.add(nozzleFlange);

  const upperNozzleY = h * 0.29;
  addCylinder(THREE, root, 0.12, r * 0.72, materials.pipe, [-r - r * 0.34, upperNozzleY, 0], 'x', 16);
  const upperFlange = mark(new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.05, 8, 22), materials.darkSteel));
  upperFlange.rotation.y = Math.PI / 2;
  upperFlange.position.set(-r - r * 0.7, upperNozzleY, 0);
  root.add(upperFlange);

  const gaugeStem = addCylinder(THREE, root, 0.035, 0.52, materials.pipe, [0, h / 2 + head + 0.35, 0], 'y', 10);
  gaugeStem.name = `instrument-stem-${spec.id}`;
  const gauge = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 24), materials.instrument));
  gauge.rotation.x = Math.PI / 2;
  gauge.position.set(0, h / 2 + head + 0.65, 0);
  root.add(gauge);

  const tag = mark(new THREE.Mesh(
    new THREE.PlaneGeometry(0.82, 0.31),
    new THREE.MeshBasicMaterial({ map: makeTagTexture(THREE, spec.id), side: THREE.DoubleSide }),
  ));
  tag.position.set(r + 0.02, platformY - 0.65, 0.03);
  tag.rotation.y = Math.PI / 2;
  root.add(tag);

  for (const side of [-1, 1]) {
    addBox(THREE, root, [0.18, 0.18, r * 0.78], materials.darkSteel, [side * r * 0.48, -h / 2 - head - 0.05, 0]);
  }
}

function decorateDensity(THREE, density) {
  if (!density || density.userData.authoredVesselDetailInstalled) return;
  density.userData.authoredVesselDetailInstalled = true;

  const materials = {
    shell: new THREE.MeshStandardMaterial({ color: 0x7f8d90, roughness: 0.43, metalness: 0.62 }),
    seam: new THREE.MeshStandardMaterial({ color: 0x3c464a, roughness: 0.58, metalness: 0.68 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x252d31, roughness: 0.62, metalness: 0.66 }),
    galvanized: new THREE.MeshStandardMaterial({ color: 0xa2adaf, roughness: 0.44, metalness: 0.7 }),
    grating: new THREE.MeshStandardMaterial({ color: 0x606b6e, roughness: 0.68, metalness: 0.54, side: THREE.DoubleSide }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x6c7c80, roughness: 0.5, metalness: 0.58 }),
    instrument: new THREE.MeshStandardMaterial({ color: 0x182126, roughness: 0.32, metalness: 0.54 }),
  };

  const specs = [
    { id: 'V-201', x: -17.5, y: 5.1, z: -19.5, radius: 1.7, height: 9.5 },
    { id: 'V-202', x: 17.2, y: 4.35, z: -18.5, radius: 1.45, height: 8.1 },
    { id: 'V-203', x: -16.8, y: 4.1, z: 18.2, radius: 1.25, height: 7.6 },
    { id: 'V-204', x: 18.4, y: 5.6, z: 17.2, radius: 1.8, height: 10.5 },
  ];

  for (const spec of specs) createVesselAssembly(THREE, density, spec, materials);
}

export function installForegroundVesselDetail(THREE) {
  if (globalThis.__riskmulateForegroundVesselDetailInstalled) return;
  globalThis.__riskmulateForegroundVesselDetailInstalled = true;

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
