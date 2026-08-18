/**
 * Rear gate / secondary egress environment
 * ----------------------------------------
 * Educational purpose: make the secondary emergency egress path readable when the
 * player turns 180° from spawn. Multipath residual teaching for emergency-access
 * depends on this location being obvious — not an empty pad with thin posts.
 *
 * Layout (player spawns near z≈15 looking −Z into the plant):
 *   z ≈ 17–19  blocked egress path + finding
 *   z ≈ 19–21  vehicle boom / gate throat
 *   z ≈ 21–25  gate house, stores, perimeter fence, billboard zone
 */

function mat(THREE, color, roughness = 0.86, metalness = 0.12, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    ...extras,
  });
}

function box(THREE, parent, w, h, d, material, x, y, z, ry = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  parent.add(mesh);
  return mesh;
}

function cyl(THREE, parent, rTop, rBot, h, material, x, y, z, segments = 10) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Simple canvas sign — readable from spawn when facing +Z. */
function makeSignTexture(textLines, w = 512, h = 256, bg = '#1a2228', fg = '#f0c27a') {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#c9a329';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineH = h / (textLines.length + 1);
  textLines.forEach((line, i) => {
    ctx.font = i === 0 ? 'bold 48px system-ui, sans-serif' : '32px system-ui, sans-serif';
    ctx.fillText(line, w / 2, lineH * (i + 1));
  });
  return canvas;
}

function buildRearGate(THREE, scene) {
  if (scene.getObjectByName('rear-gate-environment')) {
    return scene.getObjectByName('rear-gate-environment');
  }

  const group = new THREE.Group();
  group.name = 'rear-gate-environment';
  group.userData.assetType = 'rear-gate-environment';
  group.userData.visualOnly = true;

  const concrete = mat(THREE, 0x6a7074, 0.94, 0.04);
  const concreteDark = mat(THREE, 0x4e5559, 0.92, 0.05);
  const metal = mat(THREE, 0x5a6469, 0.62, 0.42);
  const metalDark = mat(THREE, 0x2f383c, 0.7, 0.5);
  const yellow = mat(THREE, 0xc9a329, 0.72, 0.18);
  const hazard = mat(THREE, 0xc9a329, 0.55, 0.2, { emissive: 0x3a2a08, emissiveIntensity: 0.25 });
  const brick = mat(THREE, 0x6b5548, 0.9, 0.06);
  const roof = mat(THREE, 0x343d43, 0.8, 0.2);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x7a9aaa,
    roughness: 0.22,
    metalness: 0.15,
    transparent: true,
    opacity: 0.55,
  });
  const asphalt = mat(THREE, 0x2a2c2e, 0.98, 0.02);
  const stripe = mat(THREE, 0xd8d2c4, 0.9, 0.02);
  const red = mat(THREE, 0x8b2e2e, 0.7, 0.15);
  const white = mat(THREE, 0xe8e4d8, 0.85, 0.05);

  // --- Apron / road surface (reads as a real service yard) ---
  box(THREE, group, 44, 0.05, 10.5, asphalt, 0, 0.02, 21.0);
  box(THREE, group, 44, 0.02, 0.22, stripe, 0, 0.05, 21.0);
  // Egress lane chevrons toward gate throat
  for (let i = 0; i < 5; i += 1) {
    box(THREE, group, 1.1, 0.03, 0.45, yellow, -8.2, 0.04, 16.2 + i * 0.85);
  }
  box(THREE, group, 3.2, 0.03, 0.5, hazard, -8.2, 0.05, 20.2);

  // --- Gate house (left) ---
  box(THREE, group, 5.6, 3.4, 4.4, brick, -12.2, 1.7, 22.4);
  box(THREE, group, 5.9, 0.32, 4.7, roof, -12.2, 3.5, 22.4);
  box(THREE, group, 2.0, 1.5, 0.1, glass, -12.2, 2.05, 20.25);
  box(THREE, group, 1.0, 2.2, 0.1, metalDark, -14.2, 1.2, 20.25);
  box(THREE, group, 3.4, 0.12, 1.7, metal, -12.2, 3.0, 19.9);
  // Window frame
  box(THREE, group, 2.15, 0.08, 0.12, metalDark, -12.2, 2.85, 20.2);
  box(THREE, group, 2.15, 0.08, 0.12, metalDark, -12.2, 1.25, 20.2);

  // --- Stores / workshop (right) ---
  box(THREE, group, 9.2, 4.0, 6.0, concreteDark, 14.8, 2.0, 22.2);
  box(THREE, group, 9.6, 0.35, 6.4, roof, 14.8, 4.15, 22.2);
  box(THREE, group, 2.8, 2.8, 0.14, metalDark, 14.8, 1.5, 19.25);
  box(THREE, group, 6.4, 0.6, 2.4, concrete, 14.8, 0.3, 18.6);

  // --- Main gate throat: pillars + panels + boom (must silhouette against sky) ---
  const pillarL = box(THREE, group, 0.55, 3.6, 0.55, concreteDark, -5.4, 1.8, 19.6);
  const pillarR = box(THREE, group, 0.55, 3.6, 0.55, concreteDark, 5.4, 1.8, 19.6);
  // Cap lights
  box(THREE, group, 0.7, 0.18, 0.7, yellow, -5.4, 3.7, 19.6);
  box(THREE, group, 0.7, 0.18, 0.7, yellow, 5.4, 3.7, 19.6);
  // Cross header
  box(THREE, group, 11.0, 0.28, 0.35, metal, 0, 3.55, 19.6);

  // Gate panels (vertical bars — readable as a vehicle gate)
  for (const side of [-1, 1]) {
    const baseX = side * 2.7;
    box(THREE, group, 4.4, 0.18, 0.12, metalDark, baseX, 0.35, 19.55);
    box(THREE, group, 4.4, 0.18, 0.12, metalDark, baseX, 2.55, 19.55);
    for (let i = 0; i < 7; i += 1) {
      const x = baseX - 1.9 + i * 0.55;
      box(THREE, group, 0.1, 2.3, 0.1, metal, x, 1.4, 19.55);
    }
  }

  // Vehicle boom (yellow) — thicker and longer so it reads at distance
  cyl(THREE, group, 0.18, 0.18, 1.35, yellow, -5.5, 0.7, 18.9, 12);
  cyl(THREE, group, 0.18, 0.18, 1.35, yellow, 5.5, 0.7, 18.9, 12);
  const boom = box(THREE, group, 12.2, 0.22, 0.22, hazard, 0, 1.25, 18.9);
  boom.rotation.z = -0.06;
  // Hazard stripes on boom via alternating thin boxes
  for (let i = 0; i < 8; i += 1) {
    box(THREE, group, 0.55, 0.24, 0.24, i % 2 === 0 ? hazard : metalDark, -5.2 + i * 1.35, 1.25, 18.9);
  }

  // Control cabinet
  box(THREE, group, 0.7, 1.3, 0.45, metalDark, -6.3, 0.7, 18.5);
  box(THREE, group, 0.25, 0.15, 0.05, red, -6.3, 1.15, 18.28);

  // --- Perimeter fence (dense enough to frame the yard) ---
  for (let i = -12; i <= 12; i += 1) {
    const x = i * 1.85;
    if (Math.abs(x) < 6.2) continue; // leave gate throat open
    cyl(THREE, group, 0.06, 0.06, 2.6, metalDark, x, 1.3, 24.8, 8);
    box(THREE, group, 1.8, 0.05, 0.05, metal, x + 0.9, 2.4, 24.8);
    box(THREE, group, 1.8, 0.05, 0.05, metal, x + 0.9, 1.5, 24.8);
    box(THREE, group, 1.8, 0.05, 0.05, metal, x + 0.9, 0.65, 24.8);
  }

  // Light poles
  for (const x of [-15.5, -3.5, 3.5, 15.5]) {
    cyl(THREE, group, 0.09, 0.11, 5.4, metalDark, x, 2.7, 17.6, 8);
    box(THREE, group, 1.0, 0.14, 0.4, yellow, x, 5.35, 17.6);
  }

  // Parked service truck silhouette (left of egress path)
  box(THREE, group, 5.2, 2.15, 2.3, metal, -17.2, 1.2, 18.6);
  box(THREE, group, 1.7, 1.2, 2.25, metalDark, -20.0, 1.45, 18.6);
  for (const [tx, tz] of [
    [-15.8, 17.7],
    [-15.8, 19.5],
    [-18.6, 17.7],
    [-18.6, 19.5],
  ]) {
    cyl(THREE, group, 0.45, 0.45, 0.38, metalDark, tx, 0.42, tz, 12);
  }

  // Drum / crate clutter (right apron — not the egress path)
  for (const [x, z] of [
    [8.2, 17.4],
    [9.5, 17.7],
    [8.6, 18.6],
  ]) {
    box(THREE, group, 1.15, 1.0, 1.15, mat(THREE, 0x7a5a3a, 0.95, 0.02), x, 0.5, z);
  }
  for (const [x, z] of [
    [-2.8, 17.2],
    [-1.7, 17.5],
  ]) {
    cyl(THREE, group, 0.4, 0.4, 1.1, mat(THREE, 0x3d6b4f, 0.7, 0.25), x, 0.55, z, 12);
  }

  // --- EGRESS sign (canvas) facing spawn (+Z face toward player looking +Z) ---
  try {
    const canvas = makeSignTexture(['SITE EGRESS', 'SECONDARY EXIT', 'KEEP CLEAR'], 512, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;
    tex.needsUpdate = true;
    const signMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.5), signMat);
    // Face toward spawn (player at lower z looking +Z to see the gate)
    sign.position.set(-5.6, 2.85, 19.25);
    sign.rotation.y = Math.PI; // face −Z? Player looks +Z when turned around, so sign faces −Z
    // Player at z=15 looks toward +Z to see gate at z=19. Sign should face −Z (toward player).
    sign.rotation.y = 0; // plane default faces +Z; rotate 180 so faces −Z
    sign.rotation.y = Math.PI;
    group.add(sign);

    // Duplicate smaller sign on right pillar
    const sign2 = sign.clone();
    sign2.position.set(5.6, 2.85, 19.25);
    group.add(sign2);
  } catch (error) {
    console.warn('[RiskMulate] egress sign texture failed', error);
  }

  // Ground KEEP CLEAR strip under gate throat
  box(THREE, group, 10.5, 0.025, 1.6, mat(THREE, 0x2a2a2a, 0.95, 0.02), 0, 0.04, 19.5);
  for (let i = -4; i <= 4; i += 1) {
    box(THREE, group, 0.9, 0.03, 0.18, i % 2 === 0 ? yellow : metalDark, i * 1.1, 0.055, 19.5);
  }

  scene.add(group);
  return group;
}

function registerRearColliders() {
  if (window.RiskMulateRearGate?.collidersRegistered) return true;
  const addObstacle = window.RiskMulateScene?.addObstacle;
  if (typeof addObstacle !== 'function') return false;

  const specs = [
    { x: -12.2, z: 22.4, w: 5.8, d: 4.6 }, // gate house
    { x: 14.8, z: 22.2, w: 9.4, d: 6.2 }, // stores
    { x: -17.2, z: 18.6, w: 5.6, d: 2.8 }, // truck
    { x: 0, z: 19.6, w: 11.5, d: 1.4 }, // gate throat / boom zone
    { x: -8.2, z: 17.4, w: 2.8, d: 2.4 }, // blocked egress stacks
    { x: 8.5, z: 17.6, w: 2.4, d: 2.2 }, // crates
    { x: -5.4, z: 19.6, w: 0.8, d: 0.8 }, // pillar L
    { x: 5.4, z: 19.6, w: 0.8, d: 0.8 }, // pillar R
  ];
  for (const spec of specs) addObstacle(spec);
  if (window.RiskMulateRearGate) window.RiskMulateRearGate.collidersRegistered = true;
  return true;
}

function tryBuild() {
  const scene = window.RiskMulateScene?.scene;
  const THREE = window.RiskMulateScene?.THREE;
  if (!scene || !THREE) return false;
  try {
    buildRearGate(THREE, scene);
    registerRearColliders();
    if (window.RiskMulateRearGate) window.RiskMulateRearGate.built = true;
    return Boolean(window.RiskMulateRearGate?.collidersRegistered);
  } catch (error) {
    console.warn('[RiskMulate] rear-gate build failed', error);
    return false;
  }
}

export function installRearGateEnvironment() {
  const api = window.RiskMulateRearGate || {
    built: false,
    installed: true,
    collidersRegistered: false,
  };
  window.RiskMulateRearGate = api;

  if (api.built && !api.collidersRegistered) {
    registerRearColliders();
    if (api.collidersRegistered) return api;
  }
  if (api.built && api.collidersRegistered) return api;

  if (tryBuild() && api.collidersRegistered) return api;

  const onReady = () => {
    tryBuild();
    registerRearColliders();
    if (api.collidersRegistered) {
      window.removeEventListener('riskmulate:scene-ready', onReady);
    }
  };
  window.addEventListener('riskmulate:scene-ready', onReady);

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    tryBuild();
    registerRearColliders();
    if (api.collidersRegistered || attempts > 80) {
      clearInterval(timer);
      window.removeEventListener('riskmulate:scene-ready', onReady);
    }
  }, 200);

  return api;
}
