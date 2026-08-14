import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { productionAssetManifest, selectAssetUrl } from './asset-manifest.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/libs/draco/';
const BASIS_PATH = 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/libs/basis/';

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

export class ProductionAssetRuntime {
  constructor(THREE, scene, renderer, { coarsePointer = false } = {}) {
    this.THREE = THREE;
    this.scene = scene;
    this.renderer = renderer;
    this.coarsePointer = coarsePointer;
    this.loaded = new Map();
    this.failed = new Set();

    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_PATH);

    const ktx2 = new KTX2Loader();
    ktx2.setTranscoderPath(BASIS_PATH);
    ktx2.detectSupport(renderer);

    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(draco);
    this.loader.setKTX2Loader(ktx2);
    this.loader.setMeshoptDecoder(MeshoptDecoder);
  }

  async loadEntry(entry) {
    if (this.loaded.has(entry.id) || this.failed.has(entry.id)) return this.loaded.get(entry.id) || null;

    const url = selectAssetUrl(entry, this.coarsePointer);
    if (!url) return null;

    const fallbacks = collectFallbacks(this.scene, entry.replaceAssetTypes);

    try {
      const gltf = await this.loader.loadAsync(url);
      const root = gltf.scene || gltf.scenes?.[0];
      if (!root) throw new Error(`No scene root found in ${url}`);

      configureModel(root, this.renderer, entry, this.coarsePointer);
      this.scene.add(root);
      hideFallbacks(fallbacks);
      this.loaded.set(entry.id, { root, gltf, fallbacks, url });
      window.dispatchEvent(new CustomEvent('riskmulate:asset-loaded', {
        detail: { id: entry.id, url },
      }));
      return this.loaded.get(entry.id);
    } catch (error) {
      showFallbacks(fallbacks);
      this.failed.add(entry.id);
      console.info(`[RiskMulate] Production asset unavailable; keeping procedural fallback: ${entry.id}`);
      return null;
    }
  }

  async loadAll() {
    const ordered = [...productionAssetManifest].sort((a, b) => {
      const rank = { high: 0, normal: 1, low: 2 };
      return (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1);
    });

    for (const entry of ordered) await this.loadEntry(entry);
    return this.loaded;
  }

  restoreFallback(id) {
    const record = this.loaded.get(id);
    if (!record) return false;
    record.root.removeFromParent();
    showFallbacks(record.fallbacks);
    this.loaded.delete(id);
    return true;
  }
}
