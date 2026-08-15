const RAPIER_MODULE_URL = 'https://esm.sh/@dimforge/rapier3d-compat@0.19.3';

let rapierPromise;
let sharedPhysicsPromise;

async function loadRapier() {
  if (!rapierPromise) {
    rapierPromise = import(RAPIER_MODULE_URL).then(async (module) => {
      const RAPIER = module.default || module;
      if (typeof RAPIER.init === 'function') await RAPIER.init();
      return RAPIER;
    });
  }
  return rapierPromise;
}

export async function createRapierPhysics({ gravity = [0, -9.81, 0] } = {}) {
  const RAPIER = await loadRapier();
  const world = new RAPIER.World({ x: gravity[0], y: gravity[1], z: gravity[2] });

  function addFixedBox({ center, size, rotation } = {}) {
    const [x, y, z] = center;
    const [w, h, d] = size;
    let desc = RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setTranslation(x, y, z);
    if (rotation) desc = desc.setRotation(rotation);
    return world.createCollider(desc);
  }

  function addFixedTrimesh({ vertices, indices, translation = [0, 0, 0] } = {}) {
    const desc = RAPIER.ColliderDesc
      .trimesh(vertices, indices)
      .setTranslation(translation[0], translation[1], translation[2]);
    return world.createCollider(desc);
  }

  function removeCollider(collider) {
    if (!collider) return false;
    world.removeCollider(collider, true);
    return true;
  }

  function createCharacter({
    position = [0, 1.1, 0],
    radius = 0.42,
    halfHeight = 0.58,
    offset = 0.015,
    stepHeight = 0.32,
    stepWidth = 0.18,
    snapToGround = 0.22,
    maxSlopeDegrees = 46,
  } = {}) {
    const bodyDesc = RAPIER.RigidBodyDesc
      .kinematicPositionBased()
      .setTranslation(position[0], position[1], position[2]);
    const body = world.createRigidBody(bodyDesc);
    const collider = world.createCollider(RAPIER.ColliderDesc.capsule(halfHeight, radius), body);
    const controller = world.createCharacterController(offset);
    controller.enableAutostep(stepHeight, stepWidth, false);
    controller.enableSnapToGround(snapToGround);
    controller.setMaxSlopeClimbAngle((maxSlopeDegrees * Math.PI) / 180);

    return { body, collider, controller, radius, halfHeight };
  }

  function moveCharacter(character, desiredTranslation) {
    const desired = {
      x: desiredTranslation[0],
      y: desiredTranslation[1],
      z: desiredTranslation[2],
    };
    character.controller.computeColliderMovement(character.collider, desired);
    const corrected = character.controller.computedMovement();
    const current = character.body.translation();
    const next = {
      x: current.x + corrected.x,
      y: current.y + corrected.y,
      z: current.z + corrected.z,
    };
    character.body.setNextKinematicTranslation(next);
    return { x: corrected.x, y: corrected.y, z: corrected.z };
  }

  function step(dt = 1 / 60) {
    world.integrationParameters.dt = Math.min(1 / 20, Math.max(1 / 240, dt));
    world.step();
  }

  function disposeCharacter(character) {
    if (!character) return;
    world.removeCharacterController(character.controller);
    world.removeRigidBody(character.body);
  }

  return {
    RAPIER,
    world,
    addFixedBox,
    addFixedTrimesh,
    removeCollider,
    createCharacter,
    moveCharacter,
    step,
    disposeCharacter,
  };
}

export function getSharedRapierPhysics(options = { gravity: [0, 0, 0] }) {
  if (!sharedPhysicsPromise) {
    sharedPhysicsPromise = createRapierPhysics(options);
  }
  return sharedPhysicsPromise;
}
