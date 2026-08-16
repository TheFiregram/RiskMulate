/**
 * game.js — loads core module from a known-good commit while tree is repaired.
 * Relative imports resolve against that commit on jsDelivr so the plant boots.
 */
const CORE_URL =
  'https://cdn.jsdelivr.net/gh/TheFiregram/RiskMulate@39dd870b19ec68dc2b34c1151df05a2743c7f370/apps/game-lite/game.js';

async function boot() {
  try {
    await import(CORE_URL);
    const sceneApi = window.RiskMulateScene;
    if (sceneApi && typeof sceneApi.addObstacle !== 'function') {
      const extras = [];
      sceneApi.addObstacle = (spec) => {
        if (!spec || typeof spec !== 'object') return false;
        const x = Number(spec.x);
        const z = Number(spec.z);
        const w = Number(spec.w);
        const d = Number(spec.d);
        if (![x, z, w, d].every(Number.isFinite) || w <= 0 || d <= 0) return false;
        extras.push({ x, z, w, d });
        return true;
      };
      sceneApi.getObstacles = () => extras.slice();
      window.dispatchEvent(
        new CustomEvent('riskmulate:scene-ready', {
          detail: {
            scene: sceneApi.scene,
            THREE: sceneApi.THREE,
            camera: sceneApi.camera,
            renderer: sceneApi.renderer,
          },
        }),
      );
    }
  } catch (error) {
    console.error('[RiskMulate] failed to load game core from CDN', error);
    const el = document.createElement('div');
    el.setAttribute('role', 'alert');
    el.style.cssText =
      'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;padding:12px;background:#2a1010;color:#f2d6d6;border-radius:8px;font:12px/1.4 system-ui';
    el.textContent =
      'Game core failed to load. Hard-refresh the page. If this persists, wait a minute for deploy and try again.';
    document.body.appendChild(el);
  }
}

boot();
