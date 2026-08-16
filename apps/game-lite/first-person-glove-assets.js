import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DESKTOP_URL = './assets/production/first-person-gloves.glb';
const MOBILE_URL = './assets/production/first-person-gloves-mobile.glb';

function resolveAssetUrl(url) {
  return new URL(url, window.location.href).href;
}

function clipKind(name = '') {
  const normalized = name.toLowerCase();
  if (normalized.includes('interact')) return 'interact';
  if (normalized.includes('walk')) return 'walk';
  if (normalized.includes('idle')) return 'idle';
  return null;
}

function configureModel(model) {
  model.name = 'first-person-glove-asset';
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.frustumCulled = false;
    object.castShadow = false;
    object.receiveShadow = false;
  });
}

function installAnimationState(THREE, state, model, clips) {
  if (!clips.length) return null;
  const mixer = new THREE.AnimationMixer(model);
  const actions = { idle: [], walk: [], interact: [] };

  for (const clip of clips) {
    const kind = clipKind(clip.name);
    if (!kind) continue;
    const action = mixer.clipAction(clip);
    action.enabled = true;
    if (kind === 'interact') {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }
    actions[kind].push(action);
  }

  const playGroup = (kind, fade = 0.12) => {
    for (const baseKind of ['idle', 'walk']) {
      for (const action of actions[baseKind]) {
        if (baseKind === kind) {
          if (!action.isRunning()) action.reset().fadeIn(fade).play();
        } else if (action.isRunning()) {
          action.fadeOut(fade);
        }
      }
    }
  };

  playGroup('idle', 0.01);
  return { mixer, actions, playGroup, baseKind: 'idle', interactionPlaying: false };
}

export function installFirstPersonGloveAssets(THREE) {
  let loading = false;
  let installed = false;
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
  const keys = new Set();
  let touchMoving = false;
  let animationState = null;
  let lastTime = performance.now() * 0.001;
  let rafId = 0;

  addEventListener('keydown', (event) => {
    keys.add(event.code);
    if (event.code === 'KeyE' || event.code === 'KeyF') playInteraction();
  });
  addEventListener('keyup', (event) => keys.delete(event.code));

  document.querySelector('#stickZone')?.addEventListener('touchstart', () => { touchMoving = true; }, { passive: true });
  document.querySelector('#stickZone')?.addEventListener('touchend', () => { touchMoving = false; }, { passive: true });
  document.querySelector('#stickZone')?.addEventListener('touchcancel', () => { touchMoving = false; }, { passive: true });
  document.querySelector('#mobileInteract')?.addEventListener('click', () => playInteraction());
  document.querySelector('#mobileFix')?.addEventListener('click', () => playInteraction());
  window.addEventListener('riskmulate:hands-interact', () => playInteraction());
  window.addEventListener('riskmulate:field-repair', () => playInteraction());

  function playInteraction() {
    if (!animationState || animationState.interactionPlaying || !animationState.actions.interact.length) return;
    animationState.interactionPlaying = true;
    for (const action of animationState.actions.interact) action.reset().fadeIn(0.06).play();
    window.setTimeout(() => {
      if (!animationState) return;
      for (const action of animationState.actions.interact) action.fadeOut(0.08);
      animationState.interactionPlaying = false;
      animationState.playGroup(animationState.baseKind, 0.08);
    }, 520);
  }

  function tick() {
    const now = performance.now() * 0.001;
    const dt = Math.min(0.05, Math.max(0, now - lastTime));
    lastTime = now;
    if (animationState?.mixer) animationState.mixer.update(dt);

    const moving = touchMoving || [...movementKeys].some((code) => keys.has(code));
    if (animationState && !animationState.interactionPlaying) {
      const next = moving ? 'walk' : 'idle';
      if (animationState.baseKind !== next) {
        animationState.baseKind = next;
        animationState.playGroup(next);
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function attachToCamera(camera, model) {
    if (!camera || !model) return;
    model.position.set(0, -0.12, -0.28);
    model.rotation.set(0.05, 0, 0);
    model.scale.setScalar(1);
    camera.add(model);
  }

  function tryInstall() {
    if (installed || loading) return;
    const coarse = matchMedia('(pointer: coarse)').matches;
    const url = resolveAssetUrl(coarse ? MOBILE_URL : DESKTOP_URL);
    loading = true;
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        if (!model) throw new Error('First-person glove GLB has no scene root');
        configureModel(model);
        animationState = installAnimationState(THREE, null, model, gltf.animations || []);
        const camera = window.RiskMulateScene?.camera;
        if (camera) attachToCamera(camera, model);
        else {
          const onReady = () => {
            attachToCamera(window.RiskMulateScene?.camera, model);
            window.removeEventListener('riskmulate:hands-ready', onReady);
          };
          window.addEventListener('riskmulate:hands-ready', onReady);
        }
        installed = true;
        loading = false;
        if (!rafId) rafId = requestAnimationFrame(tick);
        window.dispatchEvent(new CustomEvent('riskmulate:gloves-loaded', {
          detail: { url, clips: (gltf.animations || []).map((c) => c.name) },
        }));
      },
      undefined,
      (error) => {
        loading = false;
        console.error('[RiskMulate] First-person glove asset failed; keeping procedural fallback.', error);
        window.dispatchEvent(new CustomEvent('riskmulate:gloves-error', {
          detail: { error: String(error) },
        }));
      },
    );
  }

  tryInstall();
  window.addEventListener('riskmulate:hands-ready', () => {
    if (!installed) tryInstall();
  });
}
