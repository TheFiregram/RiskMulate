import * as THREE from "three";

export type IndustrialPipePalette = {
  teal: THREE.MeshStandardMaterial;
  orange: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  warningRed: THREE.MeshStandardMaterial;
};

type Point = readonly [number, number, number];

type RouteOptions = {
  radius: number;
  material: THREE.Material;
  bendRadius?: number;
  radialSegments?: number;
};

export const PIPE_VALVE_MOUNTS = [
  { position: [5.55, 1.62, -10] as Point, rotation: [0, 0, 0] as Point },
  { position: [14, 1.62, -10.5] as Point, rotation: [0, 0, 0] as Point },
  { position: [-7.5, 6.7, -20.5] as Point, rotation: [0, 0, 0] as Point },
] as const;

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function vector(point: Point) {
  return new THREE.Vector3(point[0], point[1], point[2]);
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: Point = [0, 0, 0],
  rotation: Point = [0, 0, 0],
) {
  const result = new THREE.Mesh(geometry, material);
  result.position.set(...position);
  result.rotation.set(...rotation);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function alignToDirection(object: THREE.Object3D, direction: THREE.Vector3) {
  object.quaternion.setFromUnitVectors(Y_AXIS, direction.clone().normalize());
}

function addStraight(
  parent: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  radialSegments = 28,
) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  if (length < 0.025) return null;
  const pipe = mesh(new THREE.CylinderGeometry(radius, radius, length, radialSegments, 1, false), material);
  pipe.position.copy(from).add(to).multiplyScalar(0.5);
  alignToDirection(pipe, direction);
  parent.add(pipe);
  return pipe;
}

function addCurvedElbow(
  parent: THREE.Object3D,
  start: THREE.Vector3,
  corner: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  radialSegments = 28,
) {
  const curve = new THREE.QuadraticBezierCurve3(start, corner, end);
  const tubularSegments = Math.max(10, Math.ceil(curve.getLength() * 8));
  const elbow = mesh(new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false), material);
  parent.add(elbow);
  return elbow;
}

function addRoute(parent: THREE.Object3D, rawPoints: readonly Point[], options: RouteOptions) {
  const points = rawPoints.map(vector);
  const bendRadius = options.bendRadius ?? options.radius * 2.35;
  const radialSegments = options.radialSegments ?? 28;
  let cursor = points[0].clone();

  for (let index = 1; index < points.length; index += 1) {
    const corner = points[index];
    if (index === points.length - 1) {
      addStraight(parent, cursor, corner, options.radius, options.material, radialSegments);
      break;
    }

    const incoming = new THREE.Vector3().subVectors(corner, points[index - 1]);
    const outgoing = new THREE.Vector3().subVectors(points[index + 1], corner);
    const incomingLength = incoming.length();
    const outgoingLength = outgoing.length();
    if (incomingLength < 0.025 || outgoingLength < 0.025) continue;
    incoming.normalize();
    outgoing.normalize();

    if (Math.abs(incoming.dot(outgoing)) > 0.995) continue;

    const trim = Math.min(bendRadius, incomingLength * 0.36, outgoingLength * 0.36);
    const elbowStart = corner.clone().addScaledVector(incoming, -trim);
    const elbowEnd = corner.clone().addScaledVector(outgoing, trim);
    addStraight(parent, cursor, elbowStart, options.radius, options.material, radialSegments);
    addCurvedElbow(parent, elbowStart, corner, elbowEnd, options.radius, options.material, radialSegments);
    cursor = elbowEnd;
  }
}

function addReducer(
  parent: THREE.Object3D,
  from: Point,
  to: Point,
  fromRadius: number,
  toRadius: number,
  material: THREE.Material,
) {
  const start = vector(from);
  const end = vector(to);
  const direction = end.clone().sub(start);
  const reducer = mesh(new THREE.CylinderGeometry(toRadius, fromRadius, direction.length(), 32, 3, false), material);
  reducer.position.copy(start).add(end).multiplyScalar(0.5);
  alignToDirection(reducer, direction);
  parent.add(reducer);
  return reducer;
}

function createOwnedMaterials(palette: IndustrialPipePalette) {
  return {
    flange: palette.darkSteel.clone(),
    galvanized: new THREE.MeshStandardMaterial({ color: 0x84918d, roughness: 0.31, metalness: 0.82 }),
    bolt: new THREE.MeshStandardMaterial({ color: 0x69736f, roughness: 0.36, metalness: 0.84 }),
    rust: new THREE.MeshStandardMaterial({ color: 0x6d321d, roughness: 0.82, metalness: 0.34 }),
    weld: new THREE.MeshStandardMaterial({ color: 0x3d4642, roughness: 0.5, metalness: 0.74 }),
    gasket: new THREE.MeshStandardMaterial({ color: 0x131817, roughness: 0.94, metalness: 0.02 }),
    labelFace: new THREE.MeshStandardMaterial({ color: 0xe1e3d9, roughness: 0.62, metalness: 0.08 }),
  };
}

function addFlangePair(
  parent: THREE.Object3D,
  point: Point,
  directionPoint: Point,
  radius: number,
  paint: THREE.Material,
  owned: ReturnType<typeof createOwnedMaterials>,
) {
  const flange = new THREE.Group();
  const direction = vector(directionPoint).normalize();
  flange.position.copy(vector(point));
  alignToDirection(flange, direction);

  const plateRadius = radius * 1.48;
  const plateThickness = Math.max(0.12, radius * 0.3);
  const gasketThickness = Math.max(0.026, radius * 0.07);
  const totalThickness = plateThickness * 2 + gasketThickness;
  const plateGeometry = new THREE.CylinderGeometry(plateRadius, plateRadius, plateThickness, 32, 1, false);
  const hubGeometry = new THREE.CylinderGeometry(radius * 1.14, radius * 1.14, plateThickness * 1.5, 32, 1, false);
  const leftY = -(gasketThickness + plateThickness) * 0.5;
  const rightY = -leftY;

  flange.add(mesh(plateGeometry, paint, [0, leftY, 0]));
  flange.add(mesh(plateGeometry.clone(), paint, [0, rightY, 0]));
  flange.add(mesh(hubGeometry, paint, [0, -totalThickness * 0.72, 0]));
  flange.add(mesh(hubGeometry.clone(), paint, [0, totalThickness * 0.72, 0]));
  flange.add(mesh(new THREE.CylinderGeometry(radius * 1.35, radius * 1.35, gasketThickness, 32), owned.gasket));

  for (const y of [-totalThickness * 0.51, totalThickness * 0.51]) {
    flange.add(mesh(new THREE.CylinderGeometry(plateRadius * 1.012, plateRadius * 1.012, 0.022, 32), owned.rust, [0, y, 0]));
  }

  const boltCount = radius > 0.38 ? 10 : 8;
  const boltCircle = radius * 1.25;
  const boltRadius = Math.max(0.026, radius * 0.075);
  const boltLength = totalThickness * 1.22;
  const boltShafts = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(boltRadius, boltRadius, boltLength, 10),
    owned.bolt,
    boltCount,
  );
  const boltNuts = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(boltRadius * 1.55, boltRadius * 1.55, boltRadius * 0.72, 6),
    owned.bolt,
    boltCount * 2,
  );
  boltShafts.castShadow = true;
  boltShafts.receiveShadow = true;
  boltNuts.castShadow = true;
  boltNuts.receiveShadow = true;
  const instanceMatrix = new THREE.Matrix4();
  for (let index = 0; index < boltCount; index += 1) {
    const angle = (index / boltCount) * Math.PI * 2;
    const x = Math.cos(angle) * boltCircle;
    const z = Math.sin(angle) * boltCircle;
    boltShafts.setMatrixAt(index, instanceMatrix.makeTranslation(x, 0, z));
    boltNuts.setMatrixAt(index * 2, instanceMatrix.makeTranslation(x, -boltLength * 0.53, z));
    boltNuts.setMatrixAt(index * 2 + 1, instanceMatrix.makeTranslation(x, boltLength * 0.53, z));
  }
  boltShafts.instanceMatrix.needsUpdate = true;
  boltNuts.instanceMatrix.needsUpdate = true;
  flange.add(boltShafts, boltNuts);

  parent.add(flange);
  return flange;
}

function addWeldCollar(
  parent: THREE.Object3D,
  point: Point,
  directionPoint: Point,
  radius: number,
  material: THREE.Material,
) {
  const collar = mesh(new THREE.CylinderGeometry(radius * 1.065, radius * 1.065, Math.max(0.045, radius * 0.11), 24), material);
  collar.position.copy(vector(point));
  alignToDirection(collar, vector(directionPoint));
  parent.add(collar);
  return collar;
}

function addIdentificationBands(
  parent: THREE.Object3D,
  point: Point,
  directionPoint: Point,
  radius: number,
  material: THREE.Material,
) {
  const direction = vector(directionPoint).normalize();
  for (const offset of [-radius * 0.34, radius * 0.34]) {
    const band = mesh(new THREE.CylinderGeometry(radius * 1.018, radius * 1.018, radius * 0.23, 28), material);
    band.position.copy(vector(point)).addScaledVector(direction, offset);
    alignToDirection(band, direction);
    parent.add(band);
  }
}

function addTeeCollar(
  parent: THREE.Object3D,
  point: Point,
  mainDirection: Point,
  radius: number,
  owned: ReturnType<typeof createOwnedMaterials>,
) {
  addWeldCollar(parent, point, mainDirection, radius, owned.weld);
  const reinforcement = mesh(new THREE.SphereGeometry(radius * 1.14, 20, 14), owned.weld, point);
  reinforcement.scale.set(1, 0.72, 0.72);
  parent.add(reinforcement);
}

function addLowPipeSupport(
  parent: THREE.Object3D,
  point: Point,
  radius: number,
  palette: IndustrialPipePalette,
  owned: ReturnType<typeof createOwnedMaterials>,
) {
  const [x, y, z] = point;
  const footingHeight = 0.18;
  const beamY = y - radius - 0.11;
  const postHeight = Math.max(0.25, beamY - footingHeight);
  parent.add(mesh(new THREE.BoxGeometry(1.05, footingHeight, 1.28), palette.concrete, [x, footingHeight * 0.5, z]));
  parent.add(mesh(new THREE.BoxGeometry(0.19, postHeight, 0.2), palette.darkSteel, [x, footingHeight + postHeight * 0.5, z]));
  parent.add(mesh(new THREE.BoxGeometry(0.24, 0.16, 1.38), owned.galvanized, [x, beamY, z]));
  parent.add(mesh(new THREE.BoxGeometry(0.47, 0.08, 0.16), owned.gasket, [x, y - radius * 1.01, z]));
  const clamp = mesh(new THREE.TorusGeometry(radius * 1.075, Math.max(0.025, radius * 0.07), 8, 28), owned.galvanized, [x, y, z], [0, Math.PI / 2, 0]);
  parent.add(clamp);
  for (const side of [-1, 1]) {
    parent.add(mesh(new THREE.CylinderGeometry(0.026, 0.026, radius * 0.85, 8), owned.bolt, [x, y - radius * 0.78, z + side * radius * 1.08]));
  }
}

function addRackHanger(
  parent: THREE.Object3D,
  x: number,
  pipeY: number,
  pipeZ: number,
  radius: number,
  topY: number,
  owned: ReturnType<typeof createOwnedMaterials>,
) {
  const clamp = mesh(new THREE.TorusGeometry(radius * 1.11, Math.max(0.022, radius * 0.08), 8, 28), owned.galvanized, [x, pipeY, pipeZ], [0, Math.PI / 2, 0]);
  parent.add(clamp);
  const rodHeight = Math.max(0.2, topY - pipeY - radius * 0.2);
  for (const zOffset of [-radius * 1.14, radius * 1.14]) {
    parent.add(mesh(new THREE.CylinderGeometry(0.028, 0.028, rodHeight, 8), owned.bolt, [x, pipeY + rodHeight * 0.5, pipeZ + zOffset]));
    parent.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8), owned.bolt, [x, topY, pipeZ + zOffset]));
  }
  parent.add(mesh(new THREE.BoxGeometry(0.2, 0.1, radius * 2.75), owned.galvanized, [x, pipeY - radius * 1.12, pipeZ]));
}

function createMarkerTexture(label: string, accent: string, textures: THREE.Texture[]) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 176;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "rgba(11,20,20,.96)";
  context.fillRect(5, 5, 758, 166);
  context.strokeStyle = accent;
  context.lineWidth = 8;
  context.strokeRect(5, 5, 758, 166);
  context.fillStyle = accent;
  context.beginPath();
  context.moveTo(52, 88);
  context.lineTo(112, 49);
  context.lineTo(112, 72);
  context.lineTo(176, 72);
  context.lineTo(176, 104);
  context.lineTo(112, 104);
  context.lineTo(112, 127);
  context.closePath();
  context.fill();
  context.fillStyle = "#e8eeeb";
  context.font = "800 45px Arial";
  context.textBaseline = "middle";
  context.fillText(label, 210, 88);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textures.push(texture);
  return texture;
}

function addPipeMarker(
  parent: THREE.Object3D,
  label: string,
  accent: string,
  position: Point,
  scale: readonly [number, number],
  textures: THREE.Texture[],
) {
  const texture = createMarkerTexture(label, accent, textures);
  const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  marker.position.set(...position);
  marker.scale.set(scale[0], scale[1], 1);
  parent.add(marker);
}

function createGaugeTexture(textures: THREE.Texture[]) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 384;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#e8e4d7";
  context.fillRect(0, 0, 384, 384);
  context.strokeStyle = "#1b2524";
  context.lineWidth = 10;
  context.beginPath();
  context.arc(192, 192, 172, 0, Math.PI * 2);
  context.stroke();
  context.save();
  context.translate(192, 192);
  for (let index = 0; index < 25; index += 1) {
    const angle = -2.35 + (index / 24) * 4.7;
    context.save();
    context.rotate(angle);
    context.strokeStyle = index > 19 ? "#ba3f2d" : "#283230";
    context.lineWidth = index % 4 === 0 ? 8 : 4;
    context.beginPath();
    context.moveTo(0, -145);
    context.lineTo(0, index % 4 === 0 ? -120 : -130);
    context.stroke();
    context.restore();
  }
  context.restore();
  context.fillStyle = "#27312f";
  context.font = "700 28px Arial";
  context.textAlign = "center";
  context.fillText("bar", 192, 254);
  context.fillText("P-204 DISCHARGE", 192, 290);
  context.strokeStyle = "#c54b30";
  context.lineWidth = 9;
  context.beginPath();
  context.moveTo(192, 192);
  context.lineTo(112, 92);
  context.stroke();
  context.fillStyle = "#1d2826";
  context.beginPath();
  context.arc(192, 192, 15, 0, Math.PI * 2);
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textures.push(texture);
  return texture;
}

function addDischargeGauge(
  parent: THREE.Object3D,
  palette: IndustrialPipePalette,
  owned: ReturnType<typeof createOwnedMaterials>,
  textures: THREE.Texture[],
) {
  addStraight(parent, vector([1.4, 4.75, -10]), vector([1.4, 4.75, -9.25]), 0.058, palette.brass, 12);
  addWeldCollar(parent, [1.4, 4.75, -9.98], [0, 0, 1], 0.082, owned.weld);
  const gauge = new THREE.Group();
  gauge.position.set(1.4, 4.75, -9.04);
  gauge.add(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.18, 32), palette.brass, [0, 0, 0], [Math.PI / 2, 0, 0]));
  gauge.add(mesh(new THREE.CircleGeometry(0.31, 40), new THREE.MeshStandardMaterial({ map: createGaugeTexture(textures), roughness: 0.72 }), [0, 0, 0.102]));
  gauge.add(mesh(new THREE.TorusGeometry(0.325, 0.025, 8, 40), owned.galvanized, [0, 0, 0.113]));
  parent.add(gauge);
}

function addDrainTermination(
  parent: THREE.Object3D,
  palette: IndustrialPipePalette,
  owned: ReturnType<typeof createOwnedMaterials>,
) {
  addRoute(parent, [
    [2.15, 0.42, -8.9], [2.15, 0.42, -5], [20.5, 0.42, -5], [20.5, 0.42, -1.2], [20.5, 0.18, -1.2], [22.1, 0.18, -1.2],
  ], { radius: 0.115, material: palette.darkSteel, bendRadius: 0.3, radialSegments: 18 });
  for (const x of [5.5, 10, 14.5, 19]) {
    parent.add(mesh(new THREE.BoxGeometry(0.18, 0.33, 0.62), owned.galvanized, [x, 0.18, -5]));
    parent.add(mesh(new THREE.TorusGeometry(0.14, 0.02, 7, 20), owned.galvanized, [x, 0.42, -5], [0, Math.PI / 2, 0]));
  }
  addFlangePair(parent, [2.15, 0.42, -8.9], [0, 0, 1], 0.115, palette.darkSteel, owned);
}

export function buildIndustrialPipeSystem(parent: THREE.Object3D, palette: IndustrialPipePalette) {
  const root = new THREE.Group();
  root.name = "Detailed modular process pipe system";
  parent.add(root);
  const owned = createOwnedMaterials(palette);
  const textures: THREE.Texture[] = [];

  // Raw-water suction header, set behind the pump gallery so it never cuts through the machinery.
  addRoute(root, [
    [16.5, 3, -23.35], [16.5, 3, -17], [18, 3, -17], [18, 1.62, -17], [18, 1.62, -15], [3.8, 1.62, -15],
  ], { radius: 0.5, material: palette.teal, bendRadius: 0.78, radialSegments: 32 });
  addRoute(root, [[7.15, 1.62, -15], [7.15, 1.62, -10], [4.2, 1.62, -10]], { radius: 0.5, material: palette.teal, bendRadius: 0.72, radialSegments: 32 });
  addReducer(root, [4.2, 1.62, -10], [3.38, 1.62, -10], 0.5, 0.42, palette.teal);
  addRoute(root, [[15.7, 1.62, -15], [15.7, 1.62, -10.5], [12.32, 1.62, -10.5]], { radius: 0.46, material: palette.teal, bendRadius: 0.68, radialSegments: 30 });

  addTeeCollar(root, [7.15, 1.62, -15], [1, 0, 0], 0.5, owned);
  addTeeCollar(root, [15.7, 1.62, -15], [1, 0, 0], 0.5, owned);
  addFlangePair(root, [16.5, 3, -23.35], [0, 0, 1], 0.5, palette.teal, owned);
  addFlangePair(root, [3.38, 1.62, -10], [1, 0, 0], 0.42, palette.teal, owned);
  addFlangePair(root, [12.32, 1.62, -10.5], [1, 0, 0], 0.4, palette.teal, owned);
  addIdentificationBands(root, [10.6, 1.62, -15], [1, 0, 0], 0.5, owned.labelFace);
  for (const x of [4.65, 8.5, 11.1, 17.1]) addLowPipeSupport(root, [x, 1.62, -15], 0.5, palette, owned);
  addLowPipeSupport(root, [4.45, 1.62, -10], 0.5, palette, owned);
  addLowPipeSupport(root, [12.1, 1.62, -10.5], 0.46, palette, owned);

  // Pump discharge risers and the shared treated-water header.
  addRoute(root, [[1.4, 3.45, -10], [1.4, 6.7, -10], [1.4, 6.7, -20.5]], { radius: 0.34, material: palette.orange, bendRadius: 0.62, radialSegments: 30 });
  addRoute(root, [[10.2, 2.95, -10.5], [10.2, 6.7, -10.5], [10.2, 6.7, -20.5]], { radius: 0.3, material: palette.orange, bendRadius: 0.56, radialSegments: 28 });
  addRoute(root, [[-24, 6.7, -20.5], [24, 6.7, -20.5]], { radius: 0.32, material: palette.orange, radialSegments: 30 });
  addTeeCollar(root, [1.4, 6.7, -20.5], [1, 0, 0], 0.34, owned);
  addTeeCollar(root, [10.2, 6.7, -20.5], [1, 0, 0], 0.32, owned);
  addFlangePair(root, [1.4, 3.52, -10], [0, 1, 0], 0.34, palette.orange, owned);
  addFlangePair(root, [10.2, 3.02, -10.5], [0, 1, 0], 0.3, palette.orange, owned);
  for (const x of [-17, -7.5, 4.5, 16.5]) addFlangePair(root, [x, 6.7, -20.5], [1, 0, 0], 0.32, palette.orange, owned);
  addIdentificationBands(root, [6.6, 6.7, -20.5], [1, 0, 0], 0.32, owned.labelFace);

  // Filter inlet risers terminate at the front nozzles instead of disappearing inside the tank meshes.
  for (const x of [-16.5, 16.5]) {
    addRoute(root, [[x, 6.7, -20.5], [x, 9.5, -20.5], [x, 9.5, -23.35]], { radius: 0.28, material: palette.orange, bendRadius: 0.5, radialSegments: 26 });
    addTeeCollar(root, [x, 6.7, -20.5], [1, 0, 0], 0.32, owned);
    addFlangePair(root, [x, 9.5, -23.35], [0, 0, 1], 0.28, palette.orange, owned);
  }

  // Parallel utility lines give the rack a believable plant hierarchy.
  addRoute(root, [[-24, 5.3, -18.95], [24, 5.3, -18.95]], { radius: 0.22, material: palette.teal, radialSegments: 24 });
  addRoute(root, [[-24, 7.62, -18.1], [24, 7.62, -18.1]], { radius: 0.09, material: owned.galvanized, radialSegments: 16 });
  for (const x of [-18, -9, 0, 9, 18]) {
    addRackHanger(root, x, 6.7, -20.5, 0.32, 9.72, owned);
    addRackHanger(root, x, 5.3, -18.95, 0.22, 9.72, owned);
    addRackHanger(root, x, 7.62, -18.1, 0.09, 9.72, owned);
  }
  for (const x of [-20, -12, -4, 4, 12, 20]) {
    addWeldCollar(root, [x, 5.3, -18.95], [1, 0, 0], 0.22, owned.weld);
    addWeldCollar(root, [x, 7.62, -18.1], [1, 0, 0], 0.09, owned.weld);
  }

  addPipeMarker(root, "RAW WATER  ·  SUCTION", "#56b7aa", [10.5, 2.72, -14.55], [4.5, 1.03], textures);
  addPipeMarker(root, "TREATED WATER  ·  DISCHARGE", "#ef9e2f", [4.6, 7.55, -20.05], [5.2, 1.12], textures);
  addPipeMarker(root, "INSTRUMENT AIR", "#cbd4cf", [15.2, 8.05, -17.85], [2.5, 0.58], textures);
  addDischargeGauge(root, palette, owned, textures);
  addDrainTermination(root, palette, owned);

  // Stained weld collars make long runs read as fabricated sections rather than perfect tubes.
  for (const x of [5.2, 9.1, 12.7, 16.4]) addWeldCollar(root, [x, 1.62, -15], [1, 0, 0], 0.5, owned.rust);
  for (const y of [4.1, 5.25]) addWeldCollar(root, [1.4, y, -10], [0, 1, 0], 0.34, owned.rust);

  return {
    group: root,
    dispose() {
      textures.forEach((texture) => texture.dispose());
    },
  };
}
