const NAVIGATION_EVENT = 'riskmulate:navigation';

export function installNavigationBridge(THREE, { updatesPerSecond = 60 } = {}) {
  const cameraType = THREE.PerspectiveCamera;
  if (!cameraType) return;

  const cameraProto = cameraType.prototype;
  if (cameraProto.__riskmulateNavigationBridgeInstalled) return;

  const updateMatrix = cameraProto.updateMatrixWorld;
  if (typeof updateMatrix !== 'function') return;

  const minimumInterval = 1000 / Math.max(1, updatesPerSecond);
  let lastPublishedAt = -Infinity;

  cameraProto.updateMatrixWorld = function updateNavigationMatrix(force) {
    const result = updateMatrix.call(this, force);
    const now = performance.now();

    if (now - lastPublishedAt >= minimumInterval) {
      lastPublishedAt = now;
      window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, {
        detail: {
          x: this.position.x,
          z: this.position.z,
          yaw: this.rotation.y,
        },
      }));
    }

    return result;
  };

  Object.defineProperty(cameraProto, '__riskmulateNavigationBridgeInstalled', { value: true });
}
