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
import {
  EVIDENCE_POINTS,
  FILTER_EVIDENCE,
  PUMP_CONTROL_TASKS,
  type DecisionId,
  type EvidenceId,
  type FilterDecisionId,
  type FilterEvidenceId,
  type FilterEvidencePoint,
  type FilterFieldStage,
  type FilterWorldTarget,
  type PumpControlTarget,
  type ScenarioPhase,
} from "./scenario-data";

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
  filterStage: FilterFieldStage;
  filterCaptured: FilterEvidenceId[];
  filterChoice: FilterDecisionId | null;
  filterDecision: FilterDecisionId | null;
  pumpControlStep: PumpControlTarget | null;
  completedPumpControls: PumpControlTarget[];
  touchControls: RefObject<TouchControls>;
  onNearChange: (near: boolean, distance: number) => void;
  onTargetChange: (target: EvidenceId | null, distance: number) => void;
  onPumpControlTargetChange: (target: PumpControlTarget | null, distance: number) => void;
  onFilterTargetChange: (target: FilterWorldTarget | null, distance: number) => void;
};

type InspectionMarker = {
  id: string;
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
  point: (typeof EVIDENCE_POINTS)[number] | FilterEvidencePoint | {
    id: FilterDecisionId | PumpControlTarget;
    code: string;
    worldLabel: string;
    position: readonly [number, number, number];
    range: number;
  },
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
  const labelOnLeft = point.id === "EV-02" || point.id === "F2" || point.id === "F4" || point.id === "bypass";
  const labelX = labelOnLeft ? -1.3 : 1.3;
  const labelY = point.id === "EV-01" ? 0.86 : point.id === "EV-02" ? 0.22 : 0.5;
  label.position.set(labelX, labelY, 0);
  label.scale.set(2.65, 0.58, 1);
  label.renderOrder = 13;
  group.add(label);

  const hitbox = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, 12, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hitbox.userData.targetId = point.id;
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
  const fallbackBody = new THREE.Group();
  fallbackBody.name = standby ? "P-205 procedural body" : "P-204 procedural body";
  group.add(fallbackBody);
  const accent = standby ? new THREE.MeshStandardMaterial({ color: 0x3b8e79, roughness: 0.38, metalness: 0.48 }) : materials.paintedOrange;

  fallbackBody.add(makeMesh(new THREE.BoxGeometry(5.9, 0.3, 3.4), materials.darkSteel, [0, 0.2, 0]));
  fallbackBody.add(makeMesh(new THREE.BoxGeometry(5.25, 0.18, 2.85), materials.concrete, [0, 0.46, 0]));
  for (const bx of [-2.3, 2.3]) {
    for (const bz of [-1.1, 1.1]) fallbackBody.add(makeMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.25, 12), materials.brass, [bx, 0.62, bz]));
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
  fallbackBody.add(motor);

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
  fallbackBody.add(pumpBody);

  const coupling = makeMesh(new THREE.BoxGeometry(0.82, 0.9, 1.15), accent, [0.36, 1.45, 0]);
  coupling.rotation.z = 0.03;
  fallbackBody.add(coupling);
  const statusBulb = makeMesh(new THREE.SphereGeometry(0.12, 18, 12), standby ? materials.glass : materials.warningRed, [0.36, 2.05, 0.48]);
  group.add(statusBulb);

  const { gauge, needle } = createGauge(materials);
  gauge.position.set(standby ? 1.55 : 2.35, standby ? 3.25 : 2.72, standby ? 0.72 : 1.02);
  gauge.rotation.set(-0.08, 0, 0);
  group.add(gauge);
  pipeBetween(
    group,
    new THREE.Vector3(standby ? 1.55 : 2.2, standby ? 2.45 : 1.92, 0),
    new THREE.Vector3(standby ? 1.55 : 2.35, standby ? 3.05 : 2.47, standby ? 0.45 : 0.72),
    0.08,
    materials.brass,
    10,
  );

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
  return { group, fallbackBody, motor, pumpBody, needle, statusBulb };
}

function createValveWheel(material: THREE.Material, radius = 0.48) {
  const wheel = new THREE.Group();
  wheel.add(makeMesh(new THREE.TorusGeometry(radius, 0.055, 8, 30), material, [0, 0, 0]));
  for (let i = 0; i < 4; i += 1) {
    wheel.add(makeMesh(new THREE.BoxGeometry(radius * 1.7, 0.055, 0.05), material, [0, 0, 0], [0, 0, i * Math.PI / 4]));
  }
  wheel.add(makeMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 12), material, [0, 0, 0], [Math.PI / 2, 0, 0]));
  return wheel;
}

function buildFilterSkid(
  parent: THREE.Object3D,
  materials: Materials,
  pipeTeal: THREE.MeshStandardMaterial,
  pipeOrange: THREE.MeshStandardMaterial,
) {
  const group = new THREE.Group();
  group.name = "F-201 physical filter skid";
  group.position.set(0, 0, -25.3);

  const filterShell = materials.steel.clone();
  filterShell.color.set(0x506b67);
  filterShell.roughness = 0.48;
  const frameMaterial = materials.darkSteel.clone();
  frameMaterial.color.set(0x17211f);
  const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x293633, roughness: 0.58, metalness: 0.58 });
  const screenMaterial = new THREE.MeshStandardMaterial({ color: 0x16201f, emissive: 0xf09a25, emissiveIntensity: 1.35, roughness: 0.22, metalness: 0.34 });
  const sightMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x79cfbf,
    emissive: 0x174d42,
    emissiveIntensity: 0.35,
    roughness: 0.08,
    transmission: 0.22,
    transparent: true,
    opacity: 0.84,
  });
  const bypassMaterial = pipeOrange.clone();
  const washMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x76c9d0,
    emissive: 0x17454d,
    emissiveIntensity: 0.18,
    roughness: 0.13,
    transparent: true,
    opacity: 0.72,
  });

  group.add(makeMesh(new THREE.BoxGeometry(7.2, 0.28, 5.3), frameMaterial, [0, 0.18, 0]));
  group.add(makeMesh(new THREE.BoxGeometry(6.65, 0.16, 4.75), materials.concrete, [0, 0.42, 0]));
  for (const x of [-2.7, 2.7]) {
    for (const z of [-1.8, 1.8]) {
      group.add(makeMesh(new THREE.BoxGeometry(0.28, 0.62, 0.28), frameMaterial, [x, 0.73, z]));
      group.add(makeMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 10), materials.brass, [x, 0.55, z]));
    }
  }

  const vessel = new THREE.Group();
  vessel.name = "F-201 media vessel";
  vessel.add(makeMesh(new THREE.CylinderGeometry(1.52, 1.52, 4.35, 38), filterShell, [0, 3.05, -0.2]));
  const topDome = makeMesh(new THREE.SphereGeometry(1.53, 38, 18), filterShell, [0, 5.2, -0.2]);
  topDome.scale.y = 0.42;
  vessel.add(topDome);
  const lowerDome = makeMesh(new THREE.SphereGeometry(1.53, 38, 18), filterShell, [0, 0.9, -0.2]);
  lowerDome.scale.y = 0.42;
  vessel.add(lowerDome);
  for (const y of [1.05, 2.25, 3.45, 4.65]) {
    vessel.add(makeMesh(new THREE.TorusGeometry(1.55, 0.065, 8, 42), materials.paintedTeal, [0, y, -0.2], [Math.PI / 2, 0, 0]));
  }
  const hatch = makeMesh(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 24), materials.darkSteel, [0, 3.25, 1.34], [Math.PI / 2, 0, 0]);
  vessel.add(hatch);
  for (let i = 0; i < 12; i += 1) {
    const angle = i / 12 * Math.PI * 2;
    vessel.add(makeMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 7), materials.brass, [Math.cos(angle) * 0.44, 3.25 + Math.sin(angle) * 0.44, 1.46], [Math.PI / 2, 0, 0]));
  }
  group.add(vessel);

  for (const x of [-1.08, 1.08]) {
    group.add(makeMesh(new THREE.BoxGeometry(0.38, 1.15, 0.5), frameMaterial, [x, 0.98, -0.2]));
  }

  pipeBetween(group, new THREE.Vector3(-3.5, 1.45, 0.55), new THREE.Vector3(-1.55, 1.45, 0.55), 0.31, pipeTeal, 22);
  pipeBetween(group, new THREE.Vector3(1.55, 1.25, 0.5), new THREE.Vector3(3.5, 1.25, 0.5), 0.31, pipeTeal, 22);
  pipeBetween(group, new THREE.Vector3(-3.15, 1.45, 0.55), new THREE.Vector3(-3.15, 3.05, -0.65), 0.22, bypassMaterial, 18);
  pipeBetween(group, new THREE.Vector3(-3.15, 3.05, -0.65), new THREE.Vector3(3.15, 3.05, -0.65), 0.22, bypassMaterial, 18);
  pipeBetween(group, new THREE.Vector3(3.15, 3.05, -0.65), new THREE.Vector3(3.15, 1.25, 0.5), 0.22, bypassMaterial, 18);
  pipeBetween(group, new THREE.Vector3(0, 0.8, -0.2), new THREE.Vector3(0, 0.75, 2.65), 0.24, materials.steel, 18);

  const gaugePanel = makeMesh(new THREE.BoxGeometry(2.2, 1.18, 0.22), panelMaterial, [-1.42, 3.16, 2.14]);
  group.add(gaugePanel);
  const inletGauge = createGauge(materials);
  inletGauge.gauge.position.set(-1.88, 3.2, 2.31);
  inletGauge.gauge.scale.setScalar(0.62);
  group.add(inletGauge.gauge);
  const outletGauge = createGauge(materials);
  outletGauge.gauge.position.set(-0.96, 3.2, 2.31);
  outletGauge.gauge.scale.setScalar(0.62);
  group.add(outletGauge.gauge);
  const gaugeCaption = createSign("ΔP · 2.6 BAR", "#f0a128", 620);
  gaugeCaption.position.set(-1.42, 3.84, 2.24);
  gaugeCaption.scale.set(2.05, 0.53, 1);
  group.add(gaugeCaption);

  const analyzer = new THREE.Group();
  analyzer.position.set(1.48, 1.65, 2.2);
  analyzer.add(makeMesh(new THREE.BoxGeometry(0.92, 1.35, 0.42), panelMaterial, [0, 0, 0]));
  analyzer.add(makeMesh(new THREE.BoxGeometry(0.64, 0.3, 0.035), screenMaterial, [0, 0.34, 0.23], [0, 0, 0], false));
  analyzer.add(makeMesh(new THREE.CylinderGeometry(0.19, 0.19, 0.58, 18), sightMaterial, [0, -0.3, 0.24]));
  analyzer.add(makeMesh(new THREE.TorusGeometry(0.22, 0.035, 7, 22), materials.brass, [0, 0, 0.24], [Math.PI / 2, 0, 0]));
  group.add(analyzer);

  const controller = new THREE.Group();
  controller.position.set(-0.18, 1.45, 2.38);
  controller.add(makeMesh(new THREE.BoxGeometry(1.05, 1.42, 0.4), panelMaterial, [0, 0, 0]));
  controller.add(makeMesh(new THREE.BoxGeometry(0.74, 0.34, 0.035), screenMaterial, [0, 0.36, 0.22], [0, 0, 0], false));
  for (const x of [-0.25, 0, 0.25]) controller.add(makeMesh(new THREE.SphereGeometry(0.07, 12, 8), x === 0 ? materials.warningRed : materials.glass, [x, -0.26, 0.24]));
  group.add(controller);

  const feedWheel = createValveWheel(materials.paintedOrange, 0.46);
  feedWheel.position.set(-2.78, 1.72, 1.62);
  group.add(feedWheel);
  pipeBetween(group, new THREE.Vector3(-2.78, 1.45, 0.55), new THREE.Vector3(-2.78, 1.45, 1.52), 0.085, materials.brass, 10);

  const bypassWheel = createValveWheel(materials.warningRed, 0.48);
  bypassWheel.position.set(2.62, 2.46, 1.45);
  group.add(bypassWheel);
  pipeBetween(group, new THREE.Vector3(2.62, 3.05, -0.65), new THREE.Vector3(2.62, 2.46, 1.33), 0.085, materials.brass, 10);

  const backwashHandle = new THREE.Group();
  backwashHandle.position.set(-0.18, 0.95, 2.64);
  backwashHandle.add(makeMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.75, 10), materials.paintedOrange, [0, 0.3, 0], [0, 0, -0.72]));
  backwashHandle.add(makeMesh(new THREE.SphereGeometry(0.13, 14, 9), materials.paintedOrange, [0.25, 0.58, 0]));
  group.add(backwashHandle);

  const clearwellIndicator = new THREE.Group();
  clearwellIndicator.position.set(2.62, 2.7, 2.0);
  clearwellIndicator.add(makeMesh(new THREE.BoxGeometry(0.76, 0.82, 0.34), panelMaterial, [0, 0, 0]));
  clearwellIndicator.add(makeMesh(new THREE.BoxGeometry(0.52, 0.22, 0.035), screenMaterial, [0, 0.16, 0.19], [0, 0, 0], false));
  clearwellIndicator.add(makeMesh(new THREE.CylinderGeometry(0.055, 0.055, 0.38, 10), materials.glass, [0, -0.2, 0.2]));
  group.add(clearwellIndicator);

  const beaconMaterial = new THREE.MeshStandardMaterial({ color: 0xf0992b, emissive: 0xc44c08, emissiveIntensity: 2.7, roughness: 0.2 });
  const beacon = makeMesh(new THREE.SphereGeometry(0.17, 18, 12), beaconMaterial, [0, 6.08, -0.1]);
  group.add(beacon);
  const signalLight = new THREE.PointLight(0xff8735, 8, 8, 2.1);
  signalLight.position.set(0, 5.9, 0.1);
  group.add(signalLight);

  const sign = createSign("F-201 · FILTER BANK", "#f0a128", 820);
  sign.position.set(0, 6.58, 0.05);
  sign.scale.set(4.55, 1, 1);
  group.add(sign);

  const backwashDrops: THREE.Mesh[] = [];
  for (let i = 0; i < 18; i += 1) {
    const drop = makeMesh(new THREE.SphereGeometry(0.055 + i % 3 * 0.012, 8, 6), washMaterial, [0, 0.55, 2.8], [0, 0, 0], false);
    drop.visible = false;
    drop.userData.phase = i / 18;
    drop.userData.seed = i * 1.73;
    group.add(drop);
    backwashDrops.push(drop);
  }

  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = false;
    object.receiveShadow = true;
  });

  parent.add(group);
  return {
    group,
    vessel,
    inletNeedle: inletGauge.needle,
    outletNeedle: outletGauge.needle,
    feedWheel,
    bypassWheel,
    backwashHandle,
    beacon,
    beaconMaterial,
    signalLight,
    sightMaterial,
    bypassMaterial,
    screenMaterial,
    backwashDrops,
  };
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
  filterStage,
  filterCaptured,
  filterChoice,
  filterDecision,
  pumpControlStep,
  completedPumpControls,
  touchControls,
  onNearChange,
  onTargetChange,
  onPumpControlTargetChange,
  onFilterTargetChange,
}: FactorySceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(started);
  const tabletRef = useRef(tabletOpen);
  const phaseRef = useRef(scenarioPhase);
  const capturedRef = useRef(captured);
  const decisionRef = useRef(decision);
  const filterStageRef = useRef(filterStage);
  const filterCapturedRef = useRef(filterCaptured);
  const filterChoiceRef = useRef(filterChoice);
  const filterDecisionRef = useRef(filterDecision);
  const pumpControlStepRef = useRef(pumpControlStep);
  const completedPumpControlsRef = useRef(completedPumpControls);

  useEffect(() => { startedRef.current = started; }, [started]);
  useEffect(() => { phaseRef.current = scenarioPhase; }, [scenarioPhase]);
  useEffect(() => { capturedRef.current = captured; }, [captured]);
  useEffect(() => { decisionRef.current = decision; }, [decision]);
  useEffect(() => { filterStageRef.current = filterStage; }, [filterStage]);
  useEffect(() => { filterCapturedRef.current = filterCaptured; }, [filterCaptured]);
  useEffect(() => { filterChoiceRef.current = filterChoice; }, [filterChoice]);
  useEffect(() => { filterDecisionRef.current = filterDecision; }, [filterDecision]);
  useEffect(() => { pumpControlStepRef.current = pumpControlStep; }, [pumpControlStep]);
  useEffect(() => { completedPumpControlsRef.current = completedPumpControls; }, [completedPumpControls]);
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

    const rendererInfo = context.getExtension("WEBGL_debug_renderer_info");
    const rendererName = rendererInfo
      ? String(context.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL))
      : "";
    const softwareRenderer = /swiftshader|llvmpipe|software/i.test(rendererName);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb88f78);
    scene.fog = new THREE.Fog(0x98aaa0, 34, 142);
    const camera = new THREE.PerspectiveCamera(66, 1, 0.08, 220);
    camera.position.set(0, 1.72, 15.5);
    camera.rotation.order = "YXZ";

    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const renderPixelRatio = Math.min(window.devicePixelRatio, softwareRenderer ? 0.78 : coarsePointer ? 1.1 : 1.4);
    renderer.setPixelRatio(renderPixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = !softwareRenderer;
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
      softwareRenderer ? 0.08 : coarsePointer ? 0.16 : 0.28,
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
    sunlight.castShadow = !softwareRenderer;
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
    const p205StartMaterial = new THREE.MeshStandardMaterial({ color: 0x34564e, emissive: 0x12352d, emissiveIntensity: 0.35, roughness: 0.32, metalness: 0.42 });
    const transferScreenMaterial = new THREE.MeshStandardMaterial({ color: 0x1b2725, emissive: 0xe49224, emissiveIntensity: 1.15, roughness: 0.25, metalness: 0.28 });
    const transferConsole = new THREE.Group();
    transferConsole.name = "P-205 physical start console";
    transferConsole.position.set(7.15, 0, -8.66);
    transferConsole.add(makeMesh(new THREE.BoxGeometry(0.92, 1.72, 0.42), materials.darkSteel, [0, 0.94, 0]));
    transferConsole.add(makeMesh(new THREE.BoxGeometry(0.66, 0.42, 0.035), transferScreenMaterial, [0, 1.31, 0.23], [0, 0, 0], false));
    const p205StartButton = makeMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.075, 20), p205StartMaterial, [0, 0.84, 0.25], [Math.PI / 2, 0, 0]);
    transferConsole.add(p205StartButton);
    const transferLabel = createSign("P-205 · TRANSFER", "#57b99c", 820);
    transferLabel.position.set(0, 2.1, 0);
    transferLabel.scale.set(2.45, 0.55, 1);
    transferConsole.add(transferLabel);
    facility.add(transferConsole);

    const p204IsolationAssembly = new THREE.Group();
    p204IsolationAssembly.name = "P-204 physical isolation valve";
    p204IsolationAssembly.position.set(2.92, 1.46, -8.62);
    p204IsolationAssembly.add(makeMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.62, 18), materials.steel, [0, 0, -0.18], [0, 0, Math.PI / 2]));
    const p204IsolationWheel = createValveWheel(materials.warningRed, 0.42);
    p204IsolationWheel.position.z = 0.18;
    p204IsolationAssembly.add(p204IsolationWheel);
    facility.add(p204IsolationAssembly);

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
    const filterSkid = buildFilterSkid(facility, materials, pipeTeal, pipeOrange);

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

    const pumpControlMarkerRoot = new THREE.Group();
    pumpControlMarkerRoot.name = "P-204 transfer control markers";
    const pumpControlMarkers = PUMP_CONTROL_TASKS.map((task) => createInspectionMarker(task, 0x5cdbb2));
    pumpControlMarkers.forEach((marker) => pumpControlMarkerRoot.add(marker.group));
    scene.add(pumpControlMarkerRoot);

    const filterMarkerRoot = new THREE.Group();
    filterMarkerRoot.name = "F-201 inspection markers";
    const filterInspectionMarkers = FILTER_EVIDENCE.map((point) => createInspectionMarker(point, 0xf1a22a));
    filterInspectionMarkers.forEach((marker) => filterMarkerRoot.add(marker.group));
    scene.add(filterMarkerRoot);

    const filterControlPoints = {
      push: { id: "push", code: "ACT", worldLabel: "FEED VALVE", position: [-2.78, 1.72, -23.58], range: 4.7 },
      bypass: { id: "bypass", code: "ACT", worldLabel: "BYPASS VALVE", position: [2.62, 2.46, -23.75], range: 4.9 },
      backwash: { id: "backwash", code: "ACT", worldLabel: "BACKWASH LEVER", position: [-0.18, 1.23, -22.62], range: 4.5 },
    } satisfies Record<FilterDecisionId, {
      id: FilterDecisionId;
      code: string;
      worldLabel: string;
      position: readonly [number, number, number];
      range: number;
    }>;
    const filterControlMarkers = {
      push: createInspectionMarker(filterControlPoints.push, 0x5cdbb2),
      bypass: createInspectionMarker(filterControlPoints.bypass, 0x5cdbb2),
      backwash: createInspectionMarker(filterControlPoints.backwash, 0x5cdbb2),
    };
    Object.values(filterControlMarkers).forEach((marker) => filterMarkerRoot.add(marker.group));

    const filterRoute = new THREE.Group();
    filterRoute.name = "F-201 route beacon";
    filterRoute.position.set(0, 0.06, -25.3);
    const routeMaterial = new THREE.MeshBasicMaterial({ color: 0xf1a22a, transparent: true, opacity: 0.28, depthWrite: false });
    const routeRing = makeMesh(new THREE.TorusGeometry(3.9, 0.045, 8, 54), routeMaterial, [0, 0, 0], [Math.PI / 2, 0, 0], false);
    const routeBeam = makeMesh(new THREE.CylinderGeometry(0.022, 0.16, 6.4, 12), routeMaterial.clone(), [0, 3.2, 0], [0, 0, 0], false);
    const routeArrow = makeMesh(new THREE.ConeGeometry(0.3, 0.72, 12), routeMaterial.clone(), [0, 6.05, 0], [0, 0, Math.PI], false);
    const routeLabel = createSign("F-201 · FIELD INSPECTION", "#f0a128", 940);
    routeLabel.position.set(0, 7.05, 0);
    routeLabel.scale.set(5.2, 1, 1);
    filterRoute.add(routeRing, routeBeam, routeArrow, routeLabel);
    scene.add(filterRoute);

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
      model.rotation.y = -0.14;
      facility.add(model);
      importedHeroPump = model;
      hero.fallbackBody.visible = false;
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
      { minX: -3.65, maxX: 3.65, minZ: -28.05, maxZ: -23.15 },
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
    let lastPumpControlTargetReport = 0;
    let reportedPumpControlTarget: PumpControlTarget | null = null;
    let lastFilterTargetReport = 0;
    let reportedFilterTarget: FilterWorldTarget | null = null;
    let activeDecision: DecisionId | null = null;
    let decisionElapsed = 0;
    let activeFilterDecision: FilterDecisionId | null = null;
    let filterDecisionElapsed = 0;
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
        const available = inspectionActive && !capturedIds.includes(marker.id as EvidenceId) && markerDistance < 18;
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
          const id = hit.object.userData.targetId as EvidenceId;
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

      const pumpControlStep = pumpControlStepRef.current;
      const pumpActuationActive = startedRef.current && !tabletRef.current && phaseRef.current === "actuation" && Boolean(pumpControlStep);
      pumpControlMarkers.forEach((marker, index) => {
        const markerDistance = camera.position.distanceTo(marker.group.position);
        const available = pumpActuationActive && marker.id === pumpControlStep && markerDistance < 18;
        marker.group.visible = available;
        if (!available) return;
        marker.ring.quaternion.copy(camera.quaternion);
        marker.core.rotation.y += dt * 2.2;
        marker.core.rotation.x += dt * 0.9;
        const pulse = 1 + Math.sin(elapsed * 4.1 + index) * 0.13;
        marker.ring.scale.setScalar(pulse);
        marker.core.scale.setScalar(pulse);
        const fade = THREE.MathUtils.clamp(1 - Math.max(0, markerDistance - 10) / 8, 0.25, 1);
        (marker.ring.material as THREE.MeshBasicMaterial).opacity = 0.92 * fade;
        (marker.core.material as THREE.MeshBasicMaterial).opacity = 0.98 * fade;
        (marker.label.material as THREE.SpriteMaterial).opacity = 0.94 * fade;
      });

      let currentPumpControlTarget: PumpControlTarget | null = null;
      let currentPumpControlDistance = 0;
      if (pumpActuationActive) {
        const candidate = pumpControlMarkers.find((marker) => marker.id === pumpControlStep && marker.group.visible);
        if (candidate) {
          raycaster.setFromCamera(screenCenter, camera);
          const hit = raycaster.intersectObject(candidate.hitbox, false)[0];
          if (hit && hit.distance <= candidate.range) {
            currentPumpControlTarget = candidate.id as PumpControlTarget;
            currentPumpControlDistance = hit.distance;
          }
        }
      }
      if (currentPumpControlTarget !== reportedPumpControlTarget || now - lastPumpControlTargetReport > 220) {
        reportedPumpControlTarget = currentPumpControlTarget;
        onPumpControlTargetChange(currentPumpControlTarget, currentPumpControlDistance);
        lastPumpControlTargetReport = now;
      }

      const completedPumpControls = completedPumpControlsRef.current;
      const standbyStarted = completedPumpControls.includes("P205-START");
      const pressureProven = completedPumpControls.includes("P205-GAUGE");
      const dutyIsolated = completedPumpControls.includes("P204-ISOLATE");
      p205StartMaterial.color.set(standbyStarted ? 0x4fd1a8 : 0x34564e);
      p205StartMaterial.emissive.set(standbyStarted ? 0x168663 : 0x12352d);
      p205StartMaterial.emissiveIntensity = standbyStarted ? 2.7 : 0.35;
      transferScreenMaterial.emissive.set(pressureProven ? 0x20bc8c : standbyStarted ? 0xe5a12f : 0x7b4a15);
      transferScreenMaterial.emissiveIntensity = standbyStarted ? 1.75 : 0.72;
      const standbyNeedleTarget = pressureProven ? 0.06 : standbyStarted ? -0.08 : -0.72;
      standby.needle.rotation.z = THREE.MathUtils.lerp(standby.needle.rotation.z, standbyNeedleTarget, 1 - Math.exp(-dt * 2.4));
      p204IsolationWheel.rotation.z = THREE.MathUtils.lerp(p204IsolationWheel.rotation.z, dutyIsolated ? -1.28 : 0, 1 - Math.exp(-dt * 4.2));
      if (standbyStarted && phaseRef.current === "actuation") standby.motor.rotation.x += dt * 4.6;

      const currentFilterStage = filterStageRef.current;
      const filterInspectionActive = startedRef.current && !tabletRef.current && currentFilterStage === "inspection";
      const filterActuationActive = startedRef.current && !tabletRef.current && currentFilterStage === "actuation" && Boolean(filterChoiceRef.current);
      const capturedFilterIds = filterCapturedRef.current;
      filterRoute.visible = currentFilterStage === "briefing" || currentFilterStage === "inspection";
      if (filterRoute.visible) {
        routeRing.rotation.z += dt * 0.28;
        routeRing.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.06);
        routeArrow.position.y = 6.05 + Math.sin(elapsed * 2.8) * 0.22;
        (routeBeam.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.sin(elapsed * 2.2) * 0.07;
        routeLabel.quaternion.copy(camera.quaternion);
      }

      filterInspectionMarkers.forEach((marker, index) => {
        const markerDistance = camera.position.distanceTo(marker.group.position);
        const available = filterInspectionActive && !capturedFilterIds.includes(marker.id as FilterEvidenceId) && markerDistance < 24;
        marker.group.visible = available;
        if (!available) return;
        marker.ring.quaternion.copy(camera.quaternion);
        marker.core.rotation.y += dt * 1.8;
        marker.core.rotation.x += dt * 0.8;
        const pulse = 1 + Math.sin(elapsed * 3.2 + index) * 0.11;
        marker.ring.scale.setScalar(pulse);
        marker.core.scale.setScalar(pulse);
        const fade = THREE.MathUtils.clamp(1 - Math.max(0, markerDistance - 14) / 10, 0.22, 1);
        (marker.ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * fade;
        (marker.core.material as THREE.MeshBasicMaterial).opacity = 0.95 * fade;
        (marker.label.material as THREE.SpriteMaterial).opacity = 0.92 * fade;
      });

      Object.entries(filterControlMarkers).forEach(([decisionId, marker], index) => {
        const markerDistance = camera.position.distanceTo(marker.group.position);
        const available = filterActuationActive && filterChoiceRef.current === decisionId && markerDistance < 18;
        marker.group.visible = available;
        if (!available) return;
        marker.ring.quaternion.copy(camera.quaternion);
        marker.core.rotation.y += dt * 2.4;
        marker.core.rotation.x += dt;
        const pulse = 1 + Math.sin(elapsed * 4 + index) * 0.13;
        marker.ring.scale.setScalar(pulse);
        marker.core.scale.setScalar(pulse);
      });

      let currentFilterTarget: FilterWorldTarget | null = null;
      let currentFilterTargetDistance = 0;
      if (filterInspectionActive) {
        const candidates = filterInspectionMarkers.filter((marker) => marker.group.visible);
        raycaster.setFromCamera(screenCenter, camera);
        const hits = raycaster.intersectObjects(candidates.map((marker) => marker.hitbox), false);
        for (const hit of hits) {
          const id = hit.object.userData.targetId as FilterEvidenceId;
          const marker = candidates.find((candidate) => candidate.id === id);
          if (marker && hit.distance <= marker.range) {
            currentFilterTarget = id;
            currentFilterTargetDistance = hit.distance;
            break;
          }
        }
      } else if (filterActuationActive && filterChoiceRef.current) {
        const marker = filterControlMarkers[filterChoiceRef.current];
        raycaster.setFromCamera(screenCenter, camera);
        const hit = raycaster.intersectObject(marker.hitbox, false)[0];
        if (hit && hit.distance <= marker.range) {
          currentFilterTarget = "FILTER-CONTROL";
          currentFilterTargetDistance = hit.distance;
        }
      }
      if (currentFilterTarget !== reportedFilterTarget || now - lastFilterTargetReport > 220) {
        reportedFilterTarget = currentFilterTarget;
        onFilterTargetChange(currentFilterTarget, currentFilterTargetDistance);
        lastFilterTargetReport = now;
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

      if (filterDecisionRef.current !== activeFilterDecision) {
        activeFilterDecision = filterDecisionRef.current;
        filterDecisionElapsed = 0;
      } else if (activeFilterDecision) {
        filterDecisionElapsed += dt;
      }
      const filterRamp = THREE.MathUtils.smoothstep(Math.min(filterDecisionElapsed / 4.6, 1), 0, 1);
      const filterTaskActive = currentFilterStage !== "idle";
      filterSkid.vessel.position.x = 0;
      filterSkid.vessel.rotation.z = 0;
      filterSkid.feedWheel.rotation.z = 0;
      filterSkid.bypassWheel.rotation.z = 0;
      filterSkid.backwashHandle.rotation.z = 0;
      filterSkid.inletNeedle.rotation.z = -1.02;
      filterSkid.outletNeedle.rotation.z = -0.24;
      filterSkid.bypassMaterial.emissive.set(0x000000);
      filterSkid.bypassMaterial.emissiveIntensity = 0;
      filterSkid.sightMaterial.color.set(0x79cfbf);
      filterSkid.sightMaterial.emissive.set(0x174d42);
      filterSkid.screenMaterial.emissive.set(0xf09a25);
      filterSkid.screenMaterial.emissiveIntensity = filterTaskActive ? 1.35 : 0.35;
      filterSkid.beaconMaterial.color.set(filterTaskActive ? 0xf0992b : 0x31564d);
      filterSkid.beaconMaterial.emissive.set(filterTaskActive ? 0xc44c08 : 0x153c32);
      filterSkid.beaconMaterial.emissiveIntensity = filterTaskActive ? 2.4 : 0.38;
      filterSkid.signalLight.color.set(filterTaskActive ? 0xff8735 : 0x5acdad);
      filterSkid.signalLight.intensity = filterTaskActive ? 6.4 + Math.sin(elapsed * 4.1) * 1.4 : 0.6;
      filterSkid.backwashDrops.forEach((drop) => { drop.visible = false; });

      if (activeFilterDecision === "push") {
        filterSkid.feedWheel.rotation.z = -filterRamp * 1.8;
        filterSkid.vessel.position.x = Math.sin(elapsed * 35) * 0.018 * filterRamp;
        filterSkid.vessel.rotation.z = Math.sin(elapsed * 29) * 0.0035 * filterRamp;
        filterSkid.inletNeedle.rotation.z = -1.02 - filterRamp * 0.32;
        filterSkid.outletNeedle.rotation.z = -0.24 + filterRamp * 0.17;
        filterSkid.sightMaterial.color.lerp(new THREE.Color(0xb8753d), filterRamp);
        filterSkid.sightMaterial.emissive.set(0x5d1d0d);
        filterSkid.beaconMaterial.color.set(0xe54635);
        filterSkid.beaconMaterial.emissive.set(0xb3170c);
        filterSkid.beaconMaterial.emissiveIntensity = 3.2 + filterRamp * 3.4;
        filterSkid.signalLight.color.set(0xff3827);
        filterSkid.signalLight.intensity = 9 + filterRamp * 10 + Math.sin(elapsed * 10) * 2;
        pipeOrange.emissive.set(0x741006);
        pipeOrange.emissiveIntensity = Math.max(pipeOrange.emissiveIntensity, filterRamp * 0.72);
      } else if (activeFilterDecision === "bypass") {
        filterSkid.bypassWheel.rotation.z = -filterRamp * 2.2;
        filterSkid.bypassMaterial.emissive.set(0xb64508);
        filterSkid.bypassMaterial.emissiveIntensity = filterRamp * 1.1;
        filterSkid.sightMaterial.color.lerp(new THREE.Color(0x8b653e), filterRamp);
        filterSkid.sightMaterial.emissive.set(0x4d2108);
        filterSkid.beaconMaterial.color.set(0xe54835);
        filterSkid.beaconMaterial.emissive.set(0xb3170c);
        filterSkid.beaconMaterial.emissiveIntensity = 3 + filterRamp * 3.2;
        filterSkid.signalLight.color.set(0xff3927);
        filterSkid.signalLight.intensity = 8 + filterRamp * 9;
      } else if (activeFilterDecision === "backwash") {
        filterSkid.backwashHandle.rotation.z = -filterRamp * 1.05;
        filterSkid.inletNeedle.rotation.z = -1.02 + filterRamp * 0.52;
        filterSkid.outletNeedle.rotation.z = -0.24 - filterRamp * 0.18;
        filterSkid.sightMaterial.color.lerp(new THREE.Color(0x62d8ca), filterRamp);
        filterSkid.sightMaterial.emissive.set(0x116e5a);
        filterSkid.screenMaterial.emissive.set(filterRamp > 0.72 ? 0x1ed39a : 0xe99b28);
        filterSkid.beaconMaterial.color.set(filterRamp > 0.72 ? 0x41c99d : 0xf0a12c);
        filterSkid.beaconMaterial.emissive.set(filterRamp > 0.72 ? 0x087b58 : 0xc44c08);
        filterSkid.beaconMaterial.emissiveIntensity = 2.8 + filterRamp * 1.8;
        filterSkid.signalLight.color.set(filterRamp > 0.72 ? 0x4ce2b1 : 0xffa33b);
        filterSkid.signalLight.intensity = 8 + Math.sin(elapsed * 5.5) * 1.4;
        pipeTeal.emissive.set(0x0a725b);
        pipeTeal.emissiveIntensity = Math.max(pipeTeal.emissiveIntensity, filterRamp * 0.68);
        filterSkid.backwashDrops.forEach((drop) => {
          const t = (elapsed * 0.74 + drop.userData.phase) % 1;
          drop.visible = filterRamp > 0.08;
          drop.position.set(
            Math.sin(drop.userData.seed + t * 7) * (0.18 + t * 0.42),
            0.7 - t * 0.5,
            2.75 + t * 2.4,
          );
          drop.scale.setScalar((0.5 + Math.sin(Math.PI * t) * 0.8) * filterRamp);
        });
      }
      filterSkid.beacon.scale.setScalar(0.9 + Math.sin(elapsed * (activeFilterDecision === "push" ? 10 : 4.4)) * 0.14);

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
      if (softwareRenderer) renderer.render(scene, camera);
      else composer.render();
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
      pumpControlMarkers.forEach((marker) => marker.texture.dispose());
      filterInspectionMarkers.forEach((marker) => marker.texture.dispose());
      Object.values(filterControlMarkers).forEach((marker) => marker.texture.dispose());
      scene.traverse((object) => {
        const candidate = object as THREE.Mesh & { material?: THREE.Material | THREE.Material[]; geometry?: THREE.BufferGeometry };
        candidate.geometry?.dispose();
        if (candidate.material) (Array.isArray(candidate.material) ? candidate.material : [candidate.material]).forEach((material) => material.dispose());
      });
      assetLibrary.dispose();
    };
  }, [onFilterTargetChange, onNearChange, onPumpControlTargetChange, onTargetChange, touchControls]);

  return <div className="factory-canvas" ref={mountRef} />;
}
