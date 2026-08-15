function seeded(seed) {
  let value = seed >>> 0;
  return () => (value = (value * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function mark(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addInstancedBoxes(THREE, parent, material, size, transforms, name) {
  const geometry = new THREE.BoxGeometry(...size);
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((transform, index) => {
    dummy.position.set(...transform.position);
    dummy.rotation.set(...(transform.rotation || [0, 0, 0]));
    dummy.scale.set(...(transform.scale || [1, 1, 1]));
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.name = name;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addInstancedCylinders(THREE, parent, material, radius, length, transforms, name, segments = 12) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments);
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((transform, index) => {
    dummy.position.set(...transform.position);
    dummy.rotation.set(...(transform.rotation || [0, 0, 0]));
    dummy.scale.set(...(transform.scale || [1, 1, 1]));
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.name = name;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addForegroundIndustrialDensity(THREE, root) {
  const steel = new THREE.MeshStandardMaterial({ color: 0x46535a, roughness: 0.58, metalness: 0.62 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x252f34, roughness: 0.66, metalness: 0.58 });
  const galvanized = new THREE.MeshStandardMaterial({ color: 0x8c9799, roughness: 0.48, metalness: 0.66 });
  const pipe = new THREE.MeshStandardMaterial({ color: 0x7f8d91, roughness: 0.5, metalness: 0.55 });
  const warmPipe = new THREE.MeshStandardMaterial({ color: 0x9a6540, roughness: 0.58, metalness: 0.45 });
  const safety = new THREE.MeshStandardMaterial({ color: 0xc89325, roughness: 0.56, metalness: 0.36 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x697071, roughness: 0.94, metalness: 0.02 });
  const vessel = new THREE.MeshStandardMaterial({ color: 0x707d80, roughness: 0.52, metalness: 0.48 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0x2b3234, emissive: 0xffd89a, emissiveIntensity: 1.8, roughness: 0.4 });

  const density = new THREE.Group();
  density.name = "foreground-industrial-density";
  root.add(density);

  const columns = [];
  const crossBeams = [];
  const deckBeams = [];
  const railPosts = [];
  const railRuns = [];
  const bases = [];
  const pipeRuns = [];

  const rackRows = [
    { x: -21.5, z0: -15, z1: 14 },
    { x: 21.5, z0: -14, z1: 13 },
  ];

  for (const row of rackRows) {
    for (let z = row.z0; z <= row.z1; z += 4.8) {
      columns.push({ position: [row.x, 3.8, z] });
      columns.push({ position: [row.x + (row.x < 0 ? -3.6 : 3.6), 3.8, z] });
      bases.push({ position: [row.x, 0.16, z] });
      bases.push({ position: [row.x + (row.x < 0 ? -3.6 : 3.6), 0.16, z] });
      crossBeams.push({
        position: [row.x + (row.x < 0 ? -1.8 : 1.8), 3.9, z],
        scale: [3.9, 1, 1],
      });
      crossBeams.push({
        position: [row.x + (row.x < 0 ? -1.8 : 1.8), 7.15, z],
        scale: [3.9, 1, 1],
      });
    }

    const deckX = row.x + (row.x < 0 ? -1.8 : 1.8);
    deckBeams.push({ position: [deckX, 5.75, (row.z0 + row.z1) / 2], scale: [3.7, 1, row.z1 - row.z0 + 2] });
    for (let z = row.z0; z <= row.z1; z += 2.4) {
      railPosts.push({ position: [row.x - 0.18, 6.55, z] });
      railPosts.push({ position: [row.x + (row.x < 0 ? -3.42 : 3.42), 6.55, z] });
    }
    railRuns.push({ position: [row.x - 0.18, 6.72, (row.z0 + row.z1) / 2], scale: [1, 1, row.z1 - row.z0 + 2] });
    railRuns.push({ position: [row.x + (row.x < 0 ? -3.42 : 3.42), 6.72, (row.z0 + row.z1) / 2], scale: [1, 1, row.z1 - row.z0 + 2] });

    for (const y of [4.7, 5.15, 5.62]) {
      pipeRuns.push({
        position: [deckX, y, (row.z0 + row.z1) / 2],
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, (row.z1 - row.z0 + 3) / 2, 1],
      });
    }
  }

  addInstancedBoxes(THREE, density, steel, [0.28, 7.6, 0.28], columns, "rack-columns");
  addInstancedBoxes(THREE, density, steel, [1, 0.24, 0.28], crossBeams, "rack-crossbeams");
  addInstancedBoxes(THREE, density, galvanized, [1, 0.12, 1], deckBeams, "catwalk-decks");
  addInstancedBoxes(THREE, density, darkSteel, [0.07, 1.5, 0.07], railPosts, "catwalk-rail-posts");
  addInstancedBoxes(THREE, density, darkSteel, [0.07, 0.07, 1], railRuns, "catwalk-rail-runs");
  addInstancedBoxes(THREE, density, concrete, [0.82, 0.32, 0.82], bases, "rack-concrete-bases");
  addInstancedCylinders(THREE, density, pipe, 0.18, 2, pipeRuns, "elevated-pipe-runs", 14);

  const processVessels = [
    [-17.5, 5.1, -19.5, 1.7, 9.5],
    [17.2, 4.35, -18.5, 1.45, 8.1],
    [-16.8, 4.1, 18.2, 1.25, 7.6],
    [18.4, 5.6, 17.2, 1.8, 10.5],
  ];

  for (const [x, y, z, radius, height] of processVessels) {
    const body = mark(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 20), vessel));
    body.position.set(x, y, z);
    density.add(body);

    const capTop = mark(new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), vessel));
    capTop.scale.y = 0.45;
    capTop.position.set(x, y + height / 2, z);
    density.add(capTop);

    const ringTransforms = [];
    for (let ring = 0; ring < 4; ring += 1) {
      ringTransforms.push({ position: [x, y - height * 0.32 + ring * (height * 0.22), z] });
    }
    addInstancedCylinders(THREE, density, darkSteel, radius + 0.05, 0.09, ringTransforms, `vessel-rings-${x}`, 20);

    const ladder = [];
    for (let rung = 0; rung < 10; rung += 1) {
      ladder.push({ position: [x + radius + 0.13, 1.15 + rung * 0.62, z], rotation: [0, 0, Math.PI / 2] });
    }
    addInstancedCylinders(THREE, density, galvanized, 0.035, 0.52, ladder, `vessel-ladder-${x}`, 8);
  }

  const overheadBridge = new THREE.Group();
  overheadBridge.position.set(0, 0, -20.5);
  density.add(overheadBridge);
  addInstancedBoxes(
    THREE,
    overheadBridge,
    steel,
    [0.3, 8.4, 0.3],
    [-10, -5, 0, 5, 10].map((x) => ({ position: [x, 4.2, 0] })),
    "bridge-columns",
  );
  addInstancedBoxes(
    THREE,
    overheadBridge,
    darkSteel,
    [1, 0.32, 0.42],
    [{ position: [0, 7.5, 0], scale: [22, 1, 1] }, { position: [0, 5.6, 0], scale: [22, 1, 1] }],
    "bridge-beams",
  );
  for (const [y, material, radius] of [[6.35, pipe, 0.22], [6.82, warmPipe, 0.16], [7.25, pipe, 0.13]]) {
    const run = mark(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 24, 14), material));
    run.rotation.z = Math.PI / 2;
    run.position.set(0, y, 0);
    overheadBridge.add(run);
  }

  for (const [x, z] of [[-20.5, -10], [20.5, -8], [-20.5, 7], [20.5, 8]]) {
    const duct = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.9, 7.5, 12), darkSteel));
    duct.position.set(x, 4.3, z);
    density.add(duct);
    const cap = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.3, 12), safety));
    cap.position.set(x, 8.15, z);
    density.add(cap);
  }

  const lights = [];
  for (const x of [-23.3, 23.3]) {
    for (const z of [-12, -2, 8]) lights.push({ position: [x, 6.9, z] });
  }
  addInstancedBoxes(THREE, density, lamp, [0.28, 0.16, 0.18], lights, "service-lights");
}

export function buildCinematicEnvironment(THREE, scene) {
  const random = seeded(31000);
  const root = new THREE.Group();
  root.name = "northbridge-filtration-works";
  scene.add(root);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(105, 40, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x44697d) },
        horizonColor: { value: new THREE.Color(0xb7c5c8) },
        groundColor: { value: new THREE.Color(0x6f756f) },
      },
      vertexShader:
        "varying vec3 vWorld; void main(){ vec4 world=modelMatrix*vec4(position,1.0); vWorld=normalize(world.xyz); gl_Position=projectionMatrix*viewMatrix*world; }",
      fragmentShader:
        "varying vec3 vWorld; uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 groundColor; void main(){ float h=vWorld.y; vec3 c=mix(horizonColor,topColor,smoothstep(0.0,.72,h)); c=mix(groundColor,c,smoothstep(-.2,.04,h)); gl_FragColor=vec4(c,1.0); }",
    }),
  );
  root.add(sky);

  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(2.8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe0aa, transparent: true, opacity: 0.62, fog: false }),
  );
  sun.position.set(-54, 35, -72);
  sun.lookAt(0, 8, 0);
  root.add(sun);

  const silhouette = new THREE.MeshStandardMaterial({
    color: 0x48565b,
    roughness: 0.82,
    metalness: 0.28,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x2c373c,
    roughness: 0.72,
    metalness: 0.48,
  });
  const stackCap = new THREE.MeshStandardMaterial({
    color: 0x8f3d2e,
    roughness: 0.82,
    metalness: 0.18,
  });

  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const distance = 49 + random() * 11;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const height = 5 + random() * 13;
    const radius = 0.5 + random() * 1.4;
    const tower = mark(
      new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.08, height, 12), silhouette),
    );
    tower.position.set(x, height / 2, z);
    root.add(tower);

    if (i % 3 === 0) {
      const stackHeight = height + 8 + random() * 8;
      const stack = mark(
        new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, stackHeight, 12), dark),
      );
      stack.position.set(x + 2.2, stackHeight / 2, z - 1.4);
      root.add(stack);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.8, 12), stackCap);
      cap.position.set(x + 2.2, stackHeight - 0.65, z - 1.4);
      root.add(cap);
    }
  }

  addForegroundIndustrialDensity(THREE, root);

  const steamTexture = (() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 62);
    gradient.addColorStop(0, "rgba(255,255,255,.72)");
    gradient.addColorStop(0.38, "rgba(220,230,232,.28)");
    gradient.addColorStop(1, "rgba(190,205,210,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  })();
  const plumes = [];
  for (const [x, z, base] of [
    [-38, -44, 18],
    [41, -38, 22],
    [-50, 24, 15],
  ]) {
    for (let i = 0; i < 7; i += 1) {
      const material = new THREE.SpriteMaterial({
        map: steamTexture,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        fog: true,
      });
      const sprite = new THREE.Sprite(material);
      const scale = 5 + i * 1.6;
      sprite.position.set(x + i * 0.7, base + i * 2.2, z);
      sprite.scale.set(scale, scale * 0.72, 1);
      sprite.userData.phase = random() * Math.PI * 2;
      root.add(sprite);
      plumes.push(sprite);
    }
  }

  const beaconMaterial = new THREE.MeshStandardMaterial({
    color: 0x551c12,
    emissive: 0xff3010,
    emissiveIntensity: 2.4,
  });
  for (const [x, y, z] of [
    [10.5, 5.15, 2.5],
    [-11, 4.65, 4.4],
    [14.5, 8.4, -13],
  ]) {
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 6), beaconMaterial.clone());
    beacon.position.set(x, y, z);
    beacon.userData.phase = random() * Math.PI * 2;
    root.add(beacon);
  }

  return (elapsed) => {
    for (const plume of plumes) {
      const phase = elapsed * 0.08 + plume.userData.phase;
      plume.position.x += Math.sin(phase) * 0.0008;
      plume.material.opacity = 0.09 + Math.sin(phase * 1.7) * 0.025;
    }
    root.children.forEach((object) => {
      if (object.userData.phase === undefined || !object.material?.emissive) return;
      object.material.emissiveIntensity =
        Math.sin(elapsed * 2.2 + object.userData.phase) > 0.72 ? 4 : 0.2;
    });
  };
}
