let cachedConnectionMaterials;

function getConnectionMaterials(THREE, industrialMaterials) {
  if (cachedConnectionMaterials) return cachedConnectionMaterials;

  cachedConnectionMaterials = {
    pipe: industrialMaterials.pipe,
    flange: industrialMaterials.flange,
    gasket: industrialMaterials.gasket,
    bolt: industrialMaterials.bolt,
    support: industrialMaterials.support,
    supportDark: industrialMaterials.supportDark,
    valveBody: new THREE.MeshStandardMaterial({
      color: 0x55382f,
      roughness: 0.74,
      metalness: 0.5,
    }),
    valveBonnet: new THREE.MeshStandardMaterial({
      color: 0x44332d,
      roughness: 0.7,
      metalness: 0.54,
    }),
    valveWheel: new THREE.MeshStandardMaterial({
      color: 0x8b3d2f,
      roughness: 0.66,
      metalness: 0.46,
    }),
    wheelHub: new THREE.MeshStandardMaterial({
      color: 0x302b29,
      roughness: 0.62,
      metalness: 0.66,
    }),
    serviceYellow: new THREE.MeshStandardMaterial({
      color: 0xc89d2d,
      roughness: 0.66,
      metalness: 0.24,
    }),
    tag: new THREE.MeshStandardMaterial({
      color: 0xd7d3c3,
      roughness: 0.82,
      metalness: 0.08,
    }),
  };

  return cachedConnectionMaterials;
}

function orientCylinder(object, axis) {
  if (axis === 'x') object.rotation.z = Math.PI / 2;
  if (axis === 'z') object.rotation.x = Math.PI / 2;
  return object;
}

function markConnection(object) {
  object.userData.tankConnection = true;
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function addCylinder(THREE, scene, radius, length, material, x, y, z, axis = 'y', segments = 16) {
  const object = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material);
  orientCylinder(object, axis);
  object.position.set(x, y, z);
  markConnection(object);
  scene.add(object);
  return object;
}

function addBox(THREE, scene, material, x, y, z, width, height, depth) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  object.position.set(x, y, z);
  markConnection(object);
  scene.add(object);
  return object;
}

function addFlangeBolts(THREE, scene, materials, x, y, z, axis, scale) {
  const boltCircle = 0.34 * scale;
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const a = Math.cos(angle) * boltCircle;
    const b = Math.sin(angle) * boltCircle;
    let bx = x;
    let by = y;
    let bz = z;
    if (axis === 'z') {
      bx += a;
      by += b;
    } else if (axis === 'x') {
      by += a;
      bz += b;
    } else {
      bx += a;
      bz += b;
    }
    addCylinder(THREE, scene, 0.026 * scale, 0.18 * scale, materials.bolt, bx, by, bz, axis, 6);
  }
}

function addFlangeRing(THREE, scene, materials, x, y, z, axis, scale = 1) {
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(0.43 * scale, 0.43 * scale, 0.12 * scale, 20),
    materials.flange,
  );
  orientCylinder(ring, axis);
  ring.position.set(x, y, z);
  markConnection(ring);
  scene.add(ring);

  const raisedFace = new THREE.Mesh(
    new THREE.CylinderGeometry(0.355 * scale, 0.355 * scale, 0.032 * scale, 20),
    materials.flange,
  );
  orientCylinder(raisedFace, axis);
  raisedFace.position.set(x, y, z);
  markConnection(raisedFace);
  scene.add(raisedFace);

  const gasket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34 * scale, 0.34 * scale, 0.018 * scale, 20),
    materials.gasket,
  );
  orientCylinder(gasket, axis);
  gasket.position.set(x, y, z);
  markConnection(gasket);
  scene.add(gasket);

  addFlangeBolts(THREE, scene, materials, x, y, z, axis, scale);
  return ring;
}

function addValveTag(THREE, group, materials, scale) {
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012 * scale, 0.012 * scale, 0.24 * scale, 6),
    materials.bolt,
  );
  stem.position.set(0.2 * scale, 0.53 * scale, 0);
  stem.rotation.z = -0.34;
  markConnection(stem);
  group.add(stem);

  const tag = new THREE.Mesh(
    new THREE.BoxGeometry(0.18 * scale, 0.1 * scale, 0.018 * scale),
    materials.tag,
  );
  tag.position.set(0.24 * scale, 0.64 * scale, 0);
  tag.rotation.z = -0.2;
  markConnection(tag);
  group.add(tag);
}

function addValve(THREE, scene, materials, x, y, z, axis = 'z', scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.userData.tankConnection = true;

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.245 * scale, 18, 12),
    materials.valveBody,
  );
  body.scale.set(1.22, 1.02, 1.22);
  markConnection(body);
  group.add(body);

  const bodyBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.245 * scale, 0.035 * scale, 7, 20),
    materials.valveBonnet,
  );
  bodyBand.rotation.x = Math.PI / 2;
  markConnection(bodyBand);
  group.add(bodyBand);

  const left = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34 * scale, 0.34 * scale, 0.11 * scale, 18),
    materials.flange,
  );
  const right = left.clone();
  orientCylinder(left, axis);
  orientCylinder(right, axis);

  if (axis === 'z') {
    left.position.z = -0.28 * scale;
    right.position.z = 0.28 * scale;
  } else {
    left.position.x = -0.28 * scale;
    right.position.x = 0.28 * scale;
  }
  markConnection(left);
  markConnection(right);
  group.add(left, right);

  const bonnet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16 * scale, 0.205 * scale, 0.2 * scale, 14),
    materials.valveBonnet,
  );
  bonnet.position.y = 0.25 * scale;
  markConnection(bonnet);
  group.add(bonnet);

  const bonnetCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * scale, 0.18 * scale, 0.055 * scale, 14),
    materials.flange,
  );
  bonnetCap.position.y = 0.365 * scale;
  markConnection(bonnetCap);
  group.add(bonnetCap);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028 * scale, 0.028 * scale, 0.38 * scale, 10),
    materials.bolt,
  );
  stem.position.y = 0.53 * scale;
  markConnection(stem);
  group.add(stem);

  for (const xOffset of [-0.085, 0.085]) {
    const yoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.028 * scale, 0.24 * scale, 0.035 * scale),
      materials.valveBonnet,
    );
    yoke.position.set(xOffset * scale, 0.5 * scale, 0);
    yoke.rotation.z = xOffset < 0 ? -0.12 : 0.12;
    markConnection(yoke);
    group.add(yoke);
  }

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, 0.055 * scale, 12),
    materials.wheelHub,
  );
  hub.position.y = 0.72 * scale;
  markConnection(hub);
  group.add(hub);

  const wheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.185 * scale, 0.024 * scale, 8, 24),
    materials.valveWheel,
  );
  wheel.rotation.x = Math.PI / 2;
  wheel.position.y = 0.72 * scale;
  markConnection(wheel);
  group.add(wheel);

  for (let index = 0; index < 4; index += 1) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.31 * scale, 0.022 * scale, 0.022 * scale),
      materials.valveWheel,
    );
    spoke.position.y = 0.72 * scale;
    spoke.rotation.y = (index / 4) * Math.PI;
    markConnection(spoke);
    group.add(spoke);
  }

  addValveTag(THREE, group, materials, scale);
  scene.add(group);
  return group;
}

function addSupport(THREE, scene, materials, x, z, topY) {
  addBox(THREE, scene, materials.support, x, topY / 2, z, 0.22, topY, 0.22);
  addBox(THREE, scene, materials.supportDark, x, topY - 0.08, z, 0.62, 0.1, 0.3);
  addBox(THREE, scene, materials.supportDark, x, 0.05, z, 0.5, 0.1, 0.5);
}

function addTubePath(THREE, scene, material, points, radius) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal');
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 28, radius, 12, false),
    material,
  );
  markConnection(tube);
  scene.add(tube);
  return tube;
}

function addNozzleCollar(THREE, scene, materials, x, y, z, axis, scale = 1) {
  const collar = addCylinder(THREE, scene, 0.285 * scale, 0.16 * scale, materials.valveBonnet, x, y, z, axis, 18);
  collar.userData.nozzleCollar = true;
  addFlangeRing(THREE, scene, materials, x, y, z, axis, 0.82 * scale);
}

function addLowerTankConnection(THREE, scene, materials) {
  const tankX = -8.3;
  const rackZ = -7.6;
  const y = 2.05;

  addCylinder(THREE, scene, 0.21, 3.2, materials.pipe, tankX, y, -9.15, 'z', 14);
  addFlangeRing(THREE, scene, materials, tankX, y, -10.42, 'z', 0.84);
  addValve(THREE, scene, materials, tankX, y, -9.58, 'z', 0.82);

  addCylinder(THREE, scene, 0.24, 0.72, materials.pipe, tankX, y, -11.04, 'z', 14);
  addNozzleCollar(THREE, scene, materials, tankX, y, -10.78, 'z', 0.88);

  addSupport(THREE, scene, materials, tankX, rackZ - 1.15, 1.78);
}

function addWestTankConnection(THREE, scene, materials) {
  const tankX = -15;
  const tankZ = -12;

  const lines = [
    {
      y: 3.2,
      startX: -10.15,
      turnX: -12.35,
      approachZ: -9.55,
      spoolCenterX: -13.0,
      nozzleCenterX: -13.52,
      flangeX: -13.28,
      valveX: -12.72,
      radius: 0.2,
      scale: 0.8,
    },
    {
      y: 2.05,
      startX: -10.65,
      turnX: -12.15,
      approachZ: -10.45,
      spoolCenterX: -12.62,
      nozzleCenterX: -13.05,
      flangeX: -12.84,
      valveX: -12.34,
      radius: 0.21,
      scale: 0.82,
    },
  ];

  for (const line of lines) {
    addTubePath(
      THREE,
      scene,
      materials.pipe,
      [
        [line.startX, line.y, -7.6],
        [line.turnX + 0.65, line.y, -7.6],
        [line.turnX, line.y, -8.15],
        [line.turnX, line.y, line.approachZ],
        [line.spoolCenterX + 0.35, line.y, line.approachZ],
      ],
      line.radius,
    );

    addCylinder(
      THREE,
      scene,
      line.radius,
      Math.abs(line.nozzleCenterX - (line.spoolCenterX + 0.35)) + 0.5,
      materials.pipe,
      line.spoolCenterX,
      line.y,
      line.approachZ,
      'x',
      14,
    );
    addValve(THREE, scene, materials, line.valveX, line.y, line.approachZ, 'x', line.scale);
    addFlangeRing(THREE, scene, materials, line.flangeX, line.y, line.approachZ, 'x', line.scale);
    addCylinder(THREE, scene, line.radius + 0.02, 0.5, materials.pipe, line.nozzleCenterX, line.y, line.approachZ, 'x', 14);
    addNozzleCollar(THREE, scene, materials, line.nozzleCenterX - 0.18, line.y, line.approachZ, 'x', line.scale);

    const nozzleDistance = Math.hypot(line.nozzleCenterX - tankX, line.approachZ - tankZ);
    if (nozzleDistance > 2.8) {
      addCylinder(THREE, scene, line.radius + 0.025, 0.28, materials.pipe, line.nozzleCenterX - 0.14, line.y, line.approachZ, 'x', 14);
    }
  }

  addSupport(THREE, scene, materials, -11.85, -8.8, 2.92);
}

function addUpperTankConnection(THREE, scene, materials) {
  const y = 3.2;

  addTubePath(
    THREE,
    scene,
    materials.pipe,
    [
      [10.1, y, -7.6],
      [12.4, y, -7.6],
      [13.8, y, -7.9],
      [14.5, y, -8.65],
      [14.5, y, -9.65],
    ],
    0.2,
  );

  addValve(THREE, scene, materials, 14.5, y, -8.72, 'z', 0.78);
  addFlangeRing(THREE, scene, materials, 14.5, y, -9.42, 'z', 0.82);

  addCylinder(THREE, scene, 0.22, 0.72, materials.pipe, 14.5, y, -9.7, 'z', 14);
  addNozzleCollar(THREE, scene, materials, 14.5, y, -9.55, 'z', 0.84);

  addSupport(THREE, scene, materials, 13.15, -7.9, 2.92);
}

export function buildTankConnections(THREE, scene, industrialMaterials) {
  if (scene.userData.tankConnectionsBuilt) return;
  scene.userData.tankConnectionsBuilt = true;

  const materials = getConnectionMaterials(THREE, industrialMaterials);
  addLowerTankConnection(THREE, scene, materials);
  addWestTankConnection(THREE, scene, materials);
  addUpperTankConnection(THREE, scene, materials);
}
