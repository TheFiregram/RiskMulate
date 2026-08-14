export function extractColliderMeshes(THREE, root) {
  const colliders = [];
  root.updateMatrixWorld(true);

  root.traverse((object) => {
    if (!object.isMesh || !object.name?.startsWith('COLLIDER_')) return;

    const geometry = object.geometry;
    const position = geometry?.getAttribute?.('position');
    if (!position) return;

    const vertices = new Float32Array(position.count * 3);
    const point = new THREE.Vector3();
    for (let index = 0; index < position.count; index += 1) {
      point.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld);
      const offset = index * 3;
      vertices[offset] = point.x;
      vertices[offset + 1] = point.y;
      vertices[offset + 2] = point.z;
    }

    let indices;
    if (geometry.index) {
      indices = new Uint32Array(geometry.index.count);
      for (let index = 0; index < geometry.index.count; index += 1) {
        indices[index] = geometry.index.getX(index);
      }
    } else {
      indices = new Uint32Array(position.count);
      for (let index = 0; index < position.count; index += 1) indices[index] = index;
    }

    object.visible = false;
    object.userData.colliderProxy = true;
    colliders.push({
      name: object.name,
      vertices,
      indices,
    });
  });

  return colliders;
}
