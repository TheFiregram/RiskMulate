/**
 * RiskMulate site billboard
 * ------------------------
 * Camera-facing brand board behind spawn. Fog disabled on the face so text
 * stays readable on mobile; build is deferred until RiskMulateScene exists.
 */

function makeTexture(THREE, canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  texture.needsUpdate = true;
  return texture;
}

function paintCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const sx = w / 1024;
  const sy = h / 512;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0c1820');
  bg.addColorStop(0.55, '#122430');
  bg.addColorStop(1, '#0a141b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#c9a329';
  ctx.lineWidth = Math.max(6, 10 * sx);
  ctx.strokeRect(18 * sx, 18 * sy, 988 * sx, 476 * sy);

  ctx.fillStyle = '#d98a36';
  ctx.fillRect(18 * sx, 18 * sy, 988 * sx, 14 * sy);
  ctx.fillRect(56 * sx, 70 * sy, 18 * sx, 120 * sy);

  ctx.fillStyle = '#edf4f7';
  ctx.font = `700 ${Math.round(72 * sx)}px Inter, system-ui, sans-serif`;
  ctx.fillText('RISKMULATE', 90 * sx, 130 * sy);

  ctx.fillStyle = '#8ea3ad';
  ctx.font = `600 ${Math.round(26 * sx)}px Inter, system-ui, sans-serif`;
  ctx.fillText('FIELD RISK  ·  CONTINUITY TRAINING', 94 * sx, 175 * sy);

  ctx.strokeStyle = 'rgba(201,163,41,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56 * sx, 210 * sy);
  ctx.lineTo(960 * sx, 210 * sy);
  ctx.stroke();

  ctx.fillStyle = '#dce9ed';
  ctx.font = `700 ${Math.round(34 * sx)}px Inter, system-ui, sans-serif`;
  ctx.fillText('NORTHBRIDGE FILTRATION WORKS', 56 * sx, 268 * sy);

  ctx.fillStyle = '#9eb0b9';
  ctx.font = `500 ${Math.round(24 * sx)}px Inter, system-ui, sans-serif`;
  ctx.fillText('Continuity Rotation 03  ·  Supply Integrity Window', 56 * sx, 312 * sy);

  ctx.fillStyle = 'rgba(217,138,54,0.16)';
  ctx.fillRect(40 * sx, 360 * sy, 944 * sx, 100 * sy);

  ctx.fillStyle = '#e5a258';
  ctx.font = `700 ${Math.round(20 * sx)}px Inter, system-ui, sans-serif`;
  ctx.fillText('ISO 31000  ·  CONTEXT → IDENTIFY → ANALYZE → EVALUATE → TREAT → MONITOR', 56 * sx, 408 * sy);

  ctx.fillStyle = '#a9bac4';
  ctx.font = `500 ${Math.round(18 * sx)}px Inter, system-ui, sans-serif`;
  ctx.fillText('Walk the plant. Capture evidence at the equipment. Apply controls on the pathway.', 56 * sx, 442 * sy);
}

function buildBillboard(THREE, scene) {
  if (scene.getObjectByName('riskmulate-billboard-root')) {
    return {
      root: scene.getObjectByName('riskmulate-billboard-root'),
      face: scene.getObjectByName('riskmulate-billboard-face'),
    };
  }

  const root = new THREE.Group();
  root.name = 'riskmulate-billboard-root';
  // Closer to spawn so mobile FOV + fog still read the brand clearly
  root.position.set(0, 0, 20.4);

  const metal = new THREE.MeshStandardMaterial({ color: 0x3a4449, roughness: 0.7, metalness: 0.45 });
  const metalDark = new THREE.MeshStandardMaterial({ color: 0x232a2e, roughness: 0.75, metalness: 0.5 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xc9a329, roughness: 0.55, metalness: 0.25 });

  for (const x of [-3.8, 3.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 6.6, 10), metalDark);
    post.position.set(x, 3.3, 0);
    post.castShadow = false;
    root.add(post);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.55), metal);
    base.position.set(x, 0.09, 0);
    root.add(base);
  }

  const beam = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.18, 0.18), metal);
  beam.position.set(0, 6.0, 0);
  root.add(beam);

  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const canvas = document.createElement('canvas');
  canvas.width = coarse ? 512 : 1024;
  canvas.height = coarse ? 256 : 512;
  paintCanvas(canvas);

  const texture = makeTexture(THREE, canvas);
  const faceMat = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    fog: false,
  });

  const face = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 3.9), faceMat);
  face.position.set(0, 4.0, 0.06);
  face.name = 'riskmulate-billboard-face';
  face.userData.billboard = true;
  face.frustumCulled = false;
  root.add(face);

  const back = new THREE.Mesh(new THREE.BoxGeometry(7.95, 4.05, 0.12), metalDark);
  back.position.set(0, 4.0, -0.02);
  root.add(back);

  for (const [x, y] of [[-3.7, 5.7], [3.7, 5.7], [-3.7, 2.3], [3.7, 2.3]]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.22), yellow);
    bracket.position.set(x, y, 0.08);
    root.add(bracket);
  }

  scene.add(root);
  return { root, face };
}

export function installRiskMulateBillboard() {
  if (window.RiskMulateBillboard?.built) return window.RiskMulateBillboard;

  let face = null;
  let root = null;
  let raf = 0;

  function tick() {
    const camera = window.RiskMulateScene?.camera;
    if (face && camera && root) {
      const dx = camera.position.x - root.position.x;
      const dz = camera.position.z - root.position.z;
      face.rotation.y = Math.atan2(dx, dz);
    }
    raf = requestAnimationFrame(tick);
  }

  function tryBuild() {
    const scene = window.RiskMulateScene?.scene;
    const THREE = window.RiskMulateScene?.THREE;
    if (!scene || !THREE) return false;
    try {
      const built = buildBillboard(THREE, scene);
      if (!built?.face) return false;
      face = built.face;
      root = built.root;
      if (!raf) tick();
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
      cancelAnimationFrame(raf);
      raf = 0;
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
