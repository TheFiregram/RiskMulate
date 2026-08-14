import { createAdaptivePerformanceController } from './adaptive-performance.js';
import { installPbrEnvironment } from './environment-lighting.js';
import { installIndustrialVisualPass } from './industrial-visual-pass.js';
import { ProductionAssetRuntime } from './production-assets.js';

let installed = false;

function createAssetDebugPanel(assets) {
  if (!new URLSearchParams(window.location.search).has('assetDebug')) return null;

  const panel = document.createElement('pre');
  panel.id = 'riskmulateAssetDebug';
  panel.style.cssText = [
    'position:fixed',
    'left:12px',
    'bottom:12px',
    'z-index:99999',
    'max-width:min(560px,calc(100vw - 24px))',
    'max-height:42vh',
    'overflow:auto',
    'margin:0',
    'padding:10px 12px',
    'border:1px solid rgba(255,255,255,.2)',
    'border-radius:8px',
    'background:rgba(4,10,14,.92)',
    'color:#d8edf5',
    'font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace',
    'white-space:pre-wrap',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(panel);

  const render = () => {
    const diagnostics = assets.getDiagnostics();
    panel.textContent = [
      'RISKMULATE ASSET DEBUG',
      `loaded: ${diagnostics.loadedAssetIds.join(', ') || 'none'}`,
      `pending: ${diagnostics.pendingAssetIds.join(', ') || 'none'}`,
      `failed: ${diagnostics.failedAssets.length || 'none'}`,
      ...diagnostics.failedAssets.map((item) => `${item.id}: ${item.message}\n${item.url}`),
    ].join('\n');
  };

  render();
  window.addEventListener('riskmulate:asset-loaded', render);
  window.addEventListener('riskmulate:asset-error', render);
  window.addEventListener('riskmulate:asset-unloaded', render);
  return { panel, render };
}

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
        const assets = new ProductionAssetRuntime(THREE, scene, this, { coarsePointer });
        const performanceController = createAdaptivePerformanceController(this, { coarsePointer });
        const visual = installIndustrialVisualPass(THREE, scene, this, { coarsePointer });
        const debug = createAssetDebugPanel(assets);
        state = {
          assets,
          performanceController,
          visual,
          debug,
          environmentStarted: false,
          loadStarted: false,
        };
        states.set(this, state);

        window.RiskMulateProduction = {
          assets,
          performance: performanceController,
          visual,
          getDiagnostics: () => assets.getDiagnostics(),
        };
      }

      state.performanceController.update();
      state.assets.update(camera);

      if (!state.environmentStarted) {
        state.environmentStarted = true;
        queueMicrotask(() => installPbrEnvironment(THREE, scene, this));
      }

      if (!state.loadStarted) {
        state.loadStarted = true;
        queueMicrotask(() => {
          state.assets.loadPreloaded().then((loaded) => {
            window.RiskMulateProduction.loaded = loaded;
            state.debug?.render();
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
