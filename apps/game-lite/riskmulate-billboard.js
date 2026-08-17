/**
 * RiskMulate site billboard
 * ------------------------
 * Fixed double-sided yard identity board behind spawn.
 * Readable from either approach without spinning the face.
 *
 * Why canvas-mirror (not texture.repeat.x = -1):
 * PlaneGeometry faces +Z. Facing spawn (−Z) needs rotation.y = π, which
 * mirrors UVs relative to the reader. Negative texture.repeat.x is unreliable
 * on some mobile GPUs. Instead: paint a horizontally mirrored canvas for the
 * rotated face so rotation + mirrored pixels cancel to L→R text.
 */

function makeTexture(THREE, canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.flipY = true;
  texture.needsUpdate = true;
  return texture;
}

/** Horizontally mirror a canvas so rotation.y = π yields readable L→R text. */
function mirrorCanvasX(source) {
  const c = document.createElement('canvas');
  c.width = source.width;
  c.height = source.height;
  const ctx = c.getContext('2d');
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0);
  return c;
}

function paintCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#102028');
  bg.addColorStop(0.5, '#152a36');
  bg.addColorStop(1, '#0d181f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d4ad35';
  ctx.lineWidth = Math.max(10, w * 0.014);
  ctx.strokeRect(w * 0.02, h * 0.035, w * 0.96, h * 0.93);

  ctx.fillStyle = '#e0923a';
  ctx.fillRect(w * 0.02, h * 0.035, w * 0.96, h * 0.032);

  // Left accent bar — must read as left when viewed correctly
  ctx.fillStyle = '#e0923a';
  ctx.fillRect(w * 0.055, h * 0.13, w * 0.02, h * 0.24);

  ctx.fillStyle = '#f5fafc';
  ctx.font = `700 ${Math.round(h * 0.15)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText('RISKMULATE', w * 0.09, h * 0.26);

  ctx.fillStyle = '#a8bcc6';
  ctx.font = `600 ${Math.round(h * 0.055)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText('FIELD RISK  ·  CONTINUITY TRAINING', w * 0.09, h * 0.345);

  ctx.strokeStyle = 'rgba(212,173,53,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.055, h * 0.4);
  ctx.lineTo(w * 0.94, h * 0.4);
  ctx.stroke();

  ctx.fillStyle = '#eef5f8';
  ctx.font = `700 ${Math.round(h * 0.072)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText('NORTHBRIDGE FILTRATION WORKS', w * 0.055, h * 0.51);

  ctx.fillStyle = '#b0c0c8';
  ctx.font = `500 ${Math.round(h * 0.05)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText('Continuity Rotation 03  ·  Supply Integrity Window', w * 0.055, h * 0.59);

  ctx.fillStyle = 'rgba(20, 36, 44, 0.92)';
  ctx.fillRect(w * 0.055, h * 0.66, w * 0.89, h * 0.26);

  ctx.fillStyle = '#e0923a';
  ctx.font = `700 ${Math.round(h * 0.045)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText('ISO 31000', w * 0.07, h * 0.73);

  ctx.fillStyle = '#d7e4ea';
  ctx.font = `600 ${Math.round(h * 0.038)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText('CONTEXT → IDENTIFY → ANALYZE → EVALUATE → TREAT → MONITOR', w * 0.07, h * 0.8);

  ctx.fillStyle = '#9eb0ba';
  ctx.font = `500 ${Math.round(h * 0.034)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText('Walk the plant. Capture evidence at equipment. Apply field controls.', w * 0.07, h * 0.875);
}

function disposePriorBillboard(scene) {
  const prior = [];
  scene.traverse((obj) => {
    if (obj.name === 'riskmulate-billboard-root' || obj.userData?.billboardRoot) prior.push(obj);
  });
  for (const obj of prior) {
    obj.parent?.remove(obj);
    obj.traverse?.((child) => {
      if (child.geometry) child.geometry.dispose?.();
      if (child.material) {
        if (child.material.map) child.material.map.dispose?.();
        child.material.dispose?.();
      }
    });
  }
}

function buildBillboard(THREE, scene) {
  disposePriorBillboard(scene);

  const root = new THREE.Group();
  root.name = 'riskmulate-billboard-root';
  root.userData.billboardRoot = true;
  // Behind spawn, facing the approach from the plant pad
  root.position.set(0, 0, 22);

  const metal = new THREE.MeshStandardMaterial({ color: 0x1a2228, metalness: 0.6, roughness: 0.45 });
  const metalDark = new THREE.MeshStandardMaterial({ color: 0x0e1418, metalness: 0.5, roughness: 0.55 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xc9a328, metalness: 0.35, roughness: 0.4 });

  for (const x of [-3.6, 3.6]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 6.6, 10), metal);
    post.position.set(x, 3.3, 0);
    root.add(post);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.35), yellow);
    cap.position.set(x, 6.7, 0);
    root.add(cap);
  }

  const beam = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.2, 0.2), metal);
  beam.position.set(0, 6.55, 0);
  root.add(beam);

  const core = new THREE.Mesh(new THREE.BoxGeometry(7.7, 3.85, 0.12), metalDark);
  core.position.set(0, 4.05, 0);
  root.add(core);

  const frameParts = [
    [7.95, 0.12, 0.22, 0, 6.0, 0],
    [7.95, 0.12, 0.22, 0, 2.1, 0],
    [0.12, 4.0, 0.22, -3.95, 4.05, 0],
    [0.12, 4.0, 0.22, 3.95, 4.05, 0],
  ];
  for (const [sx, sy, sz, px, py, pz] of frameParts) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), yellow);
    rail.position.set(px, py, pz);
    root.add(rail);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  paintCanvas(canvas);

  // Front (spawn-facing): rotated 180° → needs pre-mirrored pixels so text reads L→R
  const frontCanvas = mirrorCanvasX(canvas);
  const frontTex = makeTexture(THREE, frontCanvas);
  // Rear (far yard): no rotation → normal pixels
  const rearTex = makeTexture(THREE, canvas);

  const frontMat = new THREE.MeshBasicMaterial({
    map: frontTex,
    toneMapped: false,
    fog: false,
    side: THREE.FrontSide,
    depthWrite: true,
  });
  const rearMat = new THREE.MeshBasicMaterial({
    map: rearTex,
    toneMapped: false,
    fog: false,
    side: THREE.FrontSide,
    depthWrite: true,
  });

  const panelW = 7.55;
  const panelH = 3.75;

  // Spawn-facing face (normal toward −Z / player looking toward +Z).
  const front = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), frontMat);
  front.name = 'riskmulate-billboard-face-front';
  front.position.set(0, 4.05, -0.12);
  front.rotation.y = Math.PI;
  front.frustumCulled = false;
  front.renderOrder = 2;
  front.userData.billboard = true;
  root.add(front);

  // Far-yard face (normal toward +Z).
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), rearMat);
  rear.name = 'riskmulate-billboard-face-rear';
  rear.position.set(0, 4.05, 0.12);
  rear.frustumCulled = false;
  rear.renderOrder = 2;
  rear.userData.billboard = true;
  root.add(rear);

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
    dispose() {},
  };
  // Force rebuild so a previous mirrored board is replaced after this module update.
  api.built = false;
  window.RiskMulateBillboard = api;

  if (tryBuild()) return api;

  const onReady = () => {
    if (tryBuild()) window.removeEventListener('riskmulate:scene-ready', onReady);
  };
  window.addEventListener('riskmulate:scene-ready', onReady);

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (tryBuild() || attempts > 120) {
      clearInterval(timer);
      window.removeEventListener('riskmulate:scene-ready', onReady);
      if (!api.built) console.warn('[RiskMulate] billboard did not attach in time');
    }
  }, 250);

  return api;
}
