import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const SPECIES = ["pine", "spruce", "birch", "oak"] as const;
const NEAR_COUNT = 16;
const MID_COUNT = 48;
const FAR_COUNT = 240;
type Placement = { position: THREE.Vector3; scale: number; yaw: number; lean: number; phase: number; tint: THREE.Color; species: number };

function randomGenerator(seed: number) {
  let value = seed;
  return () => { value = (value * 16807) % 2147483647; return (value - 1) / 2147483646; };
}

// Grounded, reproducible rings leave the existing yard and walking routes clear.
function placements(count: number, ring: "near" | "mid" | "far"): Placement[] {
  const random = randomGenerator(642 + count);
  return Array.from({ length: count }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const x = ring === "near" ? side * (28 + random() * 4.5) : ring === "mid" ? side * (36 + random() * 23) : i < 180 ? -105 + (i / 179) * 210 + random() * 2 : side * (62 + random() * 20);
    const z = ring === "near" ? 23 - Math.floor(i / 2) * 7.3 + random() * 1.8 : ring === "mid" ? -47 + random() * 80 : i < 180 ? -61 - random() * 16 : -47 + random() * 80;
    const pick = random();
    const species = pick < 0.49 ? 0 : pick < 0.86 ? 1 : pick < 0.96 ? 2 : 3;
    return { position: new THREE.Vector3(x, -0.025, z), scale: 0.72 + random() * 0.6, yaw: random() * Math.PI * 2, lean: (random() - 0.5) * 0.055, phase: random() * Math.PI * 2, tint: new THREE.Color().setHSL(0.22 + random() * 0.035, 0.08 + random() * 0.07, 0.78 + random() * 0.18), species };
  });
}

// Apply the same vertex displacement to colour and sun depth passes.
function wind(material: THREE.Material, time: { value: number }, leaves: boolean, height: number) {
  material.customProgramCacheKey = () => `valley-wind-v1-${leaves}-${height}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.treeTime = time;
    const declarations = `\nuniform float treeTime;\nattribute float treePhase;\n`;
    shader.vertexShader = declarations + shader.vertexShader;
    const bend = `
      float treeH = clamp(position.y / ${height.toFixed(3)}, 0.0, 1.0);
      float treeWave = sin(treeTime * 0.43 + treePhase);
      float treeBend = treeH * treeH * treeWave * 0.19;
      transformed.x += treeBend;
      transformed.z += treeH * treeH * cos(treeTime * 0.31 + treePhase) * 0.08;
      ${leaves ? "transformed += normal * sin(treeTime * 2.7 + treePhase + position.x * 3.1 + position.y * 2.4) * treeH * 0.045;" : ""}
    `;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n${bend}`);
    // Approximate bent normals so trunks keep their original volume in the light.
    shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>\nobjectNormal.y -= objectNormal.x * (2.0 * clamp(position.y / ${height.toFixed(3)}, 0.0, 1.0) * sin(treeTime * 0.43 + treePhase) * 0.19 / ${height.toFixed(3)});`);
    if (leaves && material instanceof THREE.MeshStandardMaterial) {
      shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\nreflectedLight.indirectDiffuse *= gl_FrontFacing ? 1.0 : 1.16;");
    }
  };
}

export function createValleyTrees(scene: THREE.Scene, assetUrl: (path: string) => string, coarsePointer: boolean, softwareRenderer: boolean) {
  const root = new THREE.Group(); root.name = "Kestrel Valley generated treeline"; scene.add(root);
  const time = { value: 0 };
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const meshes: THREE.InstancedMesh[] = [];
  const failures: string[] = [];
  let disposed = false;
  let ready = false;
  let modelTriangles = 0;
  const budget = coarsePointer ? 60000 : 150000;
  const matrix = new THREE.Object3D();

  function ownMaterial<T extends THREE.Material>(material: T): T { materials.add(material); return material; }
  function addInstances(geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial, points: Placement[], near: boolean, leaf: boolean, height: number) {
    if (!points.length) return;
    const tris = (geometry.index?.count ?? geometry.getAttribute("position").count) / 3 * points.length;
    if (modelTriangles + tris > budget) throw new Error(`Tree geometry exceeds ${budget} triangles`);
    modelTriangles += tris;
    geometries.add(geometry);
    geometry.setAttribute("treePhase", new THREE.InstancedBufferAttribute(new Float32Array(points.map(p => p.phase)), 1));
    wind(material, time, leaf, height);
    const mesh = new THREE.InstancedMesh(geometry, material, points.length);
    mesh.name = `${near ? "Near" : "Mid"} ${material.name}`;
    mesh.castShadow = near && !softwareRenderer; mesh.receiveShadow = near && !softwareRenderer;
    points.forEach((p, i) => {
      matrix.position.copy(p.position); matrix.rotation.set(0, p.yaw, p.lean); matrix.scale.setScalar(p.scale); matrix.updateMatrix();
      mesh.setMatrixAt(i, matrix.matrix); mesh.setColorAt(i, p.tint);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor!.needsUpdate = true;
    mesh.computeBoundingBox(); mesh.computeBoundingSphere();
    // Expand culling bounds by the maximum shader displacement.
    if (mesh.boundingSphere) mesh.boundingSphere.radius += 0.5;
    const depth = ownMaterial(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leaf ? material.map : null, alphaTest: leaf ? 0.5 : 0, side: material.side }));
    wind(depth, time, leaf, height); mesh.customDepthMaterial = depth;
    const distance = ownMaterial(new THREE.MeshDistanceMaterial({ map: leaf ? material.map : null, alphaTest: leaf ? 0.5 : 0, side: material.side }));
    wind(distance, time, leaf, height); mesh.customDistanceMaterial = distance;
    root.add(mesh); meshes.push(mesh);
  }

  function releaseGLTF(gltf: { scene: THREE.Group }) {
    gltf.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) { textures.add(value); if (disposed) value.dispose(); }
        material.dispose();
      }
    });
  }

  async function loadRing(species: string, speciesIndex: number, age: "mature" | "young", points: Placement[], near: boolean) {
    if (!points.some(p => p.species === speciesIndex)) return;
    const gltf = await new GLTFLoader().loadAsync(assetUrl(`/models/trees/${species}-${age}.glb`));
    if (disposed) { releaseGLTF(gltf); return; }
    try {
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const original = object.material as THREE.MeshStandardMaterial;
        const leaf = original.alphaTest > 0;
        const geometry = object.geometry.clone();
        // Quantized glTF accessors must become float attributes before baking the
        // node transform. Integer setters would clamp metre positions to [-1, 1].
        for (const name of ["position", "normal"]) {
          const attribute = geometry.getAttribute(name);
          const floats = new Float32Array(attribute.count * 3);
          for (let i = 0; i < attribute.count; i++) {
            floats.set([attribute.getX(i), attribute.getY(i), attribute.getZ(i)], i * 3);
          }
          geometry.setAttribute(name, new THREE.BufferAttribute(floats, 3));
        }
        geometry.applyMatrix4(object.matrixWorld);
        const material = ownMaterial(original.clone());
        material.name = `${species} ${age} ${leaf ? "needles" : "bark"}`;
        material.roughness = leaf ? 0.92 : 1; material.metalness = 0; material.fog = true;
        material.alphaTest = leaf ? 0.5 : 0; material.transparent = false; material.side = leaf ? THREE.DoubleSide : THREE.FrontSide;
        if (leaf) {
          // Crown-oriented normals avoid dark card backs and hard crossed-card seams.
          const position = geometry.getAttribute("position"); const normal = geometry.getAttribute("normal");
          for (let i = 0; i < normal.count; i++) {
            const n = new THREE.Vector3(position.getX(i), 0.5, position.getZ(i)).normalize(); normal.setXYZ(i, n.x, n.y, n.z);
          }
          normal.needsUpdate = true;
        }
        geometry.computeBoundingBox();
        addInstances(geometry, material, points.filter(p => p.species === speciesIndex), near, leaf, geometry.boundingBox!.max.y);
      });
    } finally { releaseGLTF(gltf); }
  }

  async function loadFar() {
    const atlas = await new THREE.TextureLoader().loadAsync(assetUrl("/models/trees/treeline-atlas.png"));
    textures.add(atlas); if (disposed) { atlas.dispose(); return; }
    atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 4;
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    for (let axis = 0; axis < 2; axis++) {
      const start = positions.length / 3;
      for (const [x,y] of [[-6,0],[6,0],[-6,12],[6,12]]) positions.push(axis ? 0 : x, y, axis ? x : 0);
      uvs.push(0,0,1,0,0,1,1,1); indices.push(start,start+1,start+2,start+2,start+1,start+3);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3)); geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const points = placements(FAR_COUNT,"far");
    geometry.setAttribute("treeAtlas",new THREE.InstancedBufferAttribute(new Float32Array(points.map(p=>p.species)),1));
    const material = ownMaterial(new THREE.MeshStandardMaterial({ name:"Baked valley treeline",map:atlas,alphaTest:0.5,side:THREE.DoubleSide,roughness:1,fog:true,color:0xa4b4a3 }));
    addInstances(geometry,material,points,false,false,12);
    const originalCompile = material.onBeforeCompile;
    material.onBeforeCompile = (shader,renderer) => {
      originalCompile(shader,renderer);
      shader.vertexShader = "attribute float treeAtlas;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <uv_vertex>","#include <uv_vertex>\nvMapUv = vMapUv * 0.5 + vec2(mod(treeAtlas,2.0)*0.5, (1.0-floor(treeAtlas/2.0))*0.5);");
    };
    material.customProgramCacheKey = () => "valley-impostor-v1";
  }

  const near = placements(NEAR_COUNT,"near"), mid = placements(MID_COUNT,"mid");
  // Phones use the young geometry for both rings. Software WebGL loads only the atlas.
  const tasks: Promise<unknown>[] = [loadFar()];
  if (!softwareRenderer) SPECIES.forEach((species,i) => {
    tasks.push(loadRing(species,i,coarsePointer?"young":"mature",near,true));
    tasks.push(loadRing(species,i,"young",mid,false));
  });
  const loaded = Promise.allSettled(tasks).then(results => {
    results.forEach(result => { if(result.status === "rejected") { const error=String(result.reason); failures.push(error); console.error("[trees] Asset load failed",error); } });
    ready = true;
    const stats = getStats();
    if (!disposed) console.info("[trees] Geometry budget",stats);
    return stats;
  });
  function getStats() { return { ready, triangles:modelTriangles, budget, drawCalls:meshes.length, near:softwareRenderer?0:NEAR_COUNT, mid:softwareRenderer?0:MID_COUNT, far:FAR_COUNT, failures:[...failures] }; }
  return {
    loaded, getStats,
    update(elapsed: number) { time.value = elapsed; },
    dispose() {
      disposed = true; scene.remove(root);
      meshes.forEach(mesh => mesh.dispose()); geometries.forEach(geometry=>geometry.dispose()); materials.forEach(material=>material.dispose()); textures.forEach(texture=>texture.dispose());
    },
  };
}
