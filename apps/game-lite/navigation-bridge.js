const NAVIGATION_EVENT = 'riskmulate:navigation';

/**
 * Publishes the active Three.js camera pose for HUD-only navigation systems.
 * The game simulation remains authoritative; the HUD receives a read-only pose.
 */
export function installNavigationBridge(THREE, { updatesPerSecond = 30 } = {}) {
  const rendererPrototype = THREE.WebGLRenderer?.prototype;
  if (!rendererPrototype || rendererPrototype.__riskmulateNavigationBridgeInstalled) return;

  const originalRender = rendererPrototype.render;
  const minimumInterval = 1000 / Math.max(1, updatesPerSecond);
  let lastPublishedAt = 0;

  rendererPrototype.render = function renderWithNavigationPose(scene, camera) {
    const now = performance.now();
    if (camera?.isPerspectiveCamera && now - lastPublishedAt >= minimumInterval) {
      lastPublishedAt = now;
      window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, {
        detail: {
          x: camera.position.x,
          z: camera.position.z,
          yaw: camera.rotation.y,
        },
      }));
    }

    return originalRender.call(this, scene, camera);
  };

  Object.defineProperty(rendererPrototype, '__riskmulateNavigationBridgeInstalled', {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });
}
