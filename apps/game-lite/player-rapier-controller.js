import { getSharedRapierPhysics } from './rapier-physics.js';

const WORLD_HALF_SIZE = 26.65;
const OBSTACLE_HEIGHT = 5.0;
const BOUNDARY_THICKNESS = 0.6;
const PLAYER_BODY_CENTER_Y = 1.0;
const PLAYER_RADIUS = 0.42;
const PLAYER_HALF_HEIGHT = 0.58;
const MAX_CAPTURED_OBSTACLES = 256;

function isLegacyObstacle(value) {
  if (!value || typeof value !== 'object') return false;
  // Avoid Object.keys().sort().join() on every push; check the four known fields first.
  if (!('x' in value) || !('z' in value) || !('w' in value) || !('d' in value)) return false;
  if (!Number.isFinite(value.x) || !Number.isFinite(value.z) || !Number.isFinite(value.w) || !Number.isFinite(value.d)) {
    return false;
  }
  // Reject richer objects that happen to carry x/z/w/d.
  for (const key of Object.keys(value)) {
    if (key !== 'x' && key !== 'z' && key !== 'w' && key !== 'd') return false;
  }
  return true;
}

export function installRapierPlayerController(THREE) {
  const capturedObstacles = [];
  let obstacleArray = null;
  let captureActive = true;
  let physics = null;
  let character = null;
  let cameraPosition = null;
  let lastRequestedX = null;
  let lastRequestedZ = null;
  let ready = false;
  let failed = false;
  let staticColliderCount = 0;
  let correctionCount = 0;

  const diagnostics = {
    mode: 'legacy-bootstrap',
    ready: false,
    failed: false,
    capturedObstacleCount: 0,
    staticColliderCount: 0,
    correctionCount: 0,
    lastError: null,
  };

  window.RiskMulatePlayerPhysics = {
    getDiagnostics: () => ({ ...diagnostics }),
  };

  const originalPush = Array.prototype.push;

  function restoreArrayPush() {
    if (Array.prototype.push !== originalPush) {
      Array.prototype.push = originalPush;
    }
  }

  Array.prototype.push = function captureLegacyObstacle(...items) {
    if (
      captureActive
      && items.length === 1
      && isLegacyObstacle(items[0])
      && capturedObstacles.length < MAX_CAPTURED_OBSTACLES
    ) {
      obstacleArray = this;
      // CRITICAL: use the original implementation. Calling this.push / capturedObstacles.push
      // would re-enter the monkey-patch and overflow the stack.
      originalPush.call(capturedObstacles, {
        x: items[0].x,
        z: items[0].z,
        w: items[0].w,
        d: items[0].d,
      });
      diagnostics.capturedObstacleCount = capturedObstacles.length;
    }
    return originalPush.apply(this, items);
  };

  const originalSet = THREE.Vector3.prototype.set;
  const trackedCameraPositions = new WeakSet();

  function addStaticColliders() {
    for (const obstacle of capturedObstacles) {
      physics.addFixedBox({
        center: [obstacle.x, OBSTACLE_HEIGHT / 2, obstacle.z],
        size: [obstacle.w, OBSTACLE_HEIGHT, obstacle.d],
      });
      staticColliderCount += 1;
    }

    const span = WORLD_HALF_SIZE * 2 + BOUNDARY_THICKNESS * 2;
    const wallCenter = WORLD_HALF_SIZE + BOUNDARY_THICKNESS / 2;
    const wallY = OBSTACLE_HEIGHT / 2;
    const verticalWall = [BOUNDARY_THICKNESS, OBSTACLE_HEIGHT, span];
    const horizontalWall = [span, OBSTACLE_HEIGHT, BOUNDARY_THICKNESS];

    physics.addFixedBox({ center: [-wallCenter, wallY, 0], size: verticalWall });
    physics.addFixedBox({ center: [wallCenter, wallY, 0], size: verticalWall });
    physics.addFixedBox({ center: [0, wallY, -wallCenter], size: horizontalWall });
    physics.addFixedBox({ center: [0, wallY, wallCenter], size: horizontalWall });
    staticColliderCount += 4;
  }

  async function initializePhysics(position) {
    if (ready || failed || character) return;
    try {
      physics = await getSharedRapierPhysics({ gravity: [0, 0, 0] });
      addStaticColliders();
      character = physics.createCharacter({
        position: [position.x, PLAYER_BODY_CENTER_Y, position.z],
        radius: PLAYER_RADIUS,
        halfHeight: PLAYER_HALF_HEIGHT,
        offset: 0.02,
        stepHeight: 0.28,
        stepWidth: 0.16,
        snapToGround: 0.18,
        maxSlopeDegrees: 46,
      });

      // Keep the legacy rectangles as a boot/error fallback, then retire them once
      // the Rapier capsule and equivalent static colliders are live.
      if (obstacleArray) obstacleArray.length = 0;

      ready = true;
      diagnostics.mode = 'rapier-character-controller';
      diagnostics.ready = true;
      diagnostics.staticColliderCount = staticColliderCount;
      window.dispatchEvent(new CustomEvent('riskmulate:player-physics-ready', {
        detail: {
          capturedObstacleCount: capturedObstacles.length,
          staticColliderCount,
        },
      }));
    } catch (error) {
      failed = true;
      diagnostics.mode = 'legacy-fallback';
      diagnostics.failed = true;
      diagnostics.lastError = error instanceof Error ? error.message : String(error);
      console.error('[RiskMulate] Rapier player controller failed; legacy collision remains active', error);
    } finally {
      // Always stop capturing once physics has attempted to boot.
      captureActive = false;
      restoreArrayPush();
    }
  }

  THREE.Vector3.prototype.set = function setWithRapierNavigation(x, y, z) {
    if (!trackedCameraPositions.has(this)) return originalSet.call(this, x, y, z);

    if (lastRequestedX === null || lastRequestedZ === null) {
      lastRequestedX = x;
      lastRequestedZ = z;
      return originalSet.call(this, x, y, z);
    }

    const dx = x - lastRequestedX;
    const dz = z - lastRequestedZ;
    lastRequestedX = x;
    lastRequestedZ = z;

    if (!ready || !physics || !character) return originalSet.call(this, x, y, z);
    if (Math.abs(dx) < 1e-7 && Math.abs(dz) < 1e-7) return originalSet.call(this, this.x, y, this.z);

    const requestedDistance = Math.hypot(dx, dz);
    physics.moveCharacter(character, [dx, 0, dz]);
    physics.step(1 / 60);
    const position = character.body.translation();
    const appliedDx = position.x - this.x;
    const appliedDz = position.z - this.z;
    const appliedDistance = Math.hypot(appliedDx, appliedDz);
    if (appliedDistance + 1e-5 < requestedDistance) {
      correctionCount += 1;
      diagnostics.correctionCount = correctionCount;
    }
    return originalSet.call(this, position.x, y, position.z);
  };

  const originalRender = THREE.WebGLRenderer.prototype.render;
  THREE.WebGLRenderer.prototype.render = function renderWithRapierPlayer(scene, camera) {
    const mainCamera =
      !scene?.userData?.firstPersonHandsOverlay
      && this.domElement?.parentElement?.id === 'game'
      && camera?.isPerspectiveCamera;

    if (mainCamera && !trackedCameraPositions.has(camera.position)) {
      cameraPosition = camera.position;
      trackedCameraPositions.add(cameraPosition);
      lastRequestedX = cameraPosition.x;
      lastRequestedZ = cameraPosition.z;
      initializePhysics(cameraPosition);
    }

    return originalRender.call(this, scene, camera);
  };

  return {
    finishCapture() {
      captureActive = false;
      restoreArrayPush();
      if (cameraPosition && !ready && !failed) initializePhysics(cameraPosition);
    },
    getDiagnostics: () => ({ ...diagnostics }),
  };
}
