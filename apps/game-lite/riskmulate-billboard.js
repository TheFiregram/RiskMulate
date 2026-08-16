/**
 * RiskMulate site billboard
 * ------------------------
 * Fixed double-sided yard identity board behind spawn.
 * Readable from either approach without spinning the face.
 *
 * Orientation note:
 * PlaneGeometry faces +Z by default. Facing the spawn (−Z) requires
 * rotation.y = Math.PI, which mirrors UVs. Viewing the +Z face from behind
 * also mirrors left/right relative to the reader. Unmirror both faces with
 * texture.repeat.x = -1 (NOT mesh.scale.x — negative scale flips normals).
 */

function makeTexture(THREE, canvas, { mirrorX = false } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.flipY = true;
  if (mirrorX) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.x = -1;
    texture.offset.x = 1;
  }
  texture.needsUpdate = true;
  return texture;
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

  // Left accent bar (must stay on the left when viewed from spawn)
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
  ctx.fillText('Continuity Rotation 03  ·  Supply Integrity Window', w * 0.055, h * 0.595);

  ctx.fillStyle = 'rgba(224,146,58,0.2)';
  ctx.fillRect(w * 0.04, h * 0.67, w * 0.92, h * 0.25);

  ctx.fillStyle = '#efb05a';
  ctx.font = `700 ${Math.round(h * 0.042)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText('ISO 31000', w * 0.055, h * 0.755);

  ctx.fillStyle = '#e0eaf0';
  ctx.font = `600 ${Math.round(h * 0.038)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText('CONTEXT → IDENTIFY → ANALYZE → EVALUATE → TREAT → MONITOR', w * 0.055, h * 0.83);

  ctx.fillStyle = '#b8c8d0';
  ctx.font = `500 ${Math.round(h * 0.036)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText('Walk the plant. Capture evidence at equipment. Apply field controls.', w * 0.055, h * 0.895);
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose?.();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => {
          m.map?.dispose?.();
          m.dispose?.();
        });
      } else {
        child.material.map?.dispose?.();
        child.material.dispose?.();
      }
    }
  });
}

function buildBillboard(THREE, scene) {
  const existing = scene.getObjectByName('riskmulate-billboard-root');
  if (existing) {
    scene.remove(existing);
    disposeObject(existing);
  }

  const root = new THREE.Group();
  root.name = 'riskmulate-billboard-root';
  root.position.set(0, 0, 20.6);

  const metal = new THREE.MeshStandardMaterial({ color: 0x3a4449, roughness: 0.7, metalness: 0.45 });
  const metalDark = new THREE.MeshStandardMaterial({ color: 0x1e2529, roughness: 0.78, metalness: 0.52 });
  const yellow = new THREE.MeshStandardMaterial({
    color: 0xc9a329,
    roughness: 0.5,
    metalness: 0.28,
    emissive: 0x3a2a08,
    emissiveIntensity: 0.2,
  });

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

  // Both faces UV-unmirrored so text reads L→R from spawn and from the far yard.
  const frontTex = makeTexture(THREE, canvas, { mirrorX: true });
  const rearTex = makeTexture(THREE, canvas, { mirrorX: true });

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

  // Spawn-facing face (normal toward −Z / player).
  const front = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), frontMat);
  front.name = 'riskmulate-billboard-face-front';
  front.position.set(0, 4.05, -0.1);
  front.rotation.y = Math.PI;
  front.frustumCulled = false;
  front.renderOrder = 2;
  front.userData.billboard = true;
  root.add(front);

  // Far-yard face (normal toward +Z).
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), rearMat);
  rear.name = 'riskmulate-billboard-face-rear';
  rear.position.set(0, 4.05, 0.1);
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
  // Always rebuild so a previous mirrored board is replaced after this module update.
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
