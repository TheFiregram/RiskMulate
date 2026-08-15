function addInstanced(THREE, parent, geometry, material, transforms, name) {
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
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function decorateMobileDensity(THREE, density) {
  if (!density || density.userData.mobileAuthoredDetailLiteInstalled) return;
  density.userData.mobileAuthoredDetailLiteInstalled = true;

  const shell = new THREE.MeshStandardMaterial({ color: 0x738083, roughness: 0.5, metalness: 0.5 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x2d373b, roughness: 0.62, metalness: 0.56 });
  const galvanized = new THREE.MeshStandardMaterial({ color: 0x97a1a3, roughness: 0.46, metalness: 0.62 });
  const safety = new THREE.MeshStandardMaterial({ color: 0xb88424, roughness: 0.58, metalness: 0.28 });

  const vesselSpecs = [
    { x: -17.5, y: 5.1, z: -19.5, r: 1.7, h: 9.5 },
    { x: 17.2, y: 4.35, z: -18.5, r: 1.45, h: 8.1 },
    { x: -16.8, y: 4.1, z: 18.2, r: 1.25, h: 7.6 },
    { x: 18.4, y: 5.6, z: 17.2, r: 1.8, h: 10.5 },
  ];

  for (const child of density.children) {
    if (!child.isMesh) continue;
    for (const spec of vesselSpecs) {
      const sameX = Math.abs(child.position.x - spec.x) < 0.02;
      const sameZ = Math.abs(child.position.z - spec.z) < 0.02;
      if (!sameX || !sameZ) continue;
      if (child.geometry?.type === 'CylinderGeometry' || child.geometry?.type === 'SphereGeometry') child.visible = false;
    }
  }

  addInstanced(
    THREE,
    density,
    new THREE.CylinderGeometry(1, 1, 1, 14),
    shell,
    vesselSpecs.map((spec) => ({ position: [spec.x, spec.y, spec.z], scale: [spec.r, spec.h, spec.r] })),
    'mobile-lite-vessel-shells',
  );

  addInstanced(
    THREE,
    density,
    new THREE.CylinderGeometry(1, 1.08, 1, 12),
    darkSteel,
    vesselSpecs.map((spec) => ({
      position: [spec.x, spec.y - spec.h / 2 - 0.5, spec.z],
      scale: [spec.r * 0.72, 1.0, spec.r * 0.72],
    })),
    'mobile-lite-vessel-skirts',
  );

  const platformTransforms = vesselSpecs.map((spec) => ({
    position: [spec.x, spec.y + spec.h * 0.17, spec.z],
    rotation: [Math.PI / 2, 0, 0],
    scale: [spec.r + 0.5, spec.r + 0.5, 1],
  }));
  addInstanced(
    THREE,
    density,
    new THREE.TorusGeometry(1, 0.055, 6, 18),
    galvanized,
    platformTransforms,
    'mobile-lite-vessel-platform-rings',
  );

  const stackSpecs = [
    { x: -20.5, z: -10 },
    { x: 20.5, z: -8 },
    { x: -20.5, z: 7 },
    { x: 20.5, z: 8 },
  ];

  for (const child of density.children) {
    if (!child.isMesh) continue;
    for (const spec of stackSpecs) {
      if (Math.abs(child.position.x - spec.x) > 0.02 || Math.abs(child.position.z - spec.z) > 0.02) continue;
      if (child.geometry?.type === 'CylinderGeometry') child.visible = false;
    }
  }

  addInstanced(
    THREE,
    density,
    new THREE.CylinderGeometry(0.68, 0.9, 7.4, 12),
    darkSteel,
    stackSpecs.map((spec) => ({ position: [spec.x, 4.25, spec.z] })),
    'mobile-lite-utility-stacks',
  );

  addInstanced(
    THREE,
    density,
    new THREE.ConeGeometry(0.9, 0.36, 12),
    safety,
    stackSpecs.map((spec) => ({ position: [spec.x, 8.15, spec.z] })),
    'mobile-lite-stack-caps',
  );

  if (typeof window !== 'undefined') {
    window.RiskMulateMobileAuthoredDetail = {
      installed: true,
      vesselCount: vesselSpecs.length,
      stackCount: stackSpecs.length,
      shadowCasting: false,
    };
  }
}

export function installMobileAuthoredDetailLite(THREE) {
  if (globalThis.__riskmulateMobileAuthoredDetailLiteInstalled) return;
  globalThis.__riskmulateMobileAuthoredDetailLiteInstalled = true;

  const originalAdd = THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add = function addWithMobileAuthoredDetail(...objects) {
    const result = originalAdd.apply(this, objects);
    for (const object of objects) {
      if (object?.name !== 'foreground-industrial-density') continue;
      queueMicrotask(() => decorateMobileDensity(THREE, object));
    }
    return result;
  };
}
