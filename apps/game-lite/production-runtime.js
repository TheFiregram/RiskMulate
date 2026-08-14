import { createAdaptivePerformanceController } from './adaptive-performance.js';
import { installPbrEnvironment } from './environment-lighting.js';
import { ProductionAssetRuntime } from './production-assets.js';

let installed = false;

export function installProductionRuntime(THREE) {
  if (installed) return;
  installed = true;

  const originalRender = THREE.WebGLRenderer.prototype.render;
  const states = new WeakMap();

  THREE.WebGLRenderer.prototype.render = function renderWithProductionRuntime(scene, camera) {
    const isMainGameScene =
      !scene?.userData?.firstPersonHandsOverlay
      && this.domElement?.parentElement?.id === 'game'
      && camera?.isPerspectiveCamera;

    if (isMainGameScene) {
      let state = states.get(this);
      if (!state) {
        const coarsePointer = matchMedia('(pointer: coarse)').matches;
        installPbrEnvironment(THREE, scene, this);
        const assets = new ProductionAssetRuntime(THREE, scene, this, { coarsePointer });
        const performanceController = createAdaptivePerformanceController(this, { coarsePointer });
        state = { assets, performanceController, loadStarted: false };
        states.set(this, state);
      }

      state.performanceController.update();

      if (!state.loadStarted) {
        state.loadStarted = true;
        queueMicrotask(() => {
          state.assets.loadAll().then((loaded) => {
            window.RiskMulateProduction = {
              assets: state.assets,
              performance: state.performanceController,
              loaded,
            };
            window.dispatchEvent(new CustomEvent('riskmulate:production-ready', {
              detail: { loadedAssetIds: [...loaded.keys()] },
            }));
          });
        });
      }
    }

    return originalRender.call(this, scene, camera);
  };
}
