export class Color {
  constructor(value?: number | string);
  value: number;
}
export class Vector3 {
  constructor(x?: number, y?: number, z?: number);
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): this;
}
export class Euler extends Vector3 {}
export class Object3D {
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
  children: Object3D[];
  visible: boolean;
  add(...items: Object3D[]): this;
}
export class Scene extends Object3D {
  background: Color | null;
  fog: Fog | null;
}
export class PerspectiveCamera extends Object3D {
  constructor(fov: number, aspect: number, near: number, far: number);
  aspect: number;
  fov: number;
  updateProjectionMatrix(): void;
  lookAt(x: number, y: number, z: number): void;
}
export class BufferGeometry {
  kind: string;
  args: number[];
}
export class BoxGeometry extends BufferGeometry {
  constructor(w?: number, h?: number, d?: number);
}
export class PlaneGeometry extends BufferGeometry {
  constructor(w?: number, h?: number);
}
export class CylinderGeometry extends BufferGeometry {
  constructor(rt?: number, rb?: number, h?: number, segments?: number);
}
export class MeshStandardMaterial {
  constructor(options?: {
    color?: number | string;
    emissive?: number | string;
    emissiveIntensity?: number;
    roughness?: number;
    metalness?: number;
    transparent?: boolean;
    opacity?: number;
  });
  color: Color;
  emissive: Color;
  emissiveIntensity: number;
  transparent: boolean;
  opacity: number;
}
export class MeshBasicMaterial extends MeshStandardMaterial {}
export class Mesh extends Object3D {
  constructor(geometry: BufferGeometry, material: MeshStandardMaterial);
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
}
export class AmbientLight extends Object3D {
  constructor(color?: number, intensity?: number);
  color: Color;
  intensity: number;
}
export class DirectionalLight extends AmbientLight {}
export class PointLight extends AmbientLight {
  constructor(color?: number, intensity?: number, distance?: number);
  distance: number;
}
export class Fog {
  constructor(color: number, near: number, far: number);
}
export class Clock {
  getDelta(): number;
}
export class WebGLRenderer {
  constructor(options?: { antialias?: boolean; alpha?: boolean });
  domElement: HTMLCanvasElement;
  setPixelRatio(n: number): void;
  setSize(w: number, h: number): void;
  setAnimationLoop(fn: ((time: number) => void) | null): void;
  render(scene: Scene, camera: PerspectiveCamera): void;
  dispose(): void;
  shadowMap: { enabled: boolean };
  outputColorSpace: string;
}
export const SRGBColorSpace: string;
