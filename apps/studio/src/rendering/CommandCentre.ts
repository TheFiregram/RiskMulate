import * as THREE from "three";
import type { StationId } from "../scenario";

export type Quality = "LOW" | "MEDIUM" | "HIGH";
const stationPositions: Record<StationId, [number, number, number]> = {
  cctv: [-7.5, 2.3, -7.8],
  evidence: [-4.6, 1.7, -5.8],
  comms: [-1.6, 1.3, -5.2],
  network: [1.6, 1.3, -5.2],
  news: [4.6, 1.7, -5.8],
  risk: [7.5, 2.3, -7.8],
  employee: [-5.8, 1.2, -1.8],
  executive: [5.8, 1.2, -1.8],
};

export class CommandCentre {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(62, 1, 0.1, 100);
  private keys = new Set<string>();
  private screens: THREE.Mesh[] = [];
  private clock = new THREE.Clock();
  private yaw = 0;
  private dragging = false;
  private lastX = 0;
  private alert = false;
  private reducedMotion = false;
  private cinematicStart = 0;
  private controlEnabled = true;
  private target: StationId | null = null;
  onPrompt?: (station: StationId | null) => void;
  onInteract?: (station: StationId) => void;
  private onKeyDown = (event: KeyboardEvent) => {
    this.keys.add(event.code);
    if ((event.code === "KeyE" || event.code === "Enter") && this.controlEnabled && this.target)
      this.onInteract?.(this.target);
  };
  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };
  constructor(
    private container: HTMLElement,
    quality: Quality = "HIGH",
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: quality !== "LOW" });
    this.renderer.domElement.dataset.renderer = "three";
    this.renderer.domElement.setAttribute("aria-label", "Three.js command centre canvas");
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, quality === "LOW" ? 1 : 1.6));
    this.container.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x02070c);
    this.scene.fog = new THREE.Fog(0x02070c, 10, 35);
    this.camera.position.set(0, 2.1, 7);
    this.buildRoom();
    this.bind();
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }
  private mesh(
    geometry: THREE.BufferGeometry,
    color: number,
    x: number,
    y: number,
    z: number,
    emissive = 0,
  ) {
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: emissive ? 0.65 : 0,
      roughness: 0.55,
      metalness: 0.35,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    return mesh;
  }
  private buildRoom() {
    this.scene.add(new THREE.AmbientLight(0x5b7892, 1.2));
    const key = new THREE.DirectionalLight(0x9bc8e8, 2);
    key.position.set(2, 8, 5);
    this.scene.add(key);
    this.mesh(new THREE.BoxGeometry(22, 0.3, 24), 0x111a20, 0, -0.2, -3);
    this.mesh(new THREE.BoxGeometry(22, 8, 0.3), 0x09141c, 0, 4, -10);
    this.mesh(new THREE.BoxGeometry(0.3, 8, 24), 0x071219, -11, 4, -3);
    this.mesh(new THREE.BoxGeometry(0.3, 8, 24), 0x071219, 11, 4, -3);
    for (let x = -10; x <= 10; x += 2)
      this.mesh(new THREE.BoxGeometry(0.025, 0.02, 22), 0x244553, x, 0.01, -3, 0x1b789b);
    for (let z = -13; z <= 8; z += 2)
      this.mesh(new THREE.BoxGeometry(20, 0.02, 0.025), 0x244553, 0, 0.02, z, 0x1b789b);
    for (let x = -8; x <= 8; x += 4)
      this.mesh(new THREE.BoxGeometry(2.7, 0.08, 0.14), 0xc7e8f5, x, 6.8, -4, 0x8bdcff);
    Object.entries(stationPositions).forEach(([id, [x, y, z]]) => {
      const desk = this.mesh(new THREE.BoxGeometry(3, 0.22, 1.15), 0x18272f, x, 0.75, z);
      desk.rotation.x = -0.08;
      const screen = this.mesh(
        new THREE.BoxGeometry(2.6, 1.25, 0.12),
        0x123847,
        x,
        y,
        z - 0.42,
        0x2ba9d3,
      );
      screen.rotation.y = x * 0.018;
      this.screens.push(screen);
      this.mesh(new THREE.BoxGeometry(0.14, 1.3, 0.14), 0x24343b, x - 0.8, 0.15, z);
      this.mesh(new THREE.BoxGeometry(0.14, 1.3, 0.14), 0x24343b, x + 0.8, 0.15, z);
      screen.position.y += id === "executive" ? 0.15 : 0;
    });
    for (let x = -8; x <= 8; x += 2.6) {
      const chair = this.mesh(new THREE.BoxGeometry(1, 0.12, 1), 0x182228, x, 0.5, -1);
      chair.rotation.y = x * 0.1;
      this.mesh(new THREE.BoxGeometry(1, 0.9, 0.12), 0x1b2830, x, 1, -1.35);
    }
    const table = this.mesh(new THREE.CylinderGeometry(3.2, 3.5, 0.28, 16), 0x1b2b32, 0, 0.65, -1);
    table.rotation.y = 0.2;
    // Visible staff give the command centre scale and react to the crisis lighting.
    for (const [x, z, color] of [
      [-2.8, -2.3, 0xd8a36d],
      [2.7, -2.5, 0x8f6652],
      [-6, -4.5, 0xb78363],
    ] as const) {
      this.mesh(new THREE.CylinderGeometry(0.24, 0.31, 1.25, 8), color, x, 1.15, z);
      this.mesh(new THREE.BoxGeometry(0.48, 0.72, 0.28), 0x263844, x, 0.62, z);
    }
    // Maya Chen's persistent call monitor and the server bank are physical scene objects.
    this.mesh(new THREE.BoxGeometry(2.4, 1.5, 0.18), 0x163e50, -8.2, 3.9, -9.7, 0x43c7f2);
    for (let x = -1.8; x <= 1.8; x += 0.9)
      this.mesh(new THREE.BoxGeometry(0.68, 2.7, 0.75), 0x111d24, x, 1.35, -9.4, 0x1b789b);
  }
  private bind() {
    addEventListener("resize", () => this.resize());
    addEventListener("keydown", this.onKeyDown);
    addEventListener("keyup", this.onKeyUp);
    const c = this.renderer.domElement;
    c.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener("pointerup", () => (this.dragging = false));
    c.addEventListener("pointermove", (e) => {
      if (this.dragging && !this.reducedMotion) {
        this.yaw -= (e.clientX - this.lastX) * 0.004;
        this.lastX = e.clientX;
      }
    });
  }
  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }
  private frame() {
    const dt = Math.min(0.04, this.clock.getDelta()),
      speed = 3.2 * dt;
    if (this.cinematicStart) {
      const t = (performance.now() - this.cinematicStart) / 1000;
      this.camera.position.x = Math.sin(t * 0.35) * (t < 4 ? 6 : 1.2);
      this.camera.position.y = t < 4 ? 3.4 : 2.1;
      this.camera.position.z = 12 - Math.min(10, t * 1.25);
      this.yaw = Math.sin(t * 0.3) * 0.13;
      if (t > 6) this.setAlert(true);
    } else if (this.keys.has("KeyA")) this.camera.position.x -= speed;
    if (this.keys.has("KeyD")) this.camera.position.x += speed;
    if (this.keys.has("KeyW")) {
      this.camera.position.x -= Math.sin(this.yaw) * speed;
      this.camera.position.z -= Math.cos(this.yaw) * speed;
    }
    if (this.keys.has("KeyS")) {
      this.camera.position.x += Math.sin(this.yaw) * speed;
      this.camera.position.z += Math.cos(this.yaw) * speed;
    }
    this.camera.position.x = Math.max(-8, Math.min(8, this.camera.position.x));
    this.camera.position.z = Math.max(-7, Math.min(8, this.camera.position.z));
    this.camera.rotation.y = this.yaw;
    if (!this.cinematicStart) {
      let best: StationId | null = null,
        bestScore = Number.POSITIVE_INFINITY;
      for (const [id, [x, , z]] of Object.entries(stationPositions) as [
        StationId,
        [number, number, number],
      ][]) {
        const dx = x - this.camera.position.x,
          dz = z - this.camera.position.z,
          angle = Math.abs(Math.atan2(-dx, -dz) - this.yaw);
        const score = angle * 8 + Math.hypot(dx, dz) * 0.035;
        if (angle < 0.38 && score < bestScore) {
          best = id;
          bestScore = score;
        }
      }
      if (best !== this.target) {
        this.target = best;
        this.onPrompt?.(best);
      }
    }
    const t = performance.now() * 0.002;
    this.screens.forEach((s, i) => {
      const m = s.material;
      m.emissiveIntensity = (this.alert ? 1.25 : 0.48) + Math.sin(t + i) * 0.16;
    });
    this.renderer.render(this.scene, this.camera);
  }
  focus(id: StationId) {
    const [x, , z] = stationPositions[id];
    if (!this.reducedMotion) {
      this.camera.position.x = x * 0.48;
      this.camera.position.z = Math.max(z + 5, -2);
      this.yaw = Math.atan2(-x * 0.52, -z - this.camera.position.z);
    }
  }
  playOpening() {
    this.controlEnabled = false;
    this.cinematicStart = performance.now();
  }
  grantControl() {
    this.cinematicStart = 0;
    this.controlEnabled = true;
    this.setAlert(true);
    this.camera.position.set(0, 2.1, 3.5);
  }
  setAlert(active: boolean) {
    this.alert = active;
    this.scene.background = new THREE.Color(active ? 0x170407 : 0x02070c);
  }
  setReducedMotion(v: boolean) {
    this.reducedMotion = v;
  }
  setQuality(q: Quality) {
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, q === "LOW" ? 1 : q === "MEDIUM" ? 1.25 : 1.6),
    );
    this.resize();
  }
  dispose() {
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
    removeEventListener("keydown", this.onKeyDown);
    removeEventListener("keyup", this.onKeyUp);
    this.renderer.domElement.remove();
  }
}
