"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { createGeneratedAssetLibrary } from "./generated-assets";
import { buildIndustrialPipeSystem, PIPE_VALVE_MOUNTS } from "./industrial-pipes";
import { EVIDENCE_POINTS, type DecisionId, type EvidenceId, type ScenarioPhase } from "./scenario-data";

const VERCEL_ASSET_CDN = "https://cdn.jsdelivr.net/gh/TheFiregram/RiskMulate@6488af39d2837b2ba49b6de9c94b41d954e592e6/apps/factory-shift/public";

function assetUrl(path: string) {
  return window.location.hostname.endsWith(".vercel.app") ? `${VERCEL_ASSET_CDN}${path}` : path;
}

export type TouchControls = {
  forward: number;
  side: number;
  yawDelta: number;
  pitchDelta: number;
};

type FactorySceneProps = {
  started: boolean;
  tabletOpen: boolean;
  scenarioPhase: ScenarioPhase;
  captured: EvidenceId[];
  decision: DecisionId | null;
  touchControls: RefObject<TouchControls>;
  onNearChange: (near: boolean, distance: number) => void;
  onTargetChange: (target: EvidenceId | null, distance: number) => void;
};

type InspectionMarker = {
  id: EvidenceId;
  range: number;
  group: THREE.Group;
  hitbox: THREE.Mesh;
  ring: THREE.Mesh;
  core: THREE.Mesh;
  label: THREE.Sprite;
  texture: THREE.CanvasTexture;
};

type Materials = {
  steel: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  paintedTeal: THREE.MeshStandardMaterial;
  paintedOrange: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  warningRed: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
};

function makeMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
  shadows = true,
) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.castShadow = shadows;
  object.receiveShadow = shadows;
  return object;
}

function prepareImportedModel(root: THREE.Object3D, targetHeight: number, floorAligned = true) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const wrapper = new THREE.Group();
  wrapper.add(root);
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= floorAligned ? bounds.min.y : center.y;
  wrapper.scale.setScalar(targetHeight / Math.max(size.y, 0.001));
  wrapper.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    meshMaterials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      material.envMapIntensity = 0.85;
      for (const texture of [material.map, material.normalMap, material.roughnessMap, material.metalnessMap]) {
        if (texture) texture.anisotropy = 4;
      }
    });
  });
  return wrapper;
}

function pipeBetween(
  parent: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  segments = 16,
) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const pipe = makeMesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), segments),
    material,
    [0, 0, 0],
  );
  pipe.position.copy(from).add(to).multiplyScalar(0.5);
  pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  parent.add(pipe);
  return pipe;
}

function createConcreteTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#59635f";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 11500; i += 1) {
    const shade = 68 + Math.floor(Math.random() * 45);
    ctx.fillStyle = `rgba(${shade},${shade + 7},${shade + 4},${Math.random() * 0.17})`;
    const size = Math.random() * 2.2 + 0.3;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, size, size);
  }
  ctx.strokeStyle = "rgba(25,35,33,.27)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.lineTo(512, 18);
  ctx.moveTo(18, 0);
  ctx.lineTo(18, 512);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createRadialTexture(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 4, 128, 128, 125);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.18, color);
  gradient.addColorStop(0.55, "rgba(255,255,255,.16)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSign(text: string, accent = "#f0a128", width = 700) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 180;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(12, 22, 22, .94)";
  ctx.fillRect(8, 8, width - 16, 164);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 7;
  ctx.strokeRect(8, 8, width - 16, 164);
  ctx.fillStyle = "#e8eeeb";
  ctx.font = "800 62px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, 92);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true }));
  sprite.scale.set(4.1, 1.05, 1);
  return sprite;
}

function createInspectionMarker(
  point: (typeof EVIDENCE_POINTS)[number],
  amber: THREE.ColorRepresentation,
): InspectionMarker {
  const group = new THREE.Group();
  group.position.set(...point.position);
  group.renderOrder = 12;

  const markerMaterial = new THREE.MeshBasicMaterial({
    color: amber,
    transparent: true,
    opacity: 0.92,
    depthTest: false,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.022, 8, 32), markerMaterial);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), markerMaterial.clone());
  core.rotation.z = Math.PI / 4;
  group.add(ring, core);

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(6, 14, 15, .9)";
  ctx.fillRect(0, 8, 496, 96);
  ctx.fillStyle = "#f1a22a";
  ctx.fillRect(0, 8, 8, 96);
  ctx.strokeStyle = "rgba(241, 162, 42, .7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 9, 494, 94);
  ctx.fillStyle = "#f1a22a";
  ctx.font = "800 29px Arial";
  ctx.fillText(point.code, 28, 56);
  ctx.fillStyle = "#e8efed";
  ctx.font = "700 22px Arial";
  ctx.fillText(point.worldLabel, 88, 55);
  ctx.fillStyle = "#82928f";
  ctx.font = "600 14px Arial";
  ctx.fillText("INSPECTION POINT", 88, 79);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }));
  const labelX = point.id === "EV-02" ? -1.3 : 1.3;
  const labelY = point.id === "EV-01" ? 0.86 : point.id === "EV-02" ? 0.22 : 0.5;
  label.position.set(labelX, labelY, 0);
  label.scale.set(2.65, 0.58, 1);
  label.renderOrder = 13;
  group.add(label);

  const hitbox = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, 12, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hitbox.userData.evidenceId = point.id;
  group.add(hitbox);

  return { id: point.id, range: point.range, group, hitbox, ring, core, label, texture };
}

function createGauge(materials: Materials) {
  const gauge = new THREE.Group();
  gauge.add(makeMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 32), materials.brass, [0, 0, 0], [Math.PI / 2, 0, 0]));
  const face = new THREE.MeshStandardMaterial({ color: 0xe6e0cf, roughness: 0.7 });
  gauge.add(makeMesh(new THREE.CircleGeometry(0.34, 32), face, [0, 0, 0.1], [0, 0, 0]));
  const ticks = new THREE.Group();
  for (let i = 0; i < 11; i += 1) {
    const angle = -2.35 + i * 0.47;
    const tick = makeMesh(new THREE.BoxGeometry(0.025, 0.09, 0.015), materials.darkSteel, [Math.sin(angle) * 0.25, Math.cos(angle) * 0.25, 0.115], [0, 0, -angle]);
    ticks.add(tick);
  }
  gauge.add(ticks);
  const needle = makeMesh(new THREE.BoxGeometry(0.025, 0.25, 0.018), materials.warningRed, [0, -0.08, 0.13], [0, 0, -0.72]);
  needle.geometry.translate(0, 0.12, 0);
  gauge.add(needle);
  return { gauge, needle };
}

function buildHeroPump(parent: THREE.Object3D, materials: Materials, x: number, z: number, standby = false) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const accent = standby ? new THREE.MeshStandardMaterial({ color: 0x3b8e79, roughness: 0.38, metalness: 0.48 }) : materials.paintedOrange;

  group.add(makeMesh(new THREE.BoxGeometry(5.9, 0.3, 3.4), materials.darkSteel, [0, 0.2, 0]));
  group.add(makeMesh(new THREE.BoxGeometry(5.25, 0.18, 2.85), materials.concrete, [0, 0.46, 0]));
  for (const bx of [-2.3, 2.3]) {
    for (const bz of [-1.1, 1.1]) group.add(makeMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.25, 12), materials.brass, [bx, 0.62, bz]));
  }

  const motor = new THREE.Group();
  motor.position.set(-1.05, 1.65, 0);
  motor.add(makeMesh(new THREE.CylinderGeometry(0.88, 0.88, 2.75, 32), materials.paintedTeal, [0, 0, 0], [0, 0, Math.PI / 2]));
  motor.add(makeMesh(new THREE.CylinderGeometry(0.72, 0.72, 0.28, 32), materials.darkSteel, [-1.5, 0, 0], [0, 0, Math.PI / 2]));
  for (let i = -5; i <= 5; i += 1) {
    motor.add(makeMesh(new THREE.TorusGeometry(0.91, 0.035, 7, 30), materials.darkSteel, [i * 0.22, 0, 0], [0, Math.PI / 2, 0]));
  }
  const terminal = makeMesh(new THREE.BoxGeometry(0.82, 0.5, 0.68), materials.darkSteel, [-0.35, 0.95, 0]);
  motor.add(terminal);
  group.add(motor);

  const pumpBody = new THREE.Group();
  pumpBody.position.set(1.3, 1.55, 0);
  const volute = makeMesh(new THREE.SphereGeometry(1.08, 32, 20), materials.steel, [0, 0, 0]);
  volute.scale.set(1.05, 1.1, 0.82);
  pumpBody.add(volute);
  pumpBody.add(makeMesh(new THREE.TorusGeometry(0.86, 0.1, 10, 34), accent, [0, 0, 0.77], [0, 0, 0]));
  pumpBody.add(makeMesh(new THREE.CylinderGeometry(0.52, 0.52, 1.25, 24), materials.steel, [0.1, 1.24, 0], [0, 0, 0]));
  pumpBody.add(makeMesh(new THREE.CylinderGeometry(0.72, 0.72, 0.18, 24), accent, [0.1, 1.88, 0]));
  pumpBody.add(makeMesh(new THREE.CylinderGeometry(0.44, 0.44, 1.25, 24), materials.steel, [1.38, 0.02, 0], [0, 0, Math.PI / 2]));
  pumpBody.add(makeMesh(new THREE.CylinderGeometry(0.65, 0.65, 0.18, 24), accent, [2.02, 0.02, 0], [0, 0, Math.PI / 2]));
  group.add(pumpBody);

  const coupling = makeMesh(new THREE.BoxGeometry(0.82, 0.9, 1.15), accent, [0.36, 1.45, 0]);
  coupling.rotation.z = 0.03;
  group.add(coupling);
  const statusBulb = makeMesh(new THREE.SphereGeometry(0.12, 18, 12), standby ? materials.glass : materials.warningRed, [0.36, 2.05, 0.48]);
  group.add(statusBulb);

  const { gauge, needle } = createGauge(materials);
  gauge.position.set(1.55, 3.25, 0.72);
  gauge.rotation.set(-0.08, 0, 0);
  group.add(gauge);
  pipeBetween(group, new THREE.Vector3(1.55, 2.45, 0), new THREE.Vector3(1.55, 3.05, 0.45), 0.08, materials.brass, 10);

  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.4, 2.4, -0.42),
    new THREE.Vector3(-1.8, 1.2, -1.2),
    new THREE.Vector3(-2.3, 0.55, -1.0),
  ]);
  group.add(makeMesh(new THREE.TubeGeometry(cableCurve, 18, 0.055, 8, false), materials.rubber, [0, 0, 0]));

  const sign = createSign(standby ? "P-205 · STANDBY" : "P-204 · DEGRADED", standby ? "#50b997" : "#f0a128");
  sign.position.set(0, 4.15, 0);
  sign.scale.set(standby ? 4.5 : 4.25, 1.02, 1);
  group.add(sign);
  parent.add(group);
  return { group, motor, pumpBody, needle, statusBulb };
}

function addTank(parent: THREE.Object3D, materials: Materials, x: number, z: number, title: string) {
  const tank = new THREE.Group();
  tank.position.set(x, 0, z);
  tank.add(makeMesh(new THREE.CylinderGeometry(3.65, 3.65, 8.6, 42), materials.steel, [0, 5.5, 0]));
  tank.add(makeMesh(new THREE.SphereGeometry(3.66, 42, 14, 0, Math.PI * 2, 0, Math.PI / 2), materials.steel, [0, 9.8, 0]));
  for (const y of [2.4, 5.5, 8.6]) tank.add(makeMesh(new THREE.TorusGeometry(3.69, 0.085, 8, 48), materials.paintedTeal, [0, y, 0], [Math.PI / 2, 0, 0]));
  for (const lx of [-2.25, 2.25]) tank.add(makeMesh(new THREE.BoxGeometry(0.42, 2.5, 0.42), materials.darkSteel, [lx, 1.25, 0]));
  const label = createSign(title, "#6cc3ad");
  label.position.set(0, 6, 3.68);
  label.scale.set(3.1, 0.79, 1);
  tank.add(label);
  for (let y = 1.7; y < 8.6; y += 0.48) tank.add(makeMesh(new THREE.BoxGeometry(1, 0.07, 0.09), materials.brass, [2.9, y, 3.0], [0, 0, -0.1], false));
  parent.add(tank);
}

function addTree(parent: THREE.Object3D, x: number, z: number, scale: number, warm = false) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x453d32, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: warm ? 0x53672f : 0x315a45, roughness: 0.96 });
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  tree.add(makeMesh(new THREE.CylinderGeometry(0.16, 0.26, 2.1, 7), trunkMat, [0, 1, 0], [0, 0, 0], false));
  tree.add(makeMesh(new THREE.ConeGeometry(1.15, 3.3, 8), leafMat, [0, 3.0, 0], [0, 0.3, 0], false));
  tree.add(makeMesh(new THREE.ConeGeometry(0.87, 2.7, 8), leafMat, [0, 4.2, 0], [0, -0.2, 0], false));
  parent.add(tree);
}

function addFallback(mount: HTMLDivElement) {
  const fallback = document.createElement("div");
  fallback.className = "fallback-scene fallback-sunrise";
  fallback.innerHTML = `
    <div class="fallback-sun"></div><div class="fallback-mountains back"></div><div class="fallback-mountains front"></div>
    <div class="fallback-canopy"><i></i><i></i><i></i><i></i></div>
    <div class="fallback-pipes"><i></i><i></i><i></i></div>
    <div class="fallback-tank tank-a"><b>FILTER A</b></div><div class="fallback-tank tank-b"><b>FILTER B</b></div>
    <div class="fallback-pump hero"><span>P-204 · DEGRADED</span><i></i><b></b></div>
    <div class="fallback-floor"></div><div class="fallback-haze"></div>`;
  mount.appendChild(fallback);
  return () => fallback.remove();
}

export default function FactoryScene({
  started,
  tabletOpen,
  scenarioPhase,
  captured,
  decision,
  touchControls,
  onNearChange,
  onTargetChange,
}: FactorySceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(started);
  const tabletRef = useRef(tabletOpen);
  const phaseRef = useRef(scenarioPhase);
  const capturedRef = useRef(captured);
  const decisionRef = useRef(decision);

  useEffect(() => { startedRef.current = started; }, [started]);
  useEffect(() => { phaseRef.current = scenarioPhase; }, [scenarioPhase]);
  useEffect(() => { capturedRef.current = captured; }, [captured]);
  useEffect(() => { decisionRef.current = decision; }, [decision]);
  useEffect(() => {
    tabletRef.current = tabletOpen;
    if (tabletOpen && document.pointerLockElement) document.exitPointerLock();
  }, [tabletOpen]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const webglCanvas = document.createElement("canvas");
    const context = webglCanvas.getContext("webgl2", { antialias: true, alpha: false }) ?? webglCanvas.getContext("webgl", { antialias: true, alpha: false });
    if (!context) return addFallback(mount);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: webglCanvas, context, antialias: true, powerPreference: "high-performance" });
    } catch {
      return addFallback(mount);
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb88f78);
    scene.fog = new THREE.Fog(0x98aaa0, 34, 142);
    const camera = new THREE.PerspectiveCamera(66, 1, 0.08, 220);
    camera.position.set(0, 1.72, 15.5);
    camera.rotation.order = "YXZ";

    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const renderPixelRatio = Math.min(window.devicePixelRatio, coarsePointer ? 1.1 : 1.4);
    renderer.setPixelRatio(renderPixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.setAttribute("aria-label", "First-person view of an open-air filtration facility at sunrise");
    mount.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(mount.clientWidth, mount.clientHeight),
      coarsePointer ? 0.16 : 0.28,
      0.55,
      0.76,
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(185, 32, 18),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x244558) },
          middleColor: { value: new THREE.Color(0x789da0) },
          horizonColor: { value: new THREE.Color(0xf2b47e) },
        },
        vertexShader: "varying vec3 vWorld; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vWorld=w.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: "uniform vec3 topColor; uniform vec3 middleColor; uniform vec3 horizonColor; varying vec3 vWorld; void main(){ float h=normalize(vWorld).y; vec3 low=mix(horizonColor,middleColor,smoothstep(-0.05,0.30,h)); vec3 col=mix(low,topColor,smoothstep(0.28,0.82,h)); gl_FragColor=vec4(col,1.0); }",
      }),
    );
    scene.add(sky);
    const sunTexture = createRadialTexture("rgba(255,235,183,1)");
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sun.position.set(-35, 18, -92);
    sun.scale.set(25, 25, 1);
    scene.add(sun);

    scene.add(new THREE.HemisphereLight(0xb9d2cc, 0x3f342a, 2.4));
    const sunlight = new THREE.DirectionalLight(0xffd0a1, 4.3);
    sunlight.position.set(-32, 30, -24);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(2048, 2048);
    sunlight.shadow.camera.left = -38;
    sunlight.shadow.camera.right = 38;
    sunlight.shadow.camera.top = 38;
    sunlight.shadow.camera.bottom = -38;
    sunlight.shadow.camera.near = 1;
    sunlight.shadow.camera.far = 100;
    sunlight.shadow.bias = -0.00012;
    scene.add(sunlight);
    const coolFill = new THREE.DirectionalLight(0x72aeb4, 1.25);
    coolFill.position.set(28, 12, 18);
    scene.add(coolFill);

    const concreteTexture = createConcreteTexture();
    const materials: Materials = {
      steel: new THREE.MeshStandardMaterial({ color: 0x71807b, roughness: 0.34, metalness: 0.72 }),
      darkSteel: new THREE.MeshStandardMaterial({ color: 0x182725, roughness: 0.48, metalness: 0.68 }),
      paintedTeal: new THREE.MeshStandardMaterial({ color: 0x2d6f69, roughness: 0.38, metalness: 0.46 }),
      paintedOrange: new THREE.MeshStandardMaterial({ color: 0xe49328, emissive: 0x391600, emissiveIntensity: 0.22, roughness: 0.36, metalness: 0.38 }),
      concrete: new THREE.MeshStandardMaterial({ color: 0x65706b, map: concreteTexture, roughness: 0.84, metalness: 0.04 }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x101817, roughness: 0.93, metalness: 0.02 }),
      brass: new THREE.MeshStandardMaterial({ color: 0x9c7b43, roughness: 0.38, metalness: 0.78 }),
      warningRed: new THREE.MeshStandardMaterial({ color: 0xd94e37, emissive: 0x5c1107, emissiveIntensity: 1.15, roughness: 0.3 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0x7ee1c7, roughness: 0.12, metalness: 0.04, transmission: 0.2, transparent: true, opacity: 0.86 }),
    };
    const pipeTeal = new THREE.MeshStandardMaterial({ color: 0x2b756d, roughness: 0.48, metalness: 0.52, envMapIntensity: 1.05 });
    const pipeOrange = new THREE.MeshStandardMaterial({ color: 0xdf8422, roughness: 0.5, metalness: 0.5, envMapIntensity: 1.05 });
    const yardMaterial = new THREE.MeshStandardMaterial({ color: 0x8d9893, map: concreteTexture, roughness: 0.9, metalness: 0.02 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x425a3e, roughness: 0.98 });
    const mountainBack = new THREE.MeshStandardMaterial({ color: 0x617b76, roughness: 1, fog: true });
    const mountainFront = new THREE.MeshStandardMaterial({ color: 0x405e55, roughness: 1, fog: true });
    const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x356d70, roughness: 0.16, metalness: 0.28, transparent: true, opacity: 0.82 });
    const assetLibrary = createGeneratedAssetLibrary();
    const gltfLoader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    let disposed = false;
    let importedHeroPump: THREE.Group | null = null;
    let environmentTexture: THREE.DataTexture | null = null;
    const surfaceTextures: THREE.Texture[] = [];
    const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

    const loadSurfaceTexture = (
      url: string,
      repeat: number,
      colorTexture: boolean,
      apply: (texture: THREE.Texture) => void,
    ) => {
      textureLoader.load(assetUrl(url), (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeat, repeat);
        texture.anisotropy = anisotropy;
        if (colorTexture) texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        surfaceTextures.push(texture);
        apply(texture);
      });
    };

    loadSurfaceTexture("/textures/ambientcg/asphalt014-color.webp", 8, true, (texture) => {
      yardMaterial.map = texture;
      yardMaterial.color.set(0xffffff);
      yardMaterial.needsUpdate = true;
    });
    loadSurfaceTexture("/textures/ambientcg/asphalt014-normal.webp", 8, false, (texture) => {
      yardMaterial.normalMap = texture;
      yardMaterial.normalScale.set(0.32, 0.32);
      yardMaterial.needsUpdate = true;
    });
    loadSurfaceTexture("/textures/ambientcg/asphalt014-roughness.webp", 8, false, (texture) => {
      yardMaterial.roughnessMap = texture;
      yardMaterial.roughness = 0.94;
      yardMaterial.needsUpdate = true;
    });
    loadSurfaceTexture("/textures/ambientcg/ground037-color.webp", 32, true, (texture) => {
      grassMat.map = texture;
      grassMat.color.set(0xffffff);
      grassMat.needsUpdate = true;
    });
    loadSurfaceTexture("/textures/ambientcg/ground037-normal.webp", 32, false, (texture) => {
      grassMat.normalMap = texture;
      grassMat.normalScale.set(0.42, 0.42);
      grassMat.needsUpdate = true;
    });
    loadSurfaceTexture("/textures/ambientcg/ground037-roughness.webp", 32, false, (texture) => {
      grassMat.roughnessMap = texture;
      grassMat.needsUpdate = true;
    });
    loadSurfaceTexture("/textures/ambientcg/paintedmetal006-color.webp", 2, true, (texture) => {
      pipeTeal.map = texture;
      pipeTeal.color.set(0xa2aaa7);
      pipeTeal.needsUpdate = true;
    });
    loadSurfaceTexture("/textures/ambientcg/paintedmetal006-normal.webp", 2, false, (texture) => {
      pipeTeal.normalMap = texture;
      pipeTeal.normalScale.set(0.36, 0.36);
      pipeTeal.needsUpdate = true;
    });
    loadSurfaceTexture("/textures/ambientcg/paintedmetal006-roughness.webp", 2, false, (texture) => {
      pipeTeal.roughnessMap = texture;
      pipeTeal.roughness = 0.7;
      pipeTeal.needsUpdate = true;
    });
    loadSurfaceTexture("/textures/ambientcg/paintedmetal006-metalness.webp", 2, false, (texture) => {
      pipeTeal.metalnessMap = texture;
      pipeTeal.metalness = 0.72;
      pipeTeal.needsUpdate = true;
    });
    loadSurfaceTexture("/textures/ambientcg/paintedmetal008-color.webp", 2, true, (texture) => {
      pipeOrange.map = texture;
      pipeOrange.color.set(0xb7a28c);
      pipeOrange.needsUpdate = true;
    });
    loadSurfaceTexture("/textures/ambientcg/paintedmetal008-normal.webp", 2, false, (texture) => {
      pipeOrange.normalMap = texture;
      pipeOrange.normalScale.set(0.34, 0.34);
      pipeOrange.needsUpdate = true;
    });
    loadSurfaceTexture("/textures/ambientcg/paintedmetal008-roughness.webp", 2, false, (texture) => {
      pipeOrange.roughnessMap = texture;
      pipeOrange.roughness = 0.68;
      pipeOrange.needsUpdate = true;
    });
    loadSurfaceTexture("/textures/ambientcg/paintedmetal008-metalness.webp", 2, false, (texture) => {
      pipeOrange.metalnessMap = texture;
      pipeOrange.metalness = 0.7;
      pipeOrange.needsUpdate = true;
    });

    new RGBELoader().load(assetUrl("/hdri/overcast-industrial-courtyard-1k.hdr"), (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
      scene.environmentIntensity = 0.62;
      scene.environmentRotation.set(0, -0.72, 0);
      environmentTexture = texture;
    });

    scene.add(makeMesh(new THREE.PlaneGeometry(180, 180), grassMat, [0, -0.08, -18], [-Math.PI / 2, 0, 0]));
    const yard = makeMesh(new THREE.PlaneGeometry(59, 58), yardMaterial, [0, 0, -4], [-Math.PI / 2, 0, 0]);
    scene.add(yard);
    const drainage = makeMesh(new THREE.PlaneGeometry(6.5, 58), waterMat, [24, 0.02, -4], [-Math.PI / 2, 0, 0]);
    scene.add(drainage);

    for (const [x, z, sx, sz] of [[-8, 5, 2.2, 1.1], [5.5, -2, 2.8, 1.4], [-14, -15, 3.4, 1.2], [10, 10, 1.7, 0.8]] as const) {
      const puddle = makeMesh(new THREE.CircleGeometry(1, 34), waterMat.clone(), [x, 0.025, z], [-Math.PI / 2, 0, 0], false);
      puddle.scale.set(sx, sz, 1);
      (puddle.material as THREE.MeshPhysicalMaterial).opacity = 0.36;
      scene.add(puddle);
    }

    for (let i = 0; i < 12; i += 1) {
      const stripe = makeMesh(new THREE.BoxGeometry(0.58, 0.025, 6.8), i % 2 ? materials.darkSteel : materials.paintedOrange, [-5.8 + i * 1.05, 0.035, -10], [0, -0.48, 0]);
      scene.add(stripe);
    }
    for (const z of [12.5, -1.5, -16]) {
      scene.add(makeMesh(new THREE.BoxGeometry(24, 0.025, 0.14), materials.paintedOrange, [0, 0.04, z]));
      scene.add(makeMesh(new THREE.BoxGeometry(24, 0.022, 0.07), materials.steel, [0, 0.045, z - 0.28]));
    }

    for (let i = 0; i < 13; i += 1) {
      const radius = 12 + (i % 4) * 2.25;
      const height = 28 + ((i * 7) % 19);
      const x = -96 + i * 16;
      const z = -78 - (i % 3) * 11;
      const mountain = makeMesh(new THREE.ConeGeometry(radius, height, 7), i % 2 ? mountainBack : mountainFront, [x, height / 2 - 1.5, z], [0, i * 0.63, 0], false);
      mountain.scale.z = 1.28;
      scene.add(mountain);
    }
    for (let i = 0; i < 30; i += 1) {
      const side = i % 2 ? 1 : -1;
      addTree(scene, side * (31 + Math.random() * 28), -42 + Math.random() * 75, 0.8 + Math.random() * 1.7, i % 3 === 0);
    }
    const animatedTrees: THREE.Group[] = [];
    for (let i = 0; i < 14; i += 1) {
      const side = i % 2 ? 1 : -1;
      const tree = i % 4 === 0 ? assetLibrary.broadleafTree(30 + i, 0.78 + (i % 3) * 0.13) : assetLibrary.pineTree(30 + i, 0.68 + (i % 4) * 0.1);
      tree.position.set(side * (27.8 + (i % 3) * 2.4), 0, 21 - i * 4.1);
      scene.add(tree);
      animatedTrees.push(tree);
    }
    for (let i = 0; i < 34; i += 1) {
      const patch = assetLibrary.grassPatch(90 + i, 0.7 + (i % 5) * 0.11);
      const side = i % 2 ? 1 : -1;
      patch.position.set(side * (26.2 + (i % 4) * 1.1), 0, 27 - i * 1.8);
      patch.rotation.y = i * 1.71;
      scene.add(patch);
    }

    const facility = new THREE.Group();
    scene.add(facility);
    for (const x of [-19, -10, 0, 10, 19]) {
      facility.add(makeMesh(new THREE.BoxGeometry(0.48, 10.5, 0.48), materials.darkSteel, [x, 5.25, -6]));
      facility.add(makeMesh(new THREE.BoxGeometry(0.48, 10.5, 0.48), materials.darkSteel, [x, 5.25, -19]));
      facility.add(makeMesh(new THREE.BoxGeometry(9.65, 0.42, 0.5), materials.steel, [x + 4.8, 10.1, -6]));
    }
    for (const z of [-19, -14.7, -10.3, -6]) facility.add(makeMesh(new THREE.BoxGeometry(39, 0.28, 0.36), materials.steel, [0, 9.95, z]));
    for (let x = -18; x <= 18; x += 3) facility.add(makeMesh(new THREE.BoxGeometry(2.35, 0.12, 13.2), materials.darkSteel, [x, 10.25, -12.5], [0, 0, 0], false));

    addTank(facility, materials, -16.5, -27, "FILTER A");
    addTank(facility, materials, 16.5, -27, "FILTER B");

    const hero = buildHeroPump(facility, materials, 0, -10, false);
    const standby = buildHeroPump(facility, materials, 9, -10.5, true);
    standby.group.scale.setScalar(0.85);
    const pipeSystem = buildIndustrialPipeSystem(facility, {
      teal: pipeTeal,
      orange: pipeOrange,
      steel: materials.steel,
      darkSteel: materials.darkSteel,
      concrete: materials.concrete,
      rubber: materials.rubber,
      brass: materials.brass,
      warningRed: materials.warningRed,
    });

    const proceduralValves: THREE.Object3D[] = [];
    for (const mount of PIPE_VALVE_MOUNTS) {
      const [x, y, z] = mount.position;
      const fallbackValve = new THREE.Group();
      fallbackValve.position.set(x, y, z);
      fallbackValve.rotation.set(...mount.rotation);
      const valveBody = makeMesh(new THREE.SphereGeometry(0.52, 24, 16), materials.steel, [0, 0, 0]);
      valveBody.scale.set(1.18, 0.82, 0.82);
      fallbackValve.add(valveBody);
      fallbackValve.add(makeMesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 24), materials.darkSteel, [-0.68, 0, 0], [0, 0, Math.PI / 2]));
      fallbackValve.add(makeMesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 24), materials.darkSteel, [0.68, 0, 0], [0, 0, Math.PI / 2]));
      fallbackValve.add(makeMesh(new THREE.CylinderGeometry(0.12, 0.16, 0.76, 14), materials.brass, [0, 0.65, 0]));
      const wheel = makeMesh(new THREE.TorusGeometry(0.58, 0.07, 8, 28), materials.warningRed, [0, 1.02, 0]);
      fallbackValve.add(wheel);
      for (let i = 0; i < 4; i += 1) {
        fallbackValve.add(makeMesh(new THREE.BoxGeometry(1.02, 0.065, 0.065), materials.warningRed, [0, 1.02, 0], [0, 0, i * Math.PI / 4]));
      }
      facility.add(fallbackValve);
      proceduralValves.push(fallbackValve);
    }

    const inspectionHardware = new THREE.Group();
    inspectionHardware.name = "P-204 inspection hardware";
    const sensorScreen = new THREE.MeshStandardMaterial({ color: 0x1a2624, emissive: 0xf19b24, emissiveIntensity: 1.5, roughness: 0.28, metalness: 0.32 });
    const sensorBody = new THREE.MeshStandardMaterial({ color: 0x273632, roughness: 0.62, metalness: 0.56 });
    inspectionHardware.add(makeMesh(new THREE.BoxGeometry(0.36, 0.44, 0.22), sensorBody, [-0.35, 2.18, -8.82]));
    inspectionHardware.add(makeMesh(new THREE.BoxGeometry(0.23, 0.2, 0.025), sensorScreen, [-0.35, 2.2, -8.69], [0, 0, 0], false));
    pipeBetween(inspectionHardware, new THREE.Vector3(-0.35, 1.98, -8.82), new THREE.Vector3(-0.72, 1.58, -9.03), 0.025, materials.rubber, 8);
    inspectionHardware.add(makeMesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 18), materials.brass, [-1.4, 1.72, -8.83], [Math.PI / 2, 0, 0]));
    inspectionHardware.add(makeMesh(new THREE.CircleGeometry(0.12, 18), sensorScreen, [-1.4, 1.72, -8.755], [0, 0, 0], false));
    const drainTray = makeMesh(new THREE.BoxGeometry(1.05, 0.08, 0.72), materials.darkSteel, [2.26, 0.5, -9.02]);
    inspectionHardware.add(drainTray);
    const wetPatchMaterial = new THREE.MeshPhysicalMaterial({ color: 0x405f62, roughness: 0.14, metalness: 0.18, transparent: true, opacity: 0.78 });
    const wetPatch = makeMesh(new THREE.CircleGeometry(0.43, 28), wetPatchMaterial, [2.25, 0.548, -9.01], [-Math.PI / 2, 0, 0], false);
    wetPatch.scale.set(1.3, 0.64, 1);
    inspectionHardware.add(wetPatch);
    const readyLampMaterial = new THREE.MeshStandardMaterial({ color: 0x59d7ad, emissive: 0x1b8e6c, emissiveIntensity: 2.2, roughness: 0.24, metalness: 0.18 });
    inspectionHardware.add(makeMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.48, 12), materials.darkSteel, [5.55, 2.1, -9.98]));
    inspectionHardware.add(makeMesh(new THREE.SphereGeometry(0.15, 16, 10), readyLampMaterial, [5.55, 2.4, -9.98]));
    facility.add(inspectionHardware);

    const markerRoot = new THREE.Group();
    markerRoot.name = "Inspection markers";
    const inspectionMarkers = EVIDENCE_POINTS.map((point) => createInspectionMarker(point, 0xf1a22a));
    inspectionMarkers.forEach((marker) => markerRoot.add(marker.group));
    scene.add(markerRoot);

    const p204BeaconMaterial = new THREE.MeshStandardMaterial({ color: 0xff8738, emissive: 0xdd3c0d, emissiveIntensity: 2.5, roughness: 0.2 });
    const p205BeaconMaterial = new THREE.MeshStandardMaterial({ color: 0x33554c, emissive: 0x173b32, emissiveIntensity: 0.4, roughness: 0.25 });
    const p204Beacon = makeMesh(new THREE.SphereGeometry(0.16, 18, 12), p204BeaconMaterial, [0.2, 3.78, -8.9]);
    const p205Beacon = makeMesh(new THREE.SphereGeometry(0.16, 18, 12), p205BeaconMaterial, [9.05, 3.5, -9.28]);
    facility.add(p204Beacon, p205Beacon);
    const p204SignalLight = new THREE.PointLight(0xff6732, 7, 6, 2.2);
    p204SignalLight.position.copy(p204Beacon.position);
    const p205SignalLight = new THREE.PointLight(0x5ce0b5, 0, 7, 2.2);
    p205SignalLight.position.copy(p205Beacon.position);
    facility.add(p204SignalLight, p205SignalLight);

    const railGroup = new THREE.Group();
    for (const x of [-21.5, 21.5]) {
      pipeBetween(railGroup, new THREE.Vector3(x, 0.1, -28), new THREE.Vector3(x, 0.1, 25), 0.07, materials.paintedOrange, 10);
      pipeBetween(railGroup, new THREE.Vector3(x, 1.1, -28), new THREE.Vector3(x, 1.1, 25), 0.065, materials.paintedOrange, 10);
      for (let z = -28; z <= 25; z += 3.2) railGroup.add(makeMesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8), materials.paintedOrange, [x, 0.55, z]));
    }
    scene.add(railGroup);

    const barrels = [assetLibrary.barrel(1), assetLibrary.barrel(2, true), assetLibrary.barrel(3)];
    barrels[0].position.set(-11, 0, 2);
    barrels[1].position.set(-10.05, 0, 2.28);
    barrels[2].position.set(13.5, 0, 3);
    barrels[2].rotation.z = -0.035;
    barrels.forEach((barrel) => scene.add(barrel));
    const palletA = assetLibrary.pallet(11);
    palletA.position.set(-10.5, 0, 3.15);
    palletA.rotation.y = 0.08;
    scene.add(palletA);
    const crateA = assetLibrary.equipmentCrate(14);
    crateA.position.set(15, 0, 7.5);
    crateA.rotation.y = -0.32;
    scene.add(crateA);
    const crateB = assetLibrary.equipmentCrate(15);
    crateB.position.set(16.5, 0, 8.2);
    crateB.rotation.y = 0.18;
    crateB.scale.setScalar(0.78);
    scene.add(crateB);
    const proceduralCones: THREE.Group[] = [];
    for (let i = 0; i < 5; i += 1) {
      const cone = assetLibrary.trafficCone(21 + i, 0.72 + (i % 2) * 0.08);
      cone.position.set(-5 + i * 1.1, 0, 7.5);
      cone.rotation.y = i * 0.81;
      scene.add(cone);
      proceduralCones.push(cone);
    }
    const barrierA = assetLibrary.safetyBarrier(31);
    barrierA.position.set(-7.1, 0, 7.65);
    barrierA.rotation.y = -0.06;
    scene.add(barrierA);
    const barrierB = assetLibrary.safetyBarrier(32);
    barrierB.position.set(18.7, 0, -14.8);
    barrierB.rotation.y = Math.PI / 2;
    barrierB.scale.setScalar(0.82);
    scene.add(barrierB);
    const extinguisher = new THREE.Group();
    extinguisher.position.set(14.5, 0, -3);
    extinguisher.add(makeMesh(new THREE.CylinderGeometry(0.28, 0.3, 1.2, 18), materials.warningRed, [0, 0.62, 0]));
    extinguisher.add(makeMesh(new THREE.BoxGeometry(0.32, 0.18, 0.22), materials.darkSteel, [0, 1.28, 0]));
    scene.add(extinguisher);

    gltfLoader.load(assetUrl("/models/p204-pump.glb"), (gltf) => {
      if (disposed) return;
      const model = prepareImportedModel(gltf.scene, 3.45);
      model.name = "Meshy P-204 centrifugal pump";
      model.position.set(0, 0.08, -10);
      facility.add(model);
      importedHeroPump = model;
      hero.group.traverse((object) => {
        if (object instanceof THREE.Mesh) object.visible = false;
      });
    });

    gltfLoader.load(assetUrl("/models/industrial-valve.glb"), (gltf) => {
      if (disposed) return;
      const template = prepareImportedModel(gltf.scene, 1.82, false);
      template.name = "Meshy industrial gate valve";
      for (const [index, mount] of PIPE_VALVE_MOUNTS.entries()) {
        const valve = index === 0 ? template : template.clone(true);
        valve.position.set(...mount.position);
        valve.rotation.set(...mount.rotation);
        facility.add(valve);
      }
      proceduralValves.forEach((object) => { object.visible = false; });
    });

    gltfLoader.load(assetUrl("/models/traffic-cone.glb"), (gltf) => {
      if (disposed) return;
      const template = prepareImportedModel(gltf.scene, 0.86);
      template.name = "Meshy weathered traffic cone";
      for (let i = 0; i < 5; i += 1) {
        const cone = i === 0 ? template : template.clone(true);
        cone.position.set(-5 + i * 1.1, 0, 7.5);
        cone.rotation.y = i * 0.81;
        scene.add(cone);
      }
      proceduralCones.forEach((cone) => { cone.visible = false; });
    });

    gltfLoader.load(assetUrl("/models/polyhaven-rock-09.glb"), (gltf) => {
      if (disposed) return;
      const template = prepareImportedModel(gltf.scene, 1.05);
      template.name = "Poly Haven weathered rock";
      const placements = [
        [-29.5, 20.5, 1.1, 0.2], [-31, 5, 1.65, 1.4], [-29.2, -18, 1.25, 2.6],
        [29.5, 22, 1.45, 0.8], [31.5, 3, 1.1, 2.1], [30.5, -21, 1.85, 3.4],
        [-19, 30.5, 0.85, 1.9], [19.5, 30, 1.2, 2.9],
      ] as const;
      placements.forEach(([x, z, scale, rotation], index) => {
        const rock = index === 0 ? template : template.clone(true);
        rock.position.set(x, 0, z);
        rock.rotation.y = rotation;
        rock.scale.multiplyScalar(scale);
        scene.add(rock);
      });
    });

    const distantPlant = new THREE.Group();
    for (const x of [-24, -12, 6, 20, 31]) {
      const height = 15 + Math.random() * 20;
      distantPlant.add(makeMesh(new THREE.CylinderGeometry(1.2, 1.7, height, 12), materials.darkSteel, [x, height / 2, -66], [0, 0, 0], false));
      distantPlant.add(makeMesh(new THREE.CylinderGeometry(1.55, 1.55, 0.6, 12), materials.paintedOrange, [x, height * 0.68, -66], [0, 0, 0], false));
    }
    scene.add(distantPlant);

    const steamTexture = createRadialTexture("rgba(226,239,233,.7)");
    const steam: THREE.Sprite[] = [];
    for (let i = 0; i < 18; i += 1) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTexture, transparent: true, opacity: 0.16, depthWrite: false }));
      sprite.userData.phase = i / 18;
      sprite.userData.seed = Math.random() * Math.PI * 2;
      sprite.position.set(2.35, 1.8, -9.55);
      scene.add(sprite);
      steam.push(sprite);
    }
    const mistGeometry = new THREE.BufferGeometry();
    const mistPositions = new Float32Array(460 * 3);
    for (let i = 0; i < 460; i += 1) {
      mistPositions[i * 3] = (Math.random() - 0.5) * 85;
      mistPositions[i * 3 + 1] = Math.random() * 14;
      mistPositions[i * 3 + 2] = -40 + Math.random() * 95;
    }
    mistGeometry.setAttribute("position", new THREE.BufferAttribute(mistPositions, 3));
    const mist = new THREE.Points(mistGeometry, new THREE.PointsMaterial({ color: 0xffd9b0, size: 0.075, transparent: true, opacity: 0.34, depthWrite: false }));
    scene.add(mist);
    const pumpLight = new THREE.PointLight(0xff7a32, 11, 9, 2.1);
    pumpLight.position.set(0.3, 2.4, -9.2);
    scene.add(pumpLight);

    const raycaster = new THREE.Raycaster();
    raycaster.far = 7;
    const screenCenter = new THREE.Vector2(0, 0);
    const blockedRectangles = [
      { minX: -3.45, maxX: 3.65, minZ: -12.15, maxZ: -7.7 },
      { minX: 6.3, maxX: 11.75, minZ: -12.3, maxZ: -8.55 },
      { minX: -11.7, maxX: -9.25, minZ: 1.25, maxZ: 4.25 },
      { minX: 13.7, maxX: 17.7, minZ: 6.15, maxZ: 9.65 },
    ];
    const blockedCircles = [
      { x: -16.5, z: -27, radius: 4.25 },
      { x: 16.5, z: -27, radius: 4.25 },
      ...[-19, -10, 0, 10, 19].flatMap((x) => [
        { x, z: -6, radius: 0.62 },
        { x, z: -19, radius: 0.62 },
      ]),
    ];
    const playerRadius = 0.42;
    const isBlocked = (x: number, z: number) => {
      if (x < -20.95 || x > 20.95 || z < -32.4 || z > 30.5) return true;
      if (blockedRectangles.some((box) => x > box.minX - playerRadius && x < box.maxX + playerRadius && z > box.minZ - playerRadius && z < box.maxZ + playerRadius)) return true;
      return blockedCircles.some((circle) => Math.hypot(x - circle.x, z - circle.z) < circle.radius + playerRadius);
    };

    const keys = new Set<string>();
    let yaw = 0;
    let pitch = -0.02;
    let bob = 0;
    let last = performance.now();
    let lastDistanceReport = 0;
    let lastTargetReport = 0;
    let reportedTarget: EvidenceId | null = null;
    let activeDecision: DecisionId | null = null;
    let decisionElapsed = 0;
    const onKeyDown = (event: KeyboardEvent) => keys.add(event.code);
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement || tabletRef.current) return;
      yaw -= event.movementX * 0.00175;
      pitch -= event.movementY * 0.0015;
      pitch = THREE.MathUtils.clamp(pitch, -1.08, 1.08);
    };
    const onCanvasClick = () => {
      if (startedRef.current && !tabletRef.current && document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock();
    };
    const onResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
      composer.setPixelRatio(renderPixelRatio);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);
    renderer.domElement.addEventListener("click", onCanvasClick);
    onResize();

    const clock = new THREE.Clock();
    let raf = 0;
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const elapsed = clock.getElapsedTime();
      if (startedRef.current && !tabletRef.current) {
        const touch = touchControls.current;
        if (touch) {
          yaw += touch.yawDelta;
          pitch = THREE.MathUtils.clamp(pitch + touch.pitchDelta, -1.08, 1.08);
          touch.yawDelta = 0;
          touch.pitchDelta = 0;
        }
        const forwardAmount = THREE.MathUtils.clamp(
          Number(keys.has("KeyW")) - Number(keys.has("KeyS")) + (touch?.forward ?? 0),
          -1,
          1,
        );
        const sideAmount = THREE.MathUtils.clamp(
          Number(keys.has("KeyD")) - Number(keys.has("KeyA")) + (touch?.side ?? 0),
          -1,
          1,
        );
        const moving = forwardAmount !== 0 || sideAmount !== 0;
        const speed = keys.has("ShiftLeft") ? 6.7 : 3.9;
        const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        const direction = forward.multiplyScalar(forwardAmount).add(right.multiplyScalar(sideAmount));
        if (direction.lengthSq() > 0) direction.normalize();
        const movement = direction.multiplyScalar(speed * dt);
        const candidateX = camera.position.x + movement.x;
        if (!isBlocked(candidateX, camera.position.z)) camera.position.x = candidateX;
        const candidateZ = camera.position.z + movement.z;
        if (!isBlocked(camera.position.x, candidateZ)) camera.position.z = candidateZ;
        bob += moving ? dt * (keys.has("ShiftLeft") ? 13 : 8.6) : dt * 2.2;
        camera.position.y = 1.72 + Math.sin(bob) * 0.028 * (moving ? 1 : 0.12);
      }
      camera.rotation.set(pitch + Math.sin(elapsed * 0.45) * 0.0018, yaw, 0);

      const inspectionActive = startedRef.current && !tabletRef.current && phaseRef.current === "inspection";
      const capturedIds = capturedRef.current;
      inspectionMarkers.forEach((marker, index) => {
        const markerDistance = camera.position.distanceTo(marker.group.position);
        const available = inspectionActive && !capturedIds.includes(marker.id) && markerDistance < 18;
        marker.group.visible = available;
        if (!available) return;
        marker.ring.quaternion.copy(camera.quaternion);
        marker.core.rotation.y += dt * 1.8;
        marker.core.rotation.x += dt * 0.8;
        const pulse = 1 + Math.sin(elapsed * 3.4 + index) * 0.11;
        marker.ring.scale.setScalar(pulse);
        marker.core.scale.setScalar(pulse);
        const fade = THREE.MathUtils.clamp(1 - Math.max(0, markerDistance - 10) / 8, 0.24, 1);
        (marker.ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * fade;
        (marker.core.material as THREE.MeshBasicMaterial).opacity = 0.95 * fade;
        (marker.label.material as THREE.SpriteMaterial).opacity = 0.92 * fade;
      });

      let currentTarget: EvidenceId | null = null;
      let currentTargetDistance = 0;
      if (inspectionActive) {
        const candidates = inspectionMarkers.filter((marker) => marker.group.visible);
        raycaster.setFromCamera(screenCenter, camera);
        const hits = raycaster.intersectObjects(candidates.map((marker) => marker.hitbox), false);
        for (const hit of hits) {
          const id = hit.object.userData.evidenceId as EvidenceId;
          const marker = candidates.find((candidate) => candidate.id === id);
          if (marker && hit.distance <= marker.range) {
            currentTarget = id;
            currentTargetDistance = hit.distance;
            break;
          }
        }
      }
      if (currentTarget !== reportedTarget || now - lastTargetReport > 220) {
        reportedTarget = currentTarget;
        onTargetChange(currentTarget, currentTargetDistance);
        lastTargetReport = now;
      }

      const pumpDistance = Math.hypot(camera.position.x, camera.position.z + 10);
      if (now - lastDistanceReport > 180) {
        onNearChange(pumpDistance < 5.1, pumpDistance);
        lastDistanceReport = now;
      }

      if (decisionRef.current !== activeDecision) {
        activeDecision = decisionRef.current;
        decisionElapsed = 0;
      } else if (activeDecision) {
        decisionElapsed += dt;
      }
      const responseRamp = THREE.MathUtils.smoothstep(Math.min(decisionElapsed / 4.8, 1), 0, 1);
      let vibrationAmplitude = 0.008;
      let steamFactor = 1;
      let standbySpin = 0.03;
      p204SignalLight.color.set(0xff6732);
      p204SignalLight.intensity = 5.8 + Math.sin(elapsed * 4.7) * 1.2;
      p205SignalLight.intensity = 0;
      p204BeaconMaterial.emissive.set(0xdd3c0d);
      p204BeaconMaterial.emissiveIntensity = 2.3;
      p205BeaconMaterial.emissive.set(0x173b32);
      p205BeaconMaterial.emissiveIntensity = 0.35;
      pipeTeal.emissive.set(0x000000);
      pipeTeal.emissiveIntensity = 0;
      pipeOrange.emissive.set(0x000000);
      pipeOrange.emissiveIntensity = 0;

      if (activeDecision === "monitor") {
        vibrationAmplitude = 0.008 + responseRamp * 0.033;
        steamFactor = 1 + responseRamp * 2.8;
        p204SignalLight.color.set(0xff2f1f);
        p204SignalLight.intensity = 8 + responseRamp * 14 + Math.sin(elapsed * 11) * 2.5;
        p204BeaconMaterial.emissive.set(0xff1708);
        p204BeaconMaterial.emissiveIntensity = 3 + responseRamp * 4;
        pipeOrange.emissive.set(0x771008);
        pipeOrange.emissiveIntensity = responseRamp * 0.75;
      } else if (activeDecision === "transfer") {
        vibrationAmplitude = 0.008 * (1 - responseRamp * 0.94);
        steamFactor = 1 - responseRamp * 0.86;
        standbySpin = 0.03 + responseRamp * 7.2;
        p204SignalLight.intensity = 5.5 * (1 - responseRamp);
        p205SignalLight.intensity = responseRamp * 11;
        p205BeaconMaterial.emissive.set(0x22d79c);
        p205BeaconMaterial.emissiveIntensity = 0.4 + responseRamp * 4.5;
        pipeTeal.emissive.set(0x0b6c56);
        pipeTeal.emissiveIntensity = responseRamp * 0.7;
      } else if (activeDecision === "repair") {
        vibrationAmplitude = 0.008 * (1 - responseRamp);
        steamFactor = 1 - responseRamp * 0.96;
        p204SignalLight.intensity = 5.5 * (1 - responseRamp);
        p204BeaconMaterial.emissive.set(0x5b3d16);
        p204BeaconMaterial.emissiveIntensity = 2.1 * (1 - responseRamp) + 0.25;
      }

      const vibration = Math.sin(elapsed * 46) * vibrationAmplitude;
      hero.motor.position.y = 1.65 + vibration;
      hero.pumpBody.position.y = 1.55 - vibration * 0.7;
      if (importedHeroPump) importedHeroPump.position.y = 0.08 + vibration * 0.22;
      hero.needle.rotation.z = -0.72 - responseRamp * (activeDecision === "monitor" ? 0.54 : 0) + Math.sin(elapsed * 7.5) * 0.09;
      hero.statusBulb.scale.setScalar(0.9 + Math.sin(elapsed * 4.7) * 0.16);
      p204Beacon.scale.setScalar(0.92 + Math.sin(elapsed * (activeDecision === "monitor" ? 10 : 4.7)) * 0.15);
      p205Beacon.scale.setScalar(0.92 + Math.sin(elapsed * 5.4) * 0.12 * responseRamp);
      pumpLight.color.copy(p204SignalLight.color);
      pumpLight.intensity = p204SignalLight.intensity;
      standby.motor.rotation.x += dt * standbySpin;
      waterMat.color.setHSL(0.51 + Math.sin(elapsed * 0.22) * 0.008, 0.34, 0.31);
      wetPatchMaterial.opacity = 0.68 + Math.sin(elapsed * 1.7) * 0.1;
      mist.rotation.y += dt * 0.003;
      steam.forEach((sprite) => {
        const t = (elapsed * 0.16 + sprite.userData.phase) % 1;
        sprite.position.set(2.35 + Math.sin(t * 7 + sprite.userData.seed) * 0.32, 1.65 + t * 3.9, -9.55 + Math.cos(t * 5 + sprite.userData.seed) * 0.26);
        sprite.scale.setScalar(0.5 + t * 2.35);
        (sprite.material as THREE.SpriteMaterial).opacity = Math.sin(Math.PI * t) * 0.18 * steamFactor;
      });
      animatedTrees.forEach((tree, index) => {
        tree.rotation.z = Math.sin(elapsed * 0.43 + tree.userData.swayPhase + index * 0.11) * 0.0055;
        tree.rotation.x = Math.cos(elapsed * 0.31 + tree.userData.swayPhase) * 0.0025;
      });
      composer.render();
    };
    render(performance.now());

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onCanvasClick);
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      concreteTexture.dispose();
      surfaceTextures.forEach((texture) => texture.dispose());
      environmentTexture?.dispose();
      pipeSystem.dispose();
      sunTexture.dispose();
      steamTexture.dispose();
      inspectionMarkers.forEach((marker) => marker.texture.dispose());
      scene.traverse((object) => {
        const candidate = object as THREE.Mesh & { material?: THREE.Material | THREE.Material[]; geometry?: THREE.BufferGeometry };
        candidate.geometry?.dispose();
        if (candidate.material) (Array.isArray(candidate.material) ? candidate.material : [candidate.material]).forEach((material) => material.dispose());
      });
      assetLibrary.dispose();
    };
  }, [onNearChange, onTargetChange, touchControls]);

  return <div className="factory-canvas" ref={mountRef} />;
}
