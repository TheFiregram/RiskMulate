function seeded(seed) {
  let value = seed >>> 0;
  return () => (value = (value * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function mark(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildCinematicEnvironment(THREE, scene) {
  const random = seeded(31000);
  const root = new THREE.Group();
  root.name = "cinematic-industrial-environment";
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

  // A dense refinery skyline makes the training yard feel like one operating
  // unit inside a much larger site rather than an isolated prototype arena.
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
