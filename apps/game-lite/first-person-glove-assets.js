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
    if (event.code === 'KeyE') playInteraction();
  });
  addEventListener('keyup', (event) => keys.delete(event.code));

  document.querySelector('#stickZone')?.addEventListener('touchstart', () => { touchMoving = true; }, { passive: true });
  document.querySelector('#stickZone')?.addEventListener('touchend', () => { touchMoving = false; }, { passive: true });
  document.querySelector('#stickZone')?.addEventListener('touchcancel', () => { touchMoving = false; }, { passive: true });
  document.querySelector('#mobileInteract')?.addEventListener('click', () => playInteraction());

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

  function animate() {
    const now = performance.now() * 0.001;
    const dt = Math.min(0.05, Math.max(0, now - lastTime));
    lastTime = now;

    if (animationState) {
      animationState.mixer.update(dt);
      const moving = touchMoving || [...movementKeys].some((code) => keys.has(code));
      const nextKind = moving ? 'walk' : 'idle';
      if (!animationState.interactionPlaying && nextKind !== animationState.baseKind) {
        animationState.baseKind = nextKind;
        animationState.playGroup(nextKind);
      }
    }
    rafId = requestAnimationFrame(animate);
  }

  async function loadIntoHands() {
    if (loading || installed) return;
    const hands = window.RiskMulateHands;
    const overlay = hands?.overlay;
    if (!overlay?.root) return;

    loading = true;
    const coarsePointer = matchMedia('(pointer: coarse)').matches;
    const selectedUrl = coarsePointer ? MOBILE_URL : DESKTOP_URL;
    const resolvedUrl = resolveAssetUrl(selectedUrl);

    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(resolvedUrl);
      const model = gltf.scene || gltf.scenes?.[0];
      if (!model) throw new Error('First-person glove GLB has no scene root');

      configureModel(model);
      overlay.root.add(model);
      overlay.left.visible = false;
      overlay.right.visible = false;
      animationState = installAnimationState(THREE, overlay, model, gltf.animations || []);
      installed = true;

      Object.assign(window.RiskMulateHands, {
        assetReady: true,
        assetFailed: false,
        assetUrl: resolvedUrl,
        animationClips: (gltf.animations || []).map((clip) => clip.name),
        assetModel: model,
      });
      window.dispatchEvent(new CustomEvent('riskmulate:gloves-loaded', {
        detail: {
          url: resolvedUrl,
          animationClips: window.RiskMulateHands.animationClips,
        },
      }));
    } catch (error) {
      console.error('[RiskMulate] First-person glove asset failed; keeping procedural fallback.', error);
      Object.assign(window.RiskMulateHands, {
        assetReady: false,
        assetFailed: true,
        assetUrl: resolvedUrl,
        assetError: error instanceof Error ? error.message : String(error),
      });
      window.dispatchEvent(new CustomEvent('riskmulate:gloves-error', {
        detail: { url: resolvedUrl, message: window.RiskMulateHands.assetError },
      }));
    } finally {
      loading = false;
    }
  }

  const scheduleLoad = () => queueMicrotask(() => void loadIntoHands());
  window.addEventListener('riskmulate:hands-ready', scheduleLoad);
  if (window.RiskMulateHands?.overlay) scheduleLoad();
  rafId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('riskmulate:hands-ready', scheduleLoad);
  };
}
