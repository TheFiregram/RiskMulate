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
      color: 0x5a392e,
      roughness: 0.78,
      metalness: 0.46,
    }),
    valveWheel: new THREE.MeshStandardMaterial({
      color: 0x8b3d2f,
      roughness: 0.72,
      metalness: 0.42,
    }),
  };

  return cachedConnectionMaterials;
}

function orientCylinder(object, axis) {
  if (axis === 'x') object.rotation.z = Math.PI / 2;
  if (axis === 'z') object.rotation.x = Math.PI / 2;
  return object;
}

function addCylinder(THREE, scene, radius, length, material, x, y, z, axis = 'y', segments = 16) {
  const object = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material);
  orientCylinder(object, axis);
  object.position.set(x, y, z);
  object.userData.tankConnection = true;
  scene.add(object);
  return object;
}

function addBox(THREE, scene, material, x, y, z, width, height, depth) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  object.position.set(x, y, z);
  object.userData.tankConnection = true;
  scene.add(object);
  return object;
}

function addFlangeRing(THREE, scene, materials, x, y, z, axis, scale = 1) {
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(0.43 * scale, 0.43 * scale, 0.12 * scale, 18),
    materials.flange,
  );
  orientCylinder(ring, axis);
  ring.position.set(x, y, z);
  ring.userData.tankConnection = true;
  scene.add(ring);

  const gasket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34 * scale, 0.34 * scale, 0.028 * scale, 18),
    materials.gasket,
  );
  orientCylinder(gasket, axis);
  gasket.position.set(x, y, z);
  gasket.userData.tankConnection = true;
  scene.add(gasket);

  return ring;
}

function addValve(THREE, scene, materials, x, y, z, axis = 'z', scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.userData.tankConnection = true;

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.24 * scale, 14, 10),
    materials.valveBody,
  );
  body.scale.set(1.15, 1, 1.15);
  group.add(body);

  const left = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34 * scale, 0.34 * scale, 0.1 * scale, 16),
    materials.flange,
  );
  const right = left.clone();
  orientCylinder(left, axis);
  orientCylinder(right, axis);

  if (axis === 'z') {
    left.position.z = -0.27 * scale;
    right.position.z = 0.27 * scale;
  } else {
    left.position.x = -0.27 * scale;
    right.position.x = 0.27 * scale;
  }

  group.add(left, right);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035 * scale, 0.035 * scale, 0.28 * scale, 10),
    materials.bolt,
  );
  stem.position.y = 0.28 * scale;
  group.add(stem);

  const wheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.16 * scale, 0.025 * scale, 8, 18),
    materials.valveWheel,
  );
  wheel.rotation.x = Math.PI / 2;
  wheel.position.y = 0.43 * scale;
  group.add(wheel);

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
  tube.userData.tankConnection = true;
  scene.add(tube);
  return tube;
}

function addLowerTankConnection(THREE, scene, materials) {
  const tankX = -8.3;
  const rackZ = -7.6;
  const y = 2.05;

  // Branch off the lower process line into the centre-left tank nozzle.
  addCylinder(THREE, scene, 0.21, 3.2, materials.pipe, tankX, y, -9.15, 'z', 14);
  addFlangeRing(THREE, scene, materials, tankX, y, -10.42, 'z', 0.84);
  addValve(THREE, scene, materials, tankX, y, -9.58, 'z', 0.82);

  // Short nozzle neck visibly penetrates the tank shell instead of stopping at the surface.
  addCylinder(THREE, scene, 0.24, 0.72, materials.pipe, tankX, y, -11.04, 'z', 14);
  addFlangeRing(THREE, scene, materials, tankX, y, -10.78, 'z', 0.88);

  addSupport(THREE, scene, materials, tankX, rackZ - 1.15, 1.78);
}

function addWestTankConnection(THREE, scene, materials) {
  const tankX = -15;
  const tankZ = -12;

  // The two west ends previously stopped in open air. Route both into the large
  // left tank as a paired feed/return arrangement with separate nozzle elevations.
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

    // Final horizontal spool, valve and nozzle are aligned with the tank shell.
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

    // The nozzle neck reaches slightly inside the tank radius so no daylight gap is visible.
    const nozzleDistance = Math.hypot(line.nozzleCenterX - tankX, line.approachZ - tankZ);
    if (nozzleDistance > 2.8) {
      addCylinder(THREE, scene, line.radius + 0.025, 0.28, materials.pipe, line.nozzleCenterX - 0.14, line.y, line.approachZ, 'x', 14);
    }
  }

  addSupport(THREE, scene, materials, -11.85, -8.8, 2.92);
}

function addUpperTankConnection(THREE, scene, materials) {
  const y = 3.2;

  // Smooth offset carries the upper process line around to the large right-hand tank.
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

  // The tank shell begins near z = -9.9, so this spool enters the shell by a visible amount.
  addCylinder(THREE, scene, 0.22, 0.72, materials.pipe, 14.5, y, -9.7, 'z', 14);
  addFlangeRing(THREE, scene, materials, 14.5, y, -9.55, 'z', 0.84);

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
