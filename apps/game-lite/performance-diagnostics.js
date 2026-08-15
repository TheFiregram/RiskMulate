export function installPerformanceDiagnostics(THREE) {
  if (globalThis.__riskmulatePerformanceDiagnosticsInstalled) return;
  globalThis.__riskmulatePerformanceDiagnosticsInstalled = true;

  const samples = [];
  const maxSamples = 180;
  let lastFrame = performance.now();
  let renderer = null;
  let rafId = 0;

  const state = {
    ready: false,
    fps: 0,
    frameMs: 0,
    p95FrameMs: 0,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    geometries: 0,
    mobileLite: Boolean(globalThis.RiskMulateMobileProfile?.mobileLite),
    sampleCount: 0,
    updatedAt: null,
  };

  function percentile(values, ratio) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio));
    return sorted[index];
  }

  function publish() {
    const recent = samples.slice(-120);
    const averageMs = recent.length ? recent.reduce((sum, value) => sum + value, 0) / recent.length : 0;
    state.frameMs = Number(averageMs.toFixed(2));
    state.fps = averageMs > 0 ? Number((1000 / averageMs).toFixed(1)) : 0;
    state.p95FrameMs = Number(percentile(recent, 0.95).toFixed(2));
    state.sampleCount = samples.length;
    state.updatedAt = new Date().toISOString();

    if (renderer?.info) {
      state.drawCalls = renderer.info.render.calls || 0;
      state.triangles = renderer.info.render.triangles || 0;
      state.textures = renderer.info.memory.textures || 0;
      state.geometries = renderer.info.memory.geometries || 0;
    }
  }

  function tick(now) {
    const delta = Math.max(0, Math.min(1000, now - lastFrame));
    lastFrame = now;
    if (delta > 0) {
      samples.push(delta);
      if (samples.length > maxSamples) samples.shift();
    }
    publish();
    state.ready = samples.length >= 30;
    rafId = requestAnimationFrame(tick);
  }

  const originalRender = THREE.WebGLRenderer.prototype.render;
  THREE.WebGLRenderer.prototype.render = function renderWithDiagnostics(scene, camera) {
    if (!renderer && this.domElement?.parentElement?.id === 'game') renderer = this;
    return originalRender.call(this, scene, camera);
  };

  globalThis.RiskMulatePerformance = {
    getDiagnostics: () => ({ ...state }),
    getFrameSamples: () => [...samples],
    dispose: () => {
      if (rafId) cancelAnimationFrame(rafId);
      THREE.WebGLRenderer.prototype.render = originalRender;
      globalThis.__riskmulatePerformanceDiagnosticsInstalled = false;
    },
  };

  rafId = requestAnimationFrame(tick);
}
