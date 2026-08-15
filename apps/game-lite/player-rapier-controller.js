import { getSharedRapierPhysics } from './rapier-physics.js';

export function createPlayerRapierController({
  player,
  obstacles,
  playableHalfSize,
  bodyCenterY = 1.0,
  obstacleHeight = 5.0,
  boundaryThickness = 0.6,
} = {}) {
  let physics = null;
  let character = null;
  let ready = false;
  let failed = false;
  let staticColliderCount = 0;

  const diagnostics = {
    mode: 'initializing',
    ready: false,
    failed: false,
    staticColliderCount: 0,
    lastError: null,
  };

  window.RiskMulatePlayerPhysics = {
    getDiagnostics: () => ({ ...diagnostics }),
  };

  function addLegacyStaticColliders() {
    for (const obstacle of obstacles) {
      physics.addFixedBox({
        center: [obstacle.x, obstacleHeight / 2, obstacle.z],
        size: [obstacle.w, obstacleHeight, obstacle.d],
      });
      staticColliderCount += 1;
    }

    const span = playableHalfSize * 2 + boundaryThickness * 2;
    const wallCenter = playableHalfSize + boundaryThickness / 2;
    const wallY = obstacleHeight / 2;
    const verticalWall = [boundaryThickness, obstacleHeight, span];
    const horizontalWall = [span, obstacleHeight, boundaryThickness];

    physics.addFixedBox({ center: [-wallCenter, wallY, 0], size: verticalWall });
    physics.addFixedBox({ center: [wallCenter, wallY, 0], size: verticalWall });
    physics.addFixedBox({ center: [0, wallY, -wallCenter], size: horizontalWall });
    physics.addFixedBox({ center: [0, wallY, wallCenter], size: horizontalWall });
    staticColliderCount += 4;
  }

  async function initialize() {
    try {
      physics = await getSharedRapierPhysics({ gravity: [0, 0, 0] });
      addLegacyStaticColliders();
      character = physics.createCharacter({
        position: [player.x, bodyCenterY, player.z],
        radius: player.radius,
        halfHeight: 0.58,
        offset: 0.02,
        stepHeight: 0.28,
        stepWidth: 0.16,
        snapToGround: 0.18,
        maxSlopeDegrees: 46,
      });
      ready = true;
      diagnostics.mode = 'rapier';
      diagnostics.ready = true;
      diagnostics.staticColliderCount = staticColliderCount;
      window.dispatchEvent(new CustomEvent('riskmulate:player-physics-ready', {
        detail: { staticColliderCount },
      }));
    } catch (error) {
      failed = true;
      diagnostics.mode = 'legacy-fallback';
      diagnostics.failed = true;
      diagnostics.lastError = error instanceof Error ? error.message : String(error);
      console.error('[RiskMulate] Rapier player controller failed; retaining legacy collision fallback', error);
    }
  }

  initialize();

  function move(dx, dz, dt) {
    if (!ready || !physics || !character) return false;
    physics.moveCharacter(character, [dx, 0, dz]);
    physics.step(dt);
    const position = character.body.translation();
    player.x = position.x;
    player.z = position.z;
    return true;
  }

  return {
    move,
    isReady: () => ready,
    hasFailed: () => failed,
    getDiagnostics: () => ({ ...diagnostics }),
  };
}
