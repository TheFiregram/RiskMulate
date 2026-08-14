let installed = false;

export function installFirstPersonHands(THREE) {
  if (installed) return;
  installed = true;

  const originalRender = THREE.WebGLRenderer.prototype.render;
  const overlays = new WeakMap();
  const keys = new Set();
  let touchMoveActive = false;
  let lookImpulseX = 0;
  let lookImpulseY = 0;
  let interactionPulse = 0;

  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);

  addEventListener('keydown', (event) => {
    keys.add(event.code);
    if (event.code === 'KeyE') interactionPulse = 1;
  });
  addEventListener('keyup', (event) => keys.delete(event.code));

  addEventListener('mousemove', (event) => {
    lookImpulseX += THREE.MathUtils.clamp(event.movementX * 0.0012, -0.09, 0.09);
    lookImpulseY += THREE.MathUtils.clamp(event.movementY * 0.001, -0.07, 0.07);
  });

  const stickZone = document.querySelector('#stickZone');
  stickZone?.addEventListener('touchstart', () => { touchMoveActive = true; }, { passive: true });
  stickZone?.addEventListener('touchend', () => { touchMoveActive = false; }, { passive: true });
  stickZone?.addEventListener('touchcancel', () => { touchMoveActive = false; }, { passive: true });

  const lookZone = document.querySelector('#lookZone');
  let lastLookTouch = null;
  lookZone?.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0];
    lastLookTouch = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }, { passive: true });
  lookZone?.addEventListener('touchmove', (event) => {
    const touch = event.changedTouches[0];
    if (!touch || !lastLookTouch) return;
    const dx = touch.clientX - lastLookTouch.x;
    const dy = touch.clientY - lastLookTouch.y;
    lastLookTouch = { x: touch.clientX, y: touch.clientY };
    lookImpulseX += THREE.MathUtils.clamp(dx * 0.0025, -0.08, 0.08);
    lookImpulseY += THREE.MathUtils.clamp(dy * 0.002, -0.06, 0.06);
  }, { passive: true });
  lookZone?.addEventListener('touchend', () => { lastLookTouch = null; }, { passive: true });
  lookZone?.addEventListener('touchcancel', () => { lastLookTouch = null; }, { passive: true });

  document.querySelector('#mobileInteract')?.addEventListener('click', () => {
    interactionPulse = 1;
  });

  function makeMaterial(color, roughness, metalness = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  function addMesh(parent, geometry, material, position, rotation = [0, 0, 0]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.frustumCulled = false;
    parent.add(mesh);
    return mesh;
  }

  function buildArm(parent, side, materials) {
    const arm = new THREE.Group();
    arm.userData.side = side;
    parent.add(arm);

    const sleeve = addMesh(
      arm,
      new THREE.CylinderGeometry(0.13, 0.17, 0.52, 10),
      materials.sleeve,
      [0, 0.02, 0.08],
      [1.12, 0, side * -0.1],
    );
    sleeve.scale.z = 0.94;

    addMesh(
      arm,
      new THREE.CylinderGeometry(0.115, 0.13, 0.35, 10),
      materials.sleeve,
      [0, -0.12, -0.23],
      [1.24, 0, side * -0.05],
    );

    addMesh(
      arm,
      new THREE.CylinderGeometry(0.12, 0.115, 0.075, 10),
      materials.cuff,
      [0, -0.17, -0.39],
      [1.28, 0, 0],
    );

    addMesh(
      arm,
      new THREE.CylinderGeometry(0.122, 0.116, 0.035, 10),
      materials.reflective,
      [0, -0.16, -0.355],
      [1.28, 0, 0],
    );

    const palm = addMesh(
      arm,
      new THREE.BoxGeometry(0.18, 0.09, 0.19),
      materials.glove,
      [0, -0.165, -0.51],
      [0.1, side * -0.05, side * 0.025],
    );
    palm.scale.x = 0.95;

    addMesh(
      arm,
      new THREE.BoxGeometry(0.145, 0.022, 0.055),
      materials.knuckle,
      [0, -0.112, -0.555],
      [0.1, side * -0.05, side * 0.02],
    );

    for (let index = 0; index < 4; index += 1) {
      const fingerX = -0.057 + index * 0.038;
      const finger = addMesh(
        arm,
        new THREE.CapsuleGeometry(0.018, 0.07, 3, 6),
        materials.glove,
        [fingerX, -0.16, -0.625],
        [Math.PI / 2, 0, 0],
      );
      finger.scale.z = index === 0 || index === 3 ? 0.9 : 1;
    }

    addMesh(
      arm,
      new THREE.CapsuleGeometry(0.023, 0.065, 3, 6),
      materials.glove,
      [side * 0.105, -0.18, -0.535],
      [1.12, side * 0.48, side * -0.22],
    );

    arm.position.set(side * 0.3, -0.22, -0.34);
    arm.rotation.set(0.12, side * -0.12, side * -0.13);
    return arm;
  }

  function createOverlay() {
    const scene = new THREE.Scene();
    scene.userData.firstPersonHandsOverlay = true;

    const camera = new THREE.PerspectiveCamera(57, 1, 0.01, 6);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);

    scene.add(new THREE.HemisphereLight(0xe8f0f4, 0x20272a, 1.7));
    const key = new THREE.DirectionalLight(0xffe8c8, 1.65);
    key.position.set(-1.8, 2.6, 2.2);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xbfd5df, 0.55);
    fill.position.set(2.2, 0.8, 1.6);
    scene.add(fill);

    const materials = {
      sleeve: makeMaterial(0x3b464b, 0.92, 0.04),
      cuff: makeMaterial(0x222a2e, 0.95, 0.02),
      glove: makeMaterial(0x111619, 0.88, 0.02),
      knuckle: makeMaterial(0x252d31, 0.68, 0.12),
      reflective: makeMaterial(0xc6a53b, 0.72, 0.14),
    };

    const root = new THREE.Group();
    scene.add(root);
    const left = buildArm(root, -1, materials);
    const right = buildArm(root, 1, materials);

    return {
      scene,
      camera,
      root,
      left,
      right,
      lastTime: performance.now() * 0.001,
      walkBlend: 0,
      sprintBlend: 0,
      hideBlend: 1,
      lookX: 0,
      lookY: 0,
      reach: 0,
      elapsed: 0,
    };
  }

  function damp(current, target, speed, dt) {
    return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * dt));
  }

  function updateOverlay(overlay) {
    const now = performance.now() * 0.001;
    const dt = Math.min(0.05, Math.max(0, now - overlay.lastTime));
    overlay.lastTime = now;
    overlay.elapsed += dt;

    const moving = touchMoveActive || [...movementKeys].some((code) => keys.has(code));
    const sprinting = moving && (keys.has('ShiftLeft') || keys.has('ShiftRight'));
    const tabletOpen = document.querySelector('#tablet')?.classList.contains('open') ?? false;
    const gameStarted = document.querySelector('#start')?.style.display === 'none';
    const shouldHide = tabletOpen || !gameStarted;

    overlay.walkBlend = damp(overlay.walkBlend, moving ? 1 : 0, 10, dt);
    overlay.sprintBlend = damp(overlay.sprintBlend, sprinting ? 1 : 0, 8, dt);
    overlay.hideBlend = damp(overlay.hideBlend, shouldHide ? 1 : 0, 13, dt);
    overlay.lookX = damp(overlay.lookX, lookImpulseX, 12, dt);
    overlay.lookY = damp(overlay.lookY, lookImpulseY, 12, dt);
    overlay.reach = damp(overlay.reach, interactionPulse, interactionPulse > 0.01 ? 16 : 8, dt);

    lookImpulseX *= Math.exp(-18 * dt);
    lookImpulseY *= Math.exp(-18 * dt);
    interactionPulse = Math.max(0, interactionPulse - dt * 2.8);

    const cadence = 7.2 + overlay.sprintBlend * 3.3;
    const phase = overlay.elapsed * cadence;
    const stride = Math.sin(phase) * overlay.walkBlend;
    const halfStride = Math.sin(phase * 0.5) * overlay.walkBlend;
    const bob = Math.abs(Math.sin(phase)) * overlay.walkBlend;
    const breathe = Math.sin(overlay.elapsed * 1.55) * 0.007;
    const sprint = overlay.sprintBlend;
    const aspect = THREE.MathUtils.clamp(overlay.camera.aspect || 1, 0.45, 2.2);
    const armSpread = THREE.MathUtils.clamp(aspect * 0.21, 0.18, 0.34);

    overlay.root.position.set(
      -overlay.lookX * 0.12 + halfStride * 0.006,
      0.035 + breathe + bob * (0.012 + sprint * 0.01) - overlay.hideBlend * 0.72,
      overlay.hideBlend * 0.08,
    );
    overlay.root.rotation.set(
      overlay.lookY * -0.08,
      overlay.lookX * -0.08,
      halfStride * (0.018 + sprint * 0.018) - overlay.lookX * 0.06,
    );

    const walkSwing = stride * (0.095 + sprint * 0.08);
    overlay.left.position.set(-armSpread, -0.22 + bob * 0.007, -0.34 + walkSwing * 0.18);
    overlay.right.position.set(armSpread, -0.22 + bob * 0.007 + overlay.reach * 0.055, -0.34 - walkSwing * 0.18 - overlay.reach * 0.16);

    overlay.left.rotation.set(
      0.12 + walkSwing,
      0.12,
      0.13 - halfStride * 0.035,
    );
    overlay.right.rotation.set(
      0.12 - walkSwing - overlay.reach * 0.16,
      -0.12,
      -0.13 + halfStride * 0.035 - overlay.reach * 0.055,
    );

    overlay.root.visible = overlay.hideBlend < 0.985;
  }

  THREE.WebGLRenderer.prototype.render = function renderWithFirstPersonHands(scene, camera) {
    const result = originalRender.call(this, scene, camera);

    if (
      scene?.userData?.firstPersonHandsOverlay
      || this.domElement?.parentElement?.id !== 'game'
      || !camera?.isPerspectiveCamera
    ) {
      return result;
    }

    let overlay = overlays.get(this);
    if (!overlay) {
      overlay = createOverlay();
      overlays.set(this, overlay);
    }

    overlay.camera.aspect = camera.aspect || 1;
    overlay.camera.updateProjectionMatrix();
    updateOverlay(overlay);

    if (!overlay.root.visible) return result;

    const previousAutoClear = this.autoClear;
    this.autoClear = false;
    this.clearDepth();
    originalRender.call(this, overlay.scene, overlay.camera);
    this.autoClear = previousAutoClear;
    return result;
  };
}
