import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { productionAssetManifest, selectAssetUrl } from './asset-manifest.js';
import { extractColliderMeshes } from './collider-extraction.js';

function configureTexture(texture, renderer) {
  if (!texture?.isTexture) return;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 1);
  texture.needsUpdate = true;
}

function configureMaterial(material, renderer) {
  if (!material) return;
  for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
    configureTexture(material[key], renderer);
  }
  if (material.map) material.map.colorSpace = material.map.colorSpace || 'srgb';
  material.needsUpdate = true;
}

function configureModel(root, renderer, entry, coarsePointer) {
  root.name = `production:${entry.id}`;
  root.userData.productionAsset = entry.id;
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = Boolean(entry.castShadow) && !coarsePointer;
    object.receiveShadow = entry.receiveShadow !== false;
    if (Array.isArray(object.material)) object.material.forEach((material) => configureMaterial(material, renderer));
    else configureMaterial(object.material, renderer);
    object.frustumCulled = true;
  });
}

function collectFallbacks(scene, entry) {
  const assetTypes = new Set(entry.replaceAssetTypes || []);
  const userDataKeys = entry.replaceUserDataKeys || [];
  if (!assetTypes.size && !userDataKeys.length) return [];

  const fallback = [];
  scene.traverse((object) => {
    const matchesAssetType = assetTypes.has(object.userData?.assetType);
    const matchesUserData = userDataKeys.some((key) => Boolean(object.userData?.[key]));
    if (matchesAssetType || matchesUserData) fallback.push(object);
  });
  return fallback;
}

function hideFallbacks(objects) {
  for (const object of objects) object.visible = false;
}

function showFallbacks(objects) {
  for (const object of objects) object.visible = true;
}

function horizontalDistance(camera, anchor = [0, 0, 0]) {
  return Math.hypot(camera.position.x - anchor[0], camera.position.z - anchor[2]);
}

async function createLoader() {
  return new GLTFLoader();
}

function resolveAssetUrl(url) {
  return new URL(url, window.location.href).href;
}

function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error || 'Unknown production asset error');
}

function retryDelay(attempts) {
  return Math.min(15000, 1500 * (2 ** Math.max(0, attempts - 1)));
}

export class ProductionAssetRuntime {
  constructor(THREE, scene, renderer, { coarsePointer = false } = {}) {
    this.THREE = THREE;
    this.scene = scene;
    this.renderer = renderer;
    this.coarsePointer = coarsePointer;
    this.loaded = new Map();
    this.pending = new Map();
    this.failed = new Map();
    this.loaderPromise = null;
    this.lastStreamingUpdate = 0;
  }

  getLoader() {
    if (!this.loaderPromise) {
      this.loaderPromise = createLoader().catch((error) => {
        this.loaderPromise = null;
        throw error;
      });
    }
    return this.loaderPromise;
  }

  loadEntry(entry) {
    if (!entry.enabled) return Promise.resolve(null);
    if (this.loaded.has(entry.id)) return Promise.resolve(this.loaded.get(entry.id));
    if (this.pending.has(entry.id)) return this.pending.get(entry.id);

    const failure = this.failed.get(entry.id);
    if (failure && performance.now() < failure.nextRetryAt) return Promise.resolve(null);

    const task = this.loadEntryInternal(entry).finally(() => this.pending.delete(entry.id));
    this.pending.set(entry.id, task);
    return task;
  }

  async loadEntryInternal(entry) {
    const selectedUrl = selectAssetUrl(entry, this.coarsePointer);
    if (!selectedUrl) return null;

    const url = resolveAssetUrl(selectedUrl);
    const fallbacks = collectFallbacks(this.scene, entry);

    try {
      const loader = await this.getLoader();
      const gltf = await loader.loadAsync(url);
      const root = gltf.scene || gltf.scenes?.[0];
      if (!root) throw new Error(`No scene root found in ${url}`);

      configureModel(root, this.renderer, entry, this.coarsePointer);
      this.scene.add(root);
      const colliders = extractColliderMeshes(this.THREE, root);
      hideFallbacks(fallbacks);
      this.loaded.set(entry.id, { root, gltf, fallbacks, colliders, url });
      this.failed.delete(entry.id);

      window.dispatchEvent(new CustomEvent('riskmulate:asset-loaded', {
        detail: { id: entry.id, url, colliderCount: colliders.length },
      }));
      console.info(`[RiskMulate] Production asset loaded: ${entry.id}`);
      return this.loaded.get(entry.id);
    } catch (error) {
      showFallbacks(fallbacks);
      const message = getErrorMessage(error);
      const attempts = (this.failed.get(entry.id)?.attempts || 0) + 1;
      const nextRetryAt = performance.now() + retryDelay(attempts);
      this.failed.set(entry.id, { url, message, error, attempts, nextRetryAt });
      console.error(`[RiskMulate] Production asset failed: ${entry.id}`, { url, message, attempts, error });
      window.dispatchEvent(new CustomEvent('riskmulate:asset-error', {
        detail: { id: entry.id, url, message, attempts },
      }));
      return null;
    }
  }

  async loadPreloaded() {
    const ordered = productionAssetManifest
      .filter((entry) => entry.enabled && entry.preload)
      .sort((a, b) => {
        const rank = { high: 0, normal: 1, low: 2 };
        return (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1);
      });

    for (const entry of ordered) await this.loadEntry(entry);
    return this.loaded;
  }

  update(camera) {
    const now = performance.now();
    if (now - this.lastStreamingUpdate < 250) return;
    this.lastStreamingUpdate = now;

    for (const entry of productionAssetManifest) {
      if (!entry.enabled || !entry.anchor) continue;
      const distance = horizontalDistance(camera, entry.anchor);
      const loadDistance = entry.loadDistance ?? Infinity;
      const unloadDistance = Math.max(loadDistance, entry.unloadDistance ?? loadDistance);

      if (this.loaded.has(entry.id) && !entry.preload && distance > unloadDistance) {
        this.restoreFallback(entry.id);
      } else if (!this.loaded.has(entry.id) && !this.pending.has(entry.id) && distance <= loadDistance) {
        void this.loadEntry(entry);
      }
    }
  }

  restoreFallback(id) {
    const record = this.loaded.get(id);
    if (!record) return false;
    record.root.removeFromParent();
    showFallbacks(record.fallbacks);
    this.loaded.delete(id);
    window.dispatchEvent(new CustomEvent('riskmulate:asset-unloaded', { detail: { id } }));
    return true;
  }

  getDiagnostics() {
    return {
      loadedAssetIds: [...this.loaded.keys()],
      pendingAssetIds: [...this.pending.keys()],
      failedAssets: [...this.failed.entries()].map(([id, detail]) => ({
        id,
        url: detail.url,
        message: detail.message,
        attempts: detail.attempts,
      })),
    };
  }
}
