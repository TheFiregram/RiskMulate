import { getSharedRapierPhysics } from './rapier-physics.js';

export async function createProductionColliderBridge(assets) {
  const physics = await getSharedRapierPhysics({ gravity: [0, 0, 0] });
  const registered = new Map();

  function registerAsset(id) {
    if (!id || registered.has(id)) return registered.get(id) || [];
    const record = assets.loaded.get(id);
    if (!record?.colliders?.length) return [];

    const handles = record.colliders.map((proxy) => physics.addFixedTrimesh({
      vertices: proxy.vertices,
      indices: proxy.indices,
    }));
    registered.set(id, handles);
    return handles;
  }

  function unregisterAsset(id) {
    const handles = registered.get(id);
    if (!handles) return false;
    for (const collider of handles) physics.removeCollider(collider);
    registered.delete(id);
    return true;
  }

  for (const id of assets.loaded.keys()) registerAsset(id);

  const onLoaded = (event) => registerAsset(event.detail?.id);
  const onUnloaded = (event) => unregisterAsset(event.detail?.id);
  window.addEventListener('riskmulate:asset-loaded', onLoaded);
  window.addEventListener('riskmulate:asset-unloaded', onUnloaded);

  return {
    physics,
    registerAsset,
    unregisterAsset,
    getDiagnostics() {
      return {
        assetIds: [...registered.keys()],
        colliderCount: [...registered.values()].reduce((sum, list) => sum + list.length, 0),
      };
    },
  };
}
