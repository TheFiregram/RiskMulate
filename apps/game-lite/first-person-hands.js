let installed = false;

export function installFirstPersonHands(THREE) {
  if (installed) return;
  installed = true;

  const originalRender = THREE.WebGLRenderer.prototype.render;
  const overlays = new WeakMap();
  const keys = new Set();
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
  let touchMoveActive = false;
  let lookImpulseX = 0;
  let lookImpulseY = 0;
  let interactionPulse = 0;

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

  function makeMaterial(color, roughness, metalness = 0, emissive = 0x000000) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive,
      emissiveIntensity: emissive ? 0.08 : 0,
    });
  }

  function addMesh(parent, geometry, material, position, rotation = [0, 0, 0], scale = null) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.rotation.set(...rotation);
    if (scale) object.scale.set(...scale);
    object.frustumCulled = false;
    object.castShadow = false;
    object.receiveShadow = false;
    parent.add(object);
    return object;
  }

  function buildHand(parent, side, materials) {
    const arm = new THREE.Group();
    arm.userData.side = side;
    parent.add(arm);

    addMesh(
      arm,
      new THREE.CylinderGeometry(0.17, 0.125, 0.58, 14),
      materials.sleeve,
      [0, -0.34, -0.48],
      [Math.PI / 2, 0, side * -0.075],
    );

    addMesh(
      arm,
      new THREE.CylinderGeometry(0.132, 0.118, 0.24, 14),
      materials.sleeveDark,
      [0, -0.285, -0.745],
      [Math.PI / 2, 0, side * -0.045],
    );

    addMesh(
      arm,
      new THREE.CylinderGeometry(0.132, 0.132, 0.075, 14),
      materials.cuff,
      [0, -0.255, -0.82],
      [Math.PI / 2, 0, 0],
    );

    addMesh(
      arm,
      new THREE.CylinderGeometry(0.136, 0.136, 0.024, 14),
      materials.reflective,
      [0, -0.255, -0.785],
      [Math.PI / 2, 0, 0],
    );

    addMesh(
      arm,
      new THREE.SphereGeometry(0.12, 16, 10),
      materials.glove,
      [0, -0.215, -0.895],
      [0.12, side * -0.08, side * 0.035],
      [0.9, 0.62, 1.18],
    );

    addMesh(
      arm,
      new THREE.BoxGeometry(0.17, 0.026, 0.075),
      materials.knuckle,
      [0, -0.155, -0.915],
      [0.1, side * -0.06, 0],
    );

    for (let index = 0; index < 4; index += 1) {
      const x = -0.058 + index * 0.039;
      const fingerLength = index === 0 || index === 3 ? 0.105 : 0.12;
      addMesh(
        arm,
        new THREE.CylinderGeometry(0.019, 0.017, fingerLength, 9),
        materials.glove,
        [x, -0.205, -1.005],
        [Math.PI / 2, 0, 0],
      );
      addMesh(
        arm,
        new THREE.SphereGeometry(0.0185, 9, 6),
        materials.glove,
        [x, -0.205, -1.005 - fingerLength * 0.5],
      );
    }

    addMesh(
      arm,
      new THREE.CylinderGeometry(0.024, 0.021, 0.11, 9),
      materials.glove,
      [side * 0.102, -0.225, -0.92],
      [1.18, side * 0.48, side * -0.22],
    );

    addMesh(
      arm,
      new THREE.SphereGeometry(0.024, 9, 6),
      materials.glove,
      [side * 0.13, -0.23, -0.965],
    );

    return arm;
  }

  function createOverlay() {
    const scene = new THREE.Scene();
    scene.userData.firstPersonHandsOverlay = true;

    const camera = new THREE.PerspectiveCamera(64, 1, 0.01, 5);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);

    scene.add(new THREE.HemisphereLight(0xf0f5f7, 0x1c2529, 2.15));

    const key = new THREE.DirectionalLight(0xffe6c2, 2.1);
    key.position.set(-1.6, 2.5, 1.8);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xb7d6e2, 0.8);
    fill.position.set(2.4, 1.0, 1.4);
    scene.add(fill);

    const materials = {
      sleeve: makeMaterial(0x47545a, 0.88, 0.06, 0x11191c),
      sleeveDark: makeMaterial(0x303b40, 0.9, 0.05, 0x0b1012),
      cuff: makeMaterial(0x1f272a, 0.9, 0.03, 0x080a0b),
      glove: makeMaterial(0x171d20, 0.72, 0.03, 0x090b0c),
      knuckle: makeMaterial(0x30393d, 0.58, 0.16, 0x0c1113),
      reflective: makeMaterial(0xd2aa35, 0.58, 0.18, 0x332403),
    };

    const root = new THREE.Group();
    scene.add(root);
    const left = buildHand(root, -1, materials);
    const right = buildHand(root, 1, materials);

    const state = {
      scene,
      camera,
      root,
      left,
      right,
      lastTime: performance.now() * 0.001,
      elapsed: 0,
      walkBlend: 0,
      sprintBlend: 0,
      hideBlend: 1,
      lookX: 0,
      lookY: 0,
      reach: 0,
      visible: false,
    };

    window.dispatchEvent(new CustomEvent('riskmulate:hands-ready'));
    return state;
  }

  function damp(current, target, speed, dt) {
    return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * dt));
  }

  function sessionHasStarted() {
    const startScreen = document.querySelector('#start');
    if (!startScreen) return true;
    if (startScreen.hidden || startScreen.style.display === 'none') return true;
    return getComputedStyle(startScreen).display === 'none';
  }

  function updateOverlay(overlay, worldCamera) {
    const now = performance.now() * 0.001;
    const dt = Math.min(0.05, Math.max(0, now - overlay.lastTime));
    overlay.lastTime = now;
    overlay.elapsed += dt;

    const moving = touchMoveActive || [...movementKeys].some((code) => keys.has(code));
    const sprinting = moving && (keys.has('ShiftLeft') || keys.has('ShiftRight'));
    const tabletOpen = document.querySelector('#tablet')?.classList.contains('open') ?? false;
    const started = sessionHasStarted();
    const shouldHide = tabletOpen || !started;

    overlay.walkBlend = damp(overlay.walkBlend, moving ? 1 : 0, 10, dt);
    overlay.sprintBlend = damp(overlay.sprintBlend, sprinting ? 1 : 0, 8, dt);
    overlay.hideBlend = damp(overlay.hideBlend, shouldHide ? 1 : 0, shouldHide ? 15 : 10, dt);
    overlay.lookX = damp(overlay.lookX, lookImpulseX, 12, dt);
    overlay.lookY = damp(overlay.lookY, lookImpulseY, 12, dt);
    overlay.reach = damp(overlay.reach, interactionPulse, interactionPulse > 0.01 ? 16 : 8, dt);

    lookImpulseX *= Math.exp(-18 * dt);
    lookImpulseY *= Math.exp(-18 * dt);
    interactionPulse = Math.max(0, interactionPulse - dt * 2.8);

    const aspect = THREE.MathUtils.clamp(worldCamera.aspect || 1, 0.42, 2.2);
    overlay.camera.aspect = aspect;
    overlay.camera.fov = aspect < 0.75 ? 67 : 62;
    overlay.camera.updateProjectionMatrix();

    const narrow = THREE.MathUtils.smoothstep(aspect, 0.55, 0.9);
    const armSpread = THREE.MathUtils.lerp(0.115, 0.24, narrow);
    const rightBias = THREE.MathUtils.lerp(-0.015, 0, narrow);

    const cadence = 7.2 + overlay.sprintBlend * 3.3;
    const phase = overlay.elapsed * cadence;
    const stride = Math.sin(phase) * overlay.walkBlend;
    const halfStride = Math.sin(phase * 0.5) * overlay.walkBlend;
    const bob = Math.abs(Math.sin(phase)) * overlay.walkBlend;
    const breathe = Math.sin(overlay.elapsed * 1.55) * 0.007;
    const sprint = overlay.sprintBlend;

    overlay.root.position.set(
      -overlay.lookX * 0.1 + halfStride * 0.006 + rightBias,
      -0.005 + breathe + bob * (0.012 + sprint * 0.01) - overlay.hideBlend * 0.82,
      overlay.hideBlend * 0.06,
    );
    overlay.root.rotation.set(
      overlay.lookY * -0.07,
      overlay.lookX * -0.07,
      halfStride * (0.016 + sprint * 0.016) - overlay.lookX * 0.05,
    );

    const walkSwing = stride * (0.085 + sprint * 0.075);
    overlay.left.position.set(
      -armSpread,
      -0.015 + bob * 0.006,
      0.02 + walkSwing * 0.12,
    );
    overlay.right.position.set(
      armSpread,
      -0.005 + bob * 0.006 + overlay.reach * 0.045,
      -0.005 - walkSwing * 0.12 - overlay.reach * 0.14,
    );

    overlay.left.rotation.set(
      0.05 + walkSwing,
      0.08,
      0.11 - halfStride * 0.03,
    );
    overlay.right.rotation.set(
      0.035 - walkSwing - overlay.reach * 0.14,
      -0.08,
      -0.11 + halfStride * 0.03 - overlay.reach * 0.05,
    );

    overlay.visible = overlay.hideBlend < 0.985;
    overlay.root.visible = overlay.visible;

    if (window.RiskMulateHands) {
      window.RiskMulateHands.visible = overlay.visible;
      window.RiskMulateHands.started = started;
      window.RiskMulateHands.tabletOpen = tabletOpen;
      window.RiskMulateHands.aspect = aspect;
    }
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
      window.RiskMulateHands = {
        overlay,
        visible: false,
        started: false,
        tabletOpen: false,
        aspect: camera.aspect || 1,
      };
    }

    updateOverlay(overlay, camera);
    if (!overlay.root.visible) return result;

    const previousAutoClear = this.autoClear;
    this.autoClear = false;
    this.clearDepth();
    originalRender.call(this, overlay.scene, overlay.camera);
    this.autoClear = previousAutoClear;
    return result;
  };
}
