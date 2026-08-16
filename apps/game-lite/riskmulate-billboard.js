/**
 * RiskMulate site billboard
 * ------------------------
 * Fixed double-sided yard identity board behind spawn.
 * Readable from either approach without spinning the face (spinning caused
 * the panel to shear through the frame and show a black half on mobile).
 */

function makeTexture(THREE, canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function paintCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Deep industrial panel
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0e1a22');
  bg.addColorStop(0.5, '#132430');
  bg.addColorStop(1, '#0b151c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Outer gold frame band
  ctx.strokeStyle = '#c9a329';
  ctx.lineWidth = Math.max(8, w * 0.012);
  ctx.strokeRect(w * 0.02, h * 0.035, w * 0.96, h * 0.93);

  // Top accent bar
  ctx.fillStyle = '#d98a36';
  ctx.fillRect(w * 0.02, h * 0.035, w * 0.96, h * 0.028);

  // Brand accent bar
  ctx.fillStyle = '#d98a36';
  ctx.fillRect(w * 0.055, h * 0.14, w * 0.018, h * 0.22);

  // Brand
  ctx.fillStyle = '#f2f7f9';
  ctx.font = `700 ${Math.round(h * 0.145)}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.fillText('RISKMULATE', w * 0.09, h * 0.26);

  // Sub-brand
  ctx.fillStyle = '#8ea3ad';
  ctx.font = `600 ${Math.round(h * 0.052)}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.fillText('FIELD RISK  ·  CONTINUITY TRAINING', w * 0.09, h * 0.345);

  // Divider
  ctx.strokeStyle = 'rgba(201,163,41,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.055, h * 0.4);
  ctx.lineTo(w * 0.94, h * 0.4);
  ctx.stroke();

  // Site name
  ctx.fillStyle = '#e8f0f3';
  ctx.font = `700 ${Math.round(h * 0.07)}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.fillText('NORTHBRIDGE FILTRATION WORKS', w * 0.055, h * 0.51);

  // Rotation line
  ctx.fillStyle = '#9eb0b9';
  ctx.font = `500 ${Math.round(h * 0.048)}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.fillText('Continuity Rotation 03  ·  Supply Integrity Window', w * 0.055, h * 0.595);

  // Process strip
  ctx.fillStyle = 'rgba(217,138,54,0.18)';
  ctx.fillRect(w * 0.04, h * 0.68, w * 0.92, h * 0.24);

  ctx.fillStyle = '#e5a258';
  ctx.font = `700 ${Math.round(h * 0.04)}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.fillText('ISO 31000', w * 0.055, h * 0.765);

  ctx.fillStyle = '#d6e2e7';
  ctx.font = `600 ${Math.round(h * 0.036)}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.fillText('CONTEXT → IDENTIFY → ANALYZE → EVALUATE → TREAT → MONITOR', w * 0.055, h * 0.84);

  ctx.fillStyle = '#a9bac4';
  ctx.font = `500 ${Math.round(h * 0.034)}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.fillText('Walk the plant. Capture evidence at equipment. Apply field controls.', w * 0.055, h * 0.895);
}

function buildBillboard(THREE, scene) {
  const existing = scene.getObjectByName('riskmulate-billboard-root');
  // Rebuild if an older spinning single-face board is present.
  if (existing) {
    const hasFront = existing.getObjectByName('riskmulate-billboard-face-front');
    if (hasFront) {
      return { root: existing, face: hasFront };
    }
    scene.remove(existing);
  }

  const root = new THREE.Group();
  root.name = 'riskmulate-billboard-root';
  // Behind spawn (player looks ~180° from plant entry). Fixed orientation.
  root.position.set(0, 0, 20.6);

  const metal = new THREE.MeshStandardMaterial({ color: 0x3a4449, roughness: 0.7, metalness: 0.45 });
  const metalDark = new THREE.MeshStandardMaterial({ color: 0x1e2529, roughness: 0.78, metalness: 0.52 });
  const yellow = new THREE.MeshStandardMaterial({
    color: 0xc9a329,
    roughness: 0.5,
    metalness: 0.28,
    emissive: 0x3a2a08,
    emissiveIntensity: 0.15,
  });

  // Posts
  for (const x of [-3.9, 3.9]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 6.8, 12), metalDark);
    post.position.set(x, 3.4, 0);
    post.castShadow = false;
    root.add(post);

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.2, 0.58), metal);
    base.position.set(x, 0.1, 0);
    root.add(base);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.32), yellow);
    cap.position.set(x, 6.75, 0);
    root.add(cap);
  }

  // Top beam
  const beam = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.2, 0.2), metal);
  beam.position.set(0, 6.55, 0);
  root.add(beam);

  // Solid panel core (prevents black voids between faces)
  const core = new THREE.Mesh(new THREE.BoxGeometry(7.7, 3.85, 0.14), metalDark);
  core.position.set(0, 4.05, 0);
  root.add(core);

  // Gold frame rails around the panel
  const frameParts = [
    // top / bottom
    [7.95, 0.12, 0.22, 0, 6.0, 0],
    [7.95, 0.12, 0.22, 0, 2.1, 0],
    // left / right
    [0.12, 4.0, 0.22, -3.95, 4.05, 0],
    [0.12, 4.0, 0.22, 3.95, 4.05, 0],
  ];
  for (const [sx, sy, sz, px, py, pz] of frameParts) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), yellow);
    rail.position.set(px, py, pz);
    root.add(rail);
  }

  // Canvas texture (always high-res — one board texture is cheap)
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  paintCanvas(canvas);
  const texture = makeTexture(THREE, canvas);

  const faceMat = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    fog: false,
    side: THREE.FrontSide,
  });
  // Separate material instance for the reverse face so we can dispose cleanly later
  const faceMatBack = faceMat.clone();

  const panelW = 7.6;
  const panelH = 3.8;

  // Front face: toward spawn (negative Z). Plane default faces +Z → flip 180°.
  const front = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), faceMat);
  front.name = 'riskmulate-billboard-face-front';
  front.position.set(0, 4.05, 0.09);
  front.rotation.y = Math.PI;
  front.frustumCulled = false;
  front.userData.billboard = true;
  root.add(front);

  // Rear face: toward far yard / plant rear (+Z). Default plane orientation.
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), faceMatBack);
  rear.name = 'riskmulate-billboard-face-rear';
  rear.position.set(0, 4.05, -0.09);
  rear.frustumCulled = false;
  rear.userData.billboard = true;
  root.add(rear);

  // Corner brackets
  for (const [x, y] of [
    [-3.75, 5.85],
    [3.75, 5.85],
    [-3.75, 2.25],
    [3.75, 2.25],
  ]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.28), yellow);
    bracket.position.set(x, y, 0);
    root.add(bracket);
  }

  scene.add(root);
  return { root, face: front };
}

export function installRiskMulateBillboard() {
  if (window.RiskMulateBillboard?.built) return window.RiskMulateBillboard;

  function tryBuild() {
    const scene = window.RiskMulateScene?.scene;
    const THREE = window.RiskMulateScene?.THREE;
    if (!scene || !THREE) return false;
    try {
      const built = buildBillboard(THREE, scene);
      if (!built?.root) return false;
      if (window.RiskMulateBillboard) window.RiskMulateBillboard.built = true;
      return true;
    } catch (error) {
      console.warn('[RiskMulate] billboard build failed', error);
      return false;
    }
  }

  const api = window.RiskMulateBillboard || {
    built: false,
    installed: true,
    dispose() {
      /* no RAF loop */
    },
  };
  window.RiskMulateBillboard = api;

  if (tryBuild()) return api;

  const onReady = () => {
    if (tryBuild()) window.removeEventListener('riskmulate:scene-ready', onReady);
  };
  window.addEventListener('riskmulate:scene-ready', onReady);

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (tryBuild() || attempts > 80) {
      clearInterval(timer);
      window.removeEventListener('riskmulate:scene-ready', onReady);
    }
  }, 200);

  return api;
}
