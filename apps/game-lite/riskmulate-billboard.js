/**
 * RiskMulate site billboard
 * ------------------------
 * Large facility identity board behind the entry apron. Uses a camera-facing
 * billboard so the brand panel stays readable from any yaw while distance and
 * perspective still scale naturally with player position.
 */

function makeTexture(THREE, canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function buildBillboard(THREE, scene) {
  if (scene.getObjectByName('riskmulate-billboard-root')) return null;

  const root = new THREE.Group();
  root.name = 'riskmulate-billboard-root';
  root.position.set(0, 0, 23.6);

  const metal = new THREE.MeshStandardMaterial({ color: 0x3a4449, roughness: 0.7, metalness: 0.45 });
  const metalDark = new THREE.MeshStandardMaterial({ color: 0x232a2e, roughness: 0.75, metalness: 0.5 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xc9a329, roughness: 0.55, metalness: 0.25 });

  for (const x of [-3.6, 3.6]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 6.4, 10), metalDark);
    post.position.set(x, 3.2, 0);
    post.castShadow = true;
    root.add(post);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.55), metal);
    base.position.set(x, 0.09, 0);
    root.add(base);
  }

  const beam = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.18, 0.18), metal);
  beam.position.set(0, 5.85, 0);
  root.add(beam);

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#0c1820');
  bg.addColorStop(0.55, '#122430');
  bg.addColorStop(1, '#0a141b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = '#c9a329';
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, 988, 476);
  ctx.fillStyle = '#d98a36';
  ctx.fillRect(18, 18, 988, 14);
  ctx.fillStyle = '#d98a36';
  ctx.fillRect(56, 70, 18, 120);
  ctx.fillStyle = '#edf4f7';
  ctx.font = '700 72px Inter, system-ui, sans-serif';
  ctx.fillText('RISKMULATE', 90, 130);
  ctx.fillStyle = '#8ea3ad';
  ctx.font = '600 26px Inter, system-ui, sans-serif';
  ctx.fillText('FIELD RISK  \u00b7  CONTINUITY TRAINING', 94, 175);
  ctx.strokeStyle = 'rgba(201,163,41,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, 210);
  ctx.lineTo(960, 210);
  ctx.stroke();
  ctx.fillStyle = '#dce9ed';
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  ctx.fillText('NORTHBRIDGE FILTRATION WORKS', 56, 268);
  ctx.fillStyle = '#9eb0b9';
  ctx.font = '500 24px Inter, system-ui, sans-serif';
  ctx.fillText('Continuity Rotation 03  \u00b7  Supply Integrity Window', 56, 312);
  ctx.fillStyle = 'rgba(217,138,54,0.16)';
  ctx.fillRect(40, 360, 944, 100);
  ctx.fillStyle = '#e5a258';
  ctx.font = '700 20px Inter, system-ui, sans-serif';
  ctx.fillText('ISO 31000  \u00b7  CONTEXT \u2192 IDENTIFY \u2192 ANALYZE \u2192 EVALUATE \u2192 TREAT \u2192 MONITOR', 56, 408);
  ctx.fillStyle = '#a9bac4';
  ctx.font = '500 18px Inter, system-ui, sans-serif';
  ctx.fillText('Walk the plant. Capture evidence at the equipment. Apply controls on the pathway.', 56, 442);

  const texture = makeTexture(THREE, canvas);
  const faceMat = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
  });

  const face = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.6), faceMat);
  face.position.set(0, 3.9, 0.05);
  face.name = 'riskmulate-billboard-face';
  face.userData.billboard = true;
  root.add(face);

  const back = new THREE.Mesh(new THREE.BoxGeometry(7.35, 3.75, 0.12), metalDark);
  back.position.set(0, 3.9, -0.02);
  root.add(back);

  for (const [x, y] of [[-3.5, 5.55], [3.5, 5.55], [-3.5, 2.25], [3.5, 2.25]]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.22), yellow);
    bracket.position.set(x, y, 0.08);
    root.add(bracket);
  }

  scene.add(root);
  return { root, face };
}

export function installRiskMulateBillboard(THREE) {
  if (window.RiskMulateBillboard?.installed) return window.RiskMulateBillboard;

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

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    const scene = window.RiskMulateScene?.scene;
    const T = window.RiskMulateScene?.THREE || THREE;
    if (scene) {
      const built = buildBillboard(T, scene);
      if (built) {
        face = built.face;
        root = built.root;
        tick();
      }
      clearInterval(timer);
    } else if (attempts > 40) {
      clearInterval(timer);
    }
  }, 250);

  const api = {
    installed: true,
    dispose() {
      cancelAnimationFrame(raf);
    },
  };
  window.RiskMulateBillboard = api;
  return api;
}
