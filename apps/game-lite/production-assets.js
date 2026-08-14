import { productionAssetManifest, selectAssetUrl } from './asset-manifest.js';
import { extractColliderMeshes } from './collider-extraction.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/libs/draco/';
const BASIS_PATH = 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/libs/basis/';
const MODULE_URLS = Object.freeze({
  draco: 'https://esm.sh/three@0.168.0/examples/jsm/loaders/DRACOLoader.js',
  gltf: 'https://esm.sh/three@0.168.0/examples/jsm/loaders/GLTFLoader.js',
  ktx2: 'https://esm.sh/three@0.168.0/examples/jsm/loaders/KTX2Loader.js',
  meshopt: 'https://esm.sh/three@0.168.0/examples/jsm/libs/meshopt_decoder.module.js',
});

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

function collectFallbacks(scene, assetTypes = []) {
  if (!assetTypes.length) return [];
  const wanted = new Set(assetTypes);
  const fallback = [];
  scene.traverse((object) => {
    if (wanted.has(object.userData?.assetType)) fallback.push(object);
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

async function createLoader(renderer) {
  const [dracoModule, gltfModule, ktx2Module, meshoptModule] = await Promise.all([
    import(MODULE_URLS.draco),
    import(MODULE_URLS.gltf),
    import(MODULE_URLS.ktx2),
    import(MODULE_URLS.meshopt),
  ]);

  const draco = new dracoModule.DRACOLoader();
  draco.setDecoderPath(DRACO_PATH);

  const ktx2 = new ktx2Module.KTX2Loader();
  ktx2.setTranscoderPath(BASIS_PATH);
  ktx2.detectSupport(renderer);

  const loader = new gltfModule.GLTFLoader();
  loader.setDRACOLoader(draco);
  loader.setKTX2Loader(ktx2);
  loader.setMeshoptDecoder(meshoptModule.MeshoptDecoder);
  return loader;
}

export class ProductionAssetRuntime {
  constructor(THREE, scene, renderer, { coarsePointer = false } = {}) {
    this.THREE = THREE;
    this.scene = scene;
    this.renderer = renderer;
    this.coarsePointer = coarsePointer;
    this.loaded = new Map();
    this.pending = new Map();
    this.failed = new Set();
    this.loaderPromise = null;
    this.lastStreamingUpdate = 0;
  }

  getLoader() {
    if (!this.loaderPromise) this.loaderPromise = createLoader(this.renderer);
    return this.loaderPromise;
  }

  loadEntry(entry) {
    if (!entry.enabled) return Promise.resolve(null);
    if (this.loaded.has(entry.id) || this.failed.has(entry.id)) {
      return Promise.resolve(this.loaded.get(entry.id) || null);
    }
    if (this.pending.has(entry.id)) return this.pending.get(entry.id);

    const task = this.loadEntryInternal(entry).finally(() => this.pending.delete(entry.id));
    this.pending.set(entry.id, task);
    return task;
  }

  async loadEntryInternal(entry) {
    const url = selectAssetUrl(entry, this.coarsePointer);
    if (!url) return null;

    const fallbacks = collectFallbacks(this.scene, entry.replaceAssetTypes);

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
      window.dispatchEvent(new CustomEvent('riskmulate:asset-loaded', {
        detail: { id: entry.id, url, colliderCount: colliders.length },
      }));
      return this.loaded.get(entry.id);
    } catch (error) {
      showFallbacks(fallbacks);
      this.failed.add(entry.id);
      console.info(`[RiskMulate] Production asset unavailable; keeping procedural fallback: ${entry.id}`);
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
      if (!entry.enabled || entry.preload || !entry.anchor) continue;
      const distance = horizontalDistance(camera, entry.anchor);
      const loadDistance = entry.loadDistance ?? Infinity;
      const unloadDistance = Math.max(loadDistance, entry.unloadDistance ?? loadDistance);

      if (this.loaded.has(entry.id) && distance > unloadDistance) {
        this.restoreFallback(entry.id);
      } else if (!this.loaded.has(entry.id) && !this.failed.has(entry.id) && distance <= loadDistance) {
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
}
