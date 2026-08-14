export function createAdaptivePerformanceController(renderer, { coarsePointer = false } = {}) {
  const maxPixelRatio = Math.min(devicePixelRatio || 1, coarsePointer ? 1.5 : 2);
  const minPixelRatio = coarsePointer ? 0.85 : 1;
  let currentPixelRatio = Math.min(renderer.getPixelRatio(), maxPixelRatio);
  let emaFrameMs = 16.7;
  let lastTime = performance.now();
  let samples = 0;
  let cooldown = 0;

  function setRatio(next) {
    const ratio = Math.max(minPixelRatio, Math.min(maxPixelRatio, Number(next.toFixed(2))));
    if (Math.abs(ratio - currentPixelRatio) < 0.04) return;
    currentPixelRatio = ratio;
    renderer.setPixelRatio(ratio);
    renderer.setSize(innerWidth, innerHeight, false);
    window.dispatchEvent(new CustomEvent('riskmulate:render-scale', {
      detail: { pixelRatio: ratio },
    }));
  }

  return {
    update() {
      const now = performance.now();
      const frameMs = Math.min(80, Math.max(1, now - lastTime));
      lastTime = now;
      emaFrameMs += (frameMs - emaFrameMs) * 0.035;
      samples += 1;
      if (cooldown > 0) cooldown -= 1;
      if (samples < 180 || cooldown > 0) return;

      if (emaFrameMs > 24 && currentPixelRatio > minPixelRatio) {
        setRatio(currentPixelRatio - 0.15);
        cooldown = 240;
      } else if (emaFrameMs < 15.2 && currentPixelRatio < maxPixelRatio) {
        setRatio(currentPixelRatio + 0.1);
        cooldown = 360;
      }
    },
    getState() {
      return { frameMs: emaFrameMs, pixelRatio: currentPixelRatio, minPixelRatio, maxPixelRatio };
    },
  };
}
