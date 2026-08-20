import * as THREE from "three";

function seeded(seed: number) {
  let value = Math.max(1, Math.floor(seed * 10007));
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function canvasTexture(base: string, stroke: string, mode: "speckle" | "wood" | "bark") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  const random = seeded(base.length * 19 + stroke.length * 37);

  if (mode === "speckle") {
    for (let i = 0; i < 2800; i += 1) {
      ctx.fillStyle = `${stroke}${Math.floor(8 + random() * 34).toString(16).padStart(2, "0")}`;
      const size = 0.5 + random() * 2.2;
      ctx.fillRect(random() * 256, random() * 256, size, size);
    }
  } else {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = mode === "wood" ? 1.4 : 2.2;
    for (let i = 0; i < (mode === "wood" ? 85 : 130); i += 1) {
      const x = random() * 256;
      ctx.globalAlpha = 0.1 + random() * 0.28;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + random() * 14 - 7, 70, x + random() * 18 - 9, 180, x + random() * 12 - 6, 256);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(mode === "speckle" ? 2 : 1, mode === "bark" ? 3 : 1);
  texture.anisotropy = 4;
  return texture;
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0],
) {
  const result = new THREE.Mesh(geometry, material);
  result.position.set(...position);
  result.rotation.set(...rotation);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function branchBetween(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const branch = mesh(new THREE.CylinderGeometry(radius * 0.68, radius, direction.length(), 7), material);
  branch.position.copy(from).add(to).multiplyScalar(0.5);
  branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  parent.add(branch);
}

function finish(group: THREE.Group, name: string) {
  group.name = name;
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

export function createGeneratedAssetLibrary() {
  const coneTexture = canvasTexture("#d97918", "#39270f", "speckle");
  const barkTexture = canvasTexture("#4a392b", "#161813", "bark");
  const woodTexture = canvasTexture("#826641", "#30271b", "wood");
  const paintedTexture = canvasTexture("#365e5a", "#142a28", "speckle");

  const materials = {
    cone: new THREE.MeshStandardMaterial({ color: 0xf0841f, map: coneTexture, roughness: 0.67, metalness: 0.02 }),
    reflective: new THREE.MeshStandardMaterial({ color: 0xf1eee2, emissive: 0x77746d, emissiveIntensity: 0.22, roughness: 0.34, metalness: 0.08 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x151817, roughness: 0.95, metalness: 0.01 }),
    bark: new THREE.MeshStandardMaterial({ color: 0x554331, map: barkTexture, roughness: 1 }),
    leafDark: new THREE.MeshStandardMaterial({ color: 0x244b38, roughness: 0.96, flatShading: true }),
    leafMid: new THREE.MeshStandardMaterial({ color: 0x376448, roughness: 0.94, flatShading: true }),
    leafLight: new THREE.MeshStandardMaterial({ color: 0x55713e, roughness: 0.93, flatShading: true }),
    dryLeaf: new THREE.MeshStandardMaterial({ color: 0x767342, roughness: 0.95, flatShading: true }),
    wood: new THREE.MeshStandardMaterial({ color: 0x96734b, map: woodTexture, roughness: 0.88, metalness: 0.01 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x4d3c2a, map: woodTexture, roughness: 0.94 }),
    barrelTeal: new THREE.MeshStandardMaterial({ color: 0x326b65, map: paintedTexture, roughness: 0.42, metalness: 0.54 }),
    barrelOrange: new THREE.MeshStandardMaterial({ color: 0xc87521, roughness: 0.47, metalness: 0.48 }),
    galvanized: new THREE.MeshStandardMaterial({ color: 0x77817d, roughness: 0.38, metalness: 0.78 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x1b2826, roughness: 0.5, metalness: 0.62 }),
    safetyOrange: new THREE.MeshStandardMaterial({ color: 0xe58e25, roughness: 0.38, metalness: 0.34 }),
    safetyWhite: new THREE.MeshStandardMaterial({ color: 0xe7e6d9, roughness: 0.48, metalness: 0.2 }),
    crate: new THREE.MeshStandardMaterial({ color: 0x2b5350, map: paintedTexture, roughness: 0.58, metalness: 0.38 }),
  };

  const geometries = {
    coneBase: new THREE.BoxGeometry(0.72, 0.085, 0.72, 2, 1, 2),
    coneFoot: new THREE.BoxGeometry(0.61, 0.055, 0.61),
    coneLow: new THREE.CylinderGeometry(0.21, 0.31, 0.34, 24),
    coneBand: new THREE.CylinderGeometry(0.14, 0.21, 0.18, 24),
    coneTop: new THREE.CylinderGeometry(0.055, 0.14, 0.34, 24),
    coneCap: new THREE.CylinderGeometry(0.06, 0.06, 0.045, 18),
    barrel: new THREE.CylinderGeometry(0.43, 0.43, 1.28, 28),
    barrelLid: new THREE.CylinderGeometry(0.425, 0.425, 0.055, 28),
    barrelRing: new THREE.TorusGeometry(0.435, 0.035, 8, 30),
    palletSlat: new THREE.BoxGeometry(0.22, 0.11, 2.2),
    palletRunner: new THREE.BoxGeometry(1.65, 0.19, 0.25),
    root: new THREE.ConeGeometry(0.18, 0.9, 5),
  };

  function trafficCone(seed = 1, scale = 1) {
    const random = seeded(seed);
    const group = new THREE.Group();
    const base = mesh(geometries.coneBase, materials.rubber, [0, 0.045, 0]);
    base.rotation.y = (random() - 0.5) * 0.08;
    group.add(base, mesh(geometries.coneFoot, materials.rubber, [0, 0.105, 0]));
    group.add(mesh(geometries.coneLow, materials.cone, [0, 0.3, 0]));
    group.add(mesh(geometries.coneBand, materials.reflective, [0, 0.56, 0]));
    group.add(mesh(geometries.coneTop, materials.cone, [0, 0.82, 0]));
    group.add(mesh(geometries.coneCap, materials.rubber, [0, 1.01, 0]));
    const scuff = mesh(new THREE.TorusGeometry(0.295, 0.014, 6, 20), materials.rubber, [0, 0.14, 0], [Math.PI / 2, 0, 0]);
    scuff.scale.set(1, 1, 0.94);
    group.add(scuff);
    group.rotation.z = (random() - 0.5) * 0.025;
    group.scale.setScalar(scale);
    return finish(group, "Generated traffic cone");
  }

  function barrel(seed = 1, orange = false) {
    const random = seeded(seed);
    const group = new THREE.Group();
    const bodyMaterial = orange ? materials.barrelOrange : materials.barrelTeal;
    group.add(mesh(geometries.barrel, bodyMaterial, [0, 0.66, 0]));
    group.add(mesh(geometries.barrelLid, materials.galvanized, [0, 1.325, 0]));
    for (const y of [0.15, 0.46, 0.89, 1.22]) group.add(mesh(geometries.barrelRing, materials.darkMetal, [0, y, 0], [Math.PI / 2, 0, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12), materials.darkMetal, [0.22, 1.37, 0]));
    const label = mesh(new THREE.BoxGeometry(0.46, 0.33, 0.018), materials.safetyWhite, [0, 0.75, 0.43]);
    label.rotation.z = (random() - 0.5) * 0.08;
    group.add(label);
    group.rotation.y = random() * Math.PI * 2;
    return finish(group, "Generated ribbed barrel");
  }

  function pallet(seed = 1) {
    const random = seeded(seed);
    const group = new THREE.Group();
    for (let i = -3; i <= 3; i += 1) {
      const slat = mesh(geometries.palletSlat, i % 2 ? materials.wood : materials.woodDark, [i * 0.27, 0.28 + random() * 0.018, 0], [0, 0, (random() - 0.5) * 0.018]);
      group.add(slat);
    }
    for (const z of [-0.78, 0, 0.78]) group.add(mesh(geometries.palletRunner, materials.woodDark, [0, 0.1, z]));
    group.rotation.y = (random() - 0.5) * 0.04;
    return finish(group, "Generated wooden pallet");
  }

  function equipmentCrate(seed = 1) {
    const random = seeded(seed);
    const group = new THREE.Group();
    group.add(mesh(new THREE.BoxGeometry(1.8, 1.35, 1.4), materials.crate, [0, 0.72, 0]));
    const frame = materials.darkMetal;
    for (const x of [-0.84, 0.84]) {
      for (const z of [-0.64, 0.64]) group.add(mesh(new THREE.BoxGeometry(0.11, 1.48, 0.11), frame, [x, 0.74, z]));
    }
    for (const y of [0.08, 1.4]) {
      group.add(mesh(new THREE.BoxGeometry(1.84, 0.11, 0.11), frame, [0, y, 0.64]));
      group.add(mesh(new THREE.BoxGeometry(1.84, 0.11, 0.11), frame, [0, y, -0.64]));
      group.add(mesh(new THREE.BoxGeometry(0.11, 0.11, 1.4), frame, [0.84, y, 0]));
      group.add(mesh(new THREE.BoxGeometry(0.11, 0.11, 1.4), frame, [-0.84, y, 0]));
    }
    const tag = mesh(new THREE.BoxGeometry(0.7, 0.33, 0.025), materials.safetyWhite, [0, 0.85, 0.71], [0, 0, (random() - 0.5) * 0.04]);
    group.add(tag);
    return finish(group, "Generated equipment crate");
  }

  function safetyBarrier(seed = 1) {
    const random = seeded(seed);
    const group = new THREE.Group();
    for (const x of [-1.22, 1.22]) {
      group.add(mesh(new THREE.BoxGeometry(0.82, 0.1, 0.44), materials.rubber, [x, 0.05, 0]));
      group.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.45, 12), materials.galvanized, [x, 0.78, 0]));
    }
    const panel = new THREE.Group();
    panel.position.y = 1.05;
    for (let i = 0; i < 9; i += 1) {
      const stripe = mesh(new THREE.BoxGeometry(0.33, 0.42, 0.09), i % 2 ? materials.safetyWhite : materials.safetyOrange, [-1.32 + i * 0.33, 0, 0], [0, 0, i % 2 ? -0.12 : 0.12]);
      panel.add(stripe);
    }
    panel.rotation.z = (random() - 0.5) * 0.018;
    group.add(panel);
    group.add(mesh(new THREE.BoxGeometry(2.95, 0.09, 0.12), materials.darkMetal, [0, 0.81, 0]));
    group.add(mesh(new THREE.BoxGeometry(2.95, 0.09, 0.12), materials.darkMetal, [0, 1.29, 0]));
    return finish(group, "Generated safety barrier");
  }

  function pineTree(seed = 1, scale = 1) {
    const random = seeded(seed);
    const group = new THREE.Group();
    const height = 5.1 + random() * 1.8;
    group.add(mesh(new THREE.CylinderGeometry(0.15, 0.31, height * 0.7, 9), materials.bark, [0, height * 0.35, 0]));
    for (let i = 0; i < 4; i += 1) {
      const y = 1.9 + i * height * 0.17;
      const radius = 1.5 - i * 0.23 + random() * 0.12;
      const foliage = mesh(new THREE.ConeGeometry(radius, 2.5, 9), i % 2 ? materials.leafDark : materials.leafMid, [(random() - 0.5) * 0.12, y, (random() - 0.5) * 0.12], [0, random() * Math.PI, (random() - 0.5) * 0.05]);
      group.add(foliage);
    }
    for (let i = 0; i < 4; i += 1) {
      const root = mesh(geometries.root, materials.bark, [Math.cos(i * Math.PI / 2) * 0.28, 0.25, Math.sin(i * Math.PI / 2) * 0.28], [Math.PI / 2, 0, i * Math.PI / 2]);
      root.scale.set(0.7, 0.9, 0.5);
      group.add(root);
    }
    group.rotation.y = random() * Math.PI * 2;
    group.scale.setScalar(scale);
    group.userData.swayPhase = random() * Math.PI * 2;
    return finish(group, "Generated pine tree");
  }

  function broadleafTree(seed = 1, scale = 1) {
    const random = seeded(seed);
    const group = new THREE.Group();
    const height = 4.6 + random() * 1.6;
    group.add(mesh(new THREE.CylinderGeometry(0.2, 0.38, height * 0.72, 9), materials.bark, [0, height * 0.36, 0], [0, 0, (random() - 0.5) * 0.05]));
    const branches = [
      [new THREE.Vector3(0, 2.4, 0), new THREE.Vector3(1.2, 4.1, 0.25)],
      [new THREE.Vector3(0, 2.7, 0), new THREE.Vector3(-1.15, 4.35, -0.35)],
      [new THREE.Vector3(0, 3.1, 0), new THREE.Vector3(0.35, 4.8, -0.95)],
    ] as const;
    branches.forEach(([from, to]) => branchBetween(group, from, to, 0.13, materials.bark));
    const clusters: [number, number, number, number][] = [
      [0, height, 0, 1.35], [1.1, height * 0.82, 0.2, 1.08], [-1.05, height * 0.85, -0.3, 1.12],
      [0.35, height * 0.75, -1, 1.0], [-0.45, height * 0.74, 0.95, 1.0], [0, height * 0.92, 0.6, 0.88],
    ];
    clusters.forEach(([x, y, z, size], index) => {
      const crown = mesh(new THREE.IcosahedronGeometry(size * (0.88 + random() * 0.22), 1), index % 3 === 0 ? materials.leafLight : index % 2 ? materials.leafDark : materials.leafMid, [x, y, z], [random(), random(), random()]);
      crown.scale.y = 0.82 + random() * 0.23;
      group.add(crown);
    });
    group.rotation.y = random() * Math.PI * 2;
    group.scale.setScalar(scale);
    group.userData.swayPhase = random() * Math.PI * 2;
    return finish(group, "Generated broadleaf tree");
  }

  function grassPatch(seed = 1, scale = 1) {
    const random = seeded(seed);
    const positions: number[] = [];
    for (let i = 0; i < 22; i += 1) {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * 0.75;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 0.23 + random() * 0.5;
      const width = 0.025 + random() * 0.04;
      const dx = Math.cos(angle) * width;
      const dz = Math.sin(angle) * width;
      positions.push(x - dx, 0, z - dz, x + dx, 0, z + dz, x + (random() - 0.5) * 0.1, height, z + (random() - 0.5) * 0.1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    const patch = mesh(geometry, random() > 0.7 ? materials.dryLeaf : materials.leafLight);
    patch.material.side = THREE.DoubleSide;
    patch.scale.setScalar(scale);
    const group = new THREE.Group();
    group.add(patch);
    return finish(group, "Generated grass patch");
  }

  function dispose() {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
    coneTexture.dispose();
    barkTexture.dispose();
    woodTexture.dispose();
    paintedTexture.dispose();
  }

  return { trafficCone, barrel, pallet, equipmentCrate, safetyBarrier, pineTree, broadleafTree, grassPatch, dispose };
}

export type GeneratedAssetLibrary = ReturnType<typeof createGeneratedAssetLibrary>;
