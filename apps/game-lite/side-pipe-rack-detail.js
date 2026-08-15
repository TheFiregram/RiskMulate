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
      profile.depth ?? 0.32,
      profile.flangeWidth ?? 0.26,
      profile.flangeThickness ?? 0.065,
      profile.webThickness ?? 0.075,
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
  const mesh = mark(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(32, points.length * 14), radius, 12, false), material));
  parent.add(mesh);
  return mesh;
}

function addGrating(THREE, parent, x0, x1, z0, z1, y, material) {
  const group = new THREE.Group();
  parent.add(group);
  const width = Math.abs(x1 - x0);
  const length = Math.abs(z1 - z0);
  const centerX = (x0 + x1) / 2;
  const centerZ = (z0 + z1) / 2;
  const longGeometry = new THREE.BoxGeometry(0.035, 0.045, length);
  const crossGeometry = new THREE.BoxGeometry(width, 0.04, 0.035);
  const longCount = Math.max(12, Math.floor(width / 0.17));
  const crossCount = Math.max(20, Math.floor(length / 0.42));
  const longBars = new THREE.InstancedMesh(longGeometry, material, longCount);
  const crossBars = new THREE.InstancedMesh(crossGeometry, material, crossCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < longCount; i += 1) {
    dummy.position.set(x0 + (i / Math.max(1, longCount - 1)) * (x1 - x0), y, centerZ);
    dummy.updateMatrix();
    longBars.setMatrixAt(i, dummy.matrix);
  }
  for (let i = 0; i < crossCount; i += 1) {
    dummy.position.set(centerX, y + 0.01, z0 + (i / Math.max(1, crossCount - 1)) * (z1 - z0));
    dummy.updateMatrix();
    crossBars.setMatrixAt(i, dummy.matrix);
  }
  longBars.instanceMatrix.needsUpdate = true;
  crossBars.instanceMatrix.needsUpdate = true;
  longBars.castShadow = crossBars.castShadow = true;
  longBars.receiveShadow = crossBars.receiveShadow = true;
  group.add(longBars, crossBars);
}

function addRailRun(THREE, parent, x, z0, z1, material) {
  const postGeometry = new THREE.CylinderGeometry(0.035, 0.035, 1.15, 8);
  const posts = [];
  for (let z = z0; z <= z1 + 0.01; z += 2.4) posts.push(z);
  const instanced = new THREE.InstancedMesh(postGeometry, material, posts.length);
  const dummy = new THREE.Object3D();
  posts.forEach((z, index) => {
    dummy.position.set(x, 6.34, z);
    dummy.updateMatrix();
    instanced.setMatrixAt(index, dummy.matrix);
  });
  instanced.instanceMatrix.needsUpdate = true;
  instanced.castShadow = true;
  parent.add(instanced);
  for (const y of [6.58, 6.94]) {
    const rail = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, Math.abs(z1 - z0) + 1.4, 8), material));
    rail.rotation.x = Math.PI / 2;
    rail.position.set(x, y, (z0 + z1) / 2);
    parent.add(rail);
  }
}

function addPipeSaddles(THREE, parent, xs, zs, ys, material, safety) {
  for (const z of zs) {
    for (const y of ys) {
      for (const x of xs) {
        const saddle = mark(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.18), material));
        saddle.position.set(x, y - 0.23, z);
        parent.add(saddle);
        const clamp = mark(new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.025, 6, 16, Math.PI), safety));
        clamp.rotation.x = Math.PI / 2;
        clamp.position.set(x, y, z);
        parent.add(clamp);
      }
    }
  }
}

function createSign(THREE, parent, text, position, rotationY = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c79020';
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = '#15191b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 48px Arial, sans-serif';
  ctx.fillText(text, 256, 80);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 0.7), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  sign.position.set(...position);
  sign.rotation.y = rotationY;
  parent.add(sign);
}

function hidePrimitiveRack(density) {
  const primitiveNames = new Set([
    'rack-columns',
    'rack-crossbeams',
    'catwalk-decks',
    'catwalk-rail-posts',
    'catwalk-rail-runs',
    'elevated-pipe-runs',
  ]);
  density.traverse((object) => {
    if (primitiveNames.has(object.name)) object.visible = false;
  });
}

function buildSideRack(THREE, parent, spec, materials) {
  const rack = new THREE.Group();
  rack.name = `authored-${spec.id}`;
  parent.add(rack);
  const innerX = spec.x;
  const outerX = spec.x + spec.outward * 3.6;
  const centerX = (innerX + outerX) / 2;
  const frames = [];
  for (let z = spec.z0; z <= spec.z1 + 0.01; z += 4.8) frames.push(Number(z.toFixed(2)));

  for (const z of frames) {
    addIBeam(THREE, rack, [innerX, 0.32, z], [innerX, 7.65, z], materials.steel);
    addIBeam(THREE, rack, [outerX, 0.32, z], [outerX, 7.65, z], materials.steel);
    addIBeam(THREE, rack, [innerX, 3.9, z], [outerX, 3.9, z], materials.steel, { depth: 0.28, flangeWidth: 0.24 });
    addIBeam(THREE, rack, [innerX, 7.15, z], [outerX, 7.15, z], materials.steel, { depth: 0.3, flangeWidth: 0.25 });
  }

  for (const x of [innerX, outerX]) {
    addIBeam(THREE, rack, [x, 3.9, spec.z0 - 0.7], [x, 3.9, spec.z1 + 0.7], materials.edgeSteel, { depth: 0.24, flangeWidth: 0.22 });
    addIBeam(THREE, rack, [x, 7.15, spec.z0 - 0.7], [x, 7.15, spec.z1 + 0.7], materials.edgeSteel, { depth: 0.24, flangeWidth: 0.22 });
  }

  for (let i = 0; i < frames.length - 1; i += 1) {
    if (i % 2 !== 0) continue;
    const a = frames[i];
    const b = frames[i + 1];
    addIBeam(THREE, rack, [outerX, 0.55, a], [outerX, 7.0, b], materials.brace, { depth: 0.15, flangeWidth: 0.14, flangeThickness: 0.04, webThickness: 0.045 });
    addIBeam(THREE, rack, [outerX, 7.0, a], [outerX, 0.55, b], materials.brace, { depth: 0.15, flangeWidth: 0.14, flangeThickness: 0.04, webThickness: 0.045 });
  }

  addGrating(THREE, rack, innerX + spec.outward * 0.12, outerX - spec.outward * 0.12, spec.z0 - 0.45, spec.z1 + 0.45, 5.78, materials.grating);
  addRailRun(THREE, rack, innerX + spec.outward * 0.12, spec.z0 - 0.45, spec.z1 + 0.45, materials.rail);
  addRailRun(THREE, rack, outerX - spec.outward * 0.12, spec.z0 - 0.45, spec.z1 + 0.45, materials.rail);

  const pipeYs = [4.72, 5.16, 5.58];
  const pipeXs = [centerX - spec.outward * 0.62, centerX, centerX + spec.outward * 0.62];
  const pipeMaterials = [materials.pipe, materials.warmPipe, materials.pipe];
  pipeYs.forEach((y, index) => {
    const x = pipeXs[index];
    const inset = 1.3 + index * 0.35;
    addPipe(THREE, rack, [
      [x, y, spec.z0 - 1.8],
      [x, y, spec.z0 - 0.3],
      [x + spec.outward * 0.4, y + 0.16, spec.z0 + inset],
      [x + spec.outward * 0.4, y + 0.16, spec.z1 - inset],
      [x, y, spec.z1 + 0.3],
      [x, y, spec.z1 + 1.8],
    ], 0.14 + index * 0.025, pipeMaterials[index]);
  });

  addPipeSaddles(THREE, rack, pipeXs, frames.slice(0, -1), pipeYs, materials.edgeSteel, materials.safety);
  createSign(THREE, rack, spec.id.toUpperCase(), [centerX, 7.72, spec.z0 + 1.0], spec.outward < 0 ? Math.PI / 2 : -Math.PI / 2);
}

function buildSideRacks(THREE, density) {
  if (density.userData.authoredSidePipeRacks) return;
  density.userData.authoredSidePipeRacks = true;
  hidePrimitiveRack(density);
  const materials = {
    steel: new THREE.MeshStandardMaterial({ color: 0x4c5a61, roughness: 0.5, metalness: 0.68 }),
    edgeSteel: new THREE.MeshStandardMaterial({ color: 0x273238, roughness: 0.58, metalness: 0.7 }),
    brace: new THREE.MeshStandardMaterial({ color: 0x38464c, roughness: 0.56, metalness: 0.66 }),
    grating: new THREE.MeshStandardMaterial({ color: 0x69767a, roughness: 0.48, metalness: 0.72 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x333d41, roughness: 0.52, metalness: 0.68 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x74858a, roughness: 0.42, metalness: 0.62 }),
    warmPipe: new THREE.MeshStandardMaterial({ color: 0x8c5537, roughness: 0.5, metalness: 0.48 }),
    safety: new THREE.MeshStandardMaterial({ color: 0xc79220, roughness: 0.5, metalness: 0.3 }),
  };
  buildSideRack(THREE, density, { id: 'pipe rack pr-01', x: -21.5, outward: -1, z0: -15, z1: 14 }, materials);
  buildSideRack(THREE, density, { id: 'pipe rack pr-02', x: 21.5, outward: 1, z0: -14, z1: 13 }, materials);
}

export function installSidePipeRackDetail(THREE) {
  if (globalThis.__riskmulateSidePipeRackDetailInstalled) return;
  globalThis.__riskmulateSidePipeRackDetailInstalled = true;
  const originalAdd = THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add = function patchedAdd(...objects) {
    const result = originalAdd.apply(this, objects);
    for (const object of objects) {
      if (object?.name !== 'foreground-industrial-density') continue;
      queueMicrotask(() => buildSideRacks(THREE, object));
    }
    return result;
  };
}
