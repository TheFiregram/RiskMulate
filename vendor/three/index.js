const hex = (v) =>
  typeof v === "number" ? v : Number.parseInt(String(v).replace("#", ""), 16) || 0;
export class Color {
  constructor(v = 0xffffff) {
    this.value = hex(v);
  }
}
export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}
export class Euler extends Vector3 {}
export class Object3D {
  constructor() {
    this.position = new Vector3();
    this.rotation = new Euler();
    this.scale = new Vector3(1, 1, 1);
    this.children = [];
    this.visible = true;
  }
  add(...x) {
    this.children.push(...x);
    return this;
  }
}
export class Scene extends Object3D {
  constructor() {
    super();
    this.background = null;
    this.fog = null;
  }
}
export class PerspectiveCamera extends Object3D {
  constructor(fov = 60, aspect = 1, near = 0.1, far = 100) {
    super();
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.target = new Vector3();
  }
  lookAt(x, y, z) {
    this.target.set(x, y, z);
  }
  updateProjectionMatrix() {}
}
export class BufferGeometry {
  constructor(kind, ...args) {
    this.kind = kind;
    this.args = args;
  }
}
export class BoxGeometry extends BufferGeometry {
  constructor(...a) {
    super("box", ...(a.length ? a : [1, 1, 1]));
  }
}
export class PlaneGeometry extends BufferGeometry {
  constructor(...a) {
    super("plane", ...(a.length ? a : [1, 1]));
  }
}
export class CylinderGeometry extends BufferGeometry {
  constructor(...a) {
    super("cylinder", ...(a.length ? a : [1, 1, 1, 12]));
  }
}
export class MeshStandardMaterial {
  constructor(o = {}) {
    this.color = new Color(o.color ?? 0xffffff);
    this.emissive = new Color(o.emissive ?? 0);
    this.emissiveIntensity = o.emissiveIntensity ?? 0;
    this.transparent = !!o.transparent;
    this.opacity = o.opacity ?? 1;
  }
}
export class MeshBasicMaterial extends MeshStandardMaterial {}
export class Mesh extends Object3D {
  constructor(g, m) {
    super();
    this.geometry = g;
    this.material = m;
  }
}
export class AmbientLight extends Object3D {
  constructor(c = 0xffffff, i = 1) {
    super();
    this.color = new Color(c);
    this.intensity = i;
  }
}
export class DirectionalLight extends AmbientLight {}
export class PointLight extends AmbientLight {
  constructor(c, i, d = 0) {
    super(c, i);
    this.distance = d;
  }
}
export class Fog {
  constructor(c, n, f) {
    this.color = new Color(c);
    this.near = n;
    this.far = f;
  }
}
export class Clock {
  constructor() {
    this.t = performance.now();
  }
  getDelta() {
    let n = performance.now(),
      d = (n - this.t) / 1000;
    this.t = n;
    return d;
  }
}
const V = `attribute vec3 p;uniform mat4 m;void main(){gl_Position=m*vec4(p,1.);}`;
const F = `precision mediump float;uniform vec3 c;uniform float a;void main(){gl_FragColor=vec4(c,a);}`;
const cube = [
  -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1,
  -1, -1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, -1, -1, 1, 1, 1, 1, 1, 1,
  -1, -1, 1, 1, 1, -1, 1, -1, -1, -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, -1, -1, 1, 1, -1, 1, 1, -1,
  -1, -1, 1, 1, -1, 1, 1, 1, -1, -1, -1, 1, 1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1,
  -1, -1, -1, 1, -1, 1, 1, 1, -1, -1, -1, 1, 1, 1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1, 1, -1, 1, -1,
  -1, 1, -1, 1, 1, 1, 1, 1, -1, -1, 1, 1, 1, -1, 1,
];
const mul = (a, b) => {
  let r = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      for (let k = 0; k < 4; k++) r[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
  return r;
};
const model = (o) => {
  let [x, y, z] = [o.rotation.x, o.rotation.y, o.rotation.z],
    cx = Math.cos(x),
    sx = Math.sin(x),
    cy = Math.cos(y),
    sy = Math.sin(y),
    cz = Math.cos(z),
    sz = Math.sin(z),
    [X, Y, Z] = [o.scale.x, o.scale.y, o.scale.z];
  return new Float32Array([
    cy * cz * X,
    (sx * sy * cz - cx * sz) * X,
    (cx * sy * cz + sx * sz) * X,
    0,
    cy * sz * Y,
    (sx * sy * sz + cx * cz) * Y,
    (cx * sy * sz - sx * cz) * Y,
    0,
    -sy * Z,
    sx * cy * Z,
    cx * cy * Z,
    0,
    o.position.x,
    o.position.y,
    o.position.z,
    1,
  ]);
};
const vp = (c) => {
  let p = 1 / Math.tan((c.fov * Math.PI) / 360),
    a = new Float32Array([p / c.aspect, 0, 0, 0, 0, p, 0, 0, 0, 0, -1, -1, 0, 0, -0.2, 0]);
  let y = -c.rotation.y,
    co = Math.cos(y),
    si = Math.sin(y),
    v = new Float32Array([co, 0, -si, 0, 0, 1, 0, 0, si, 0, co, 0, 0, 0, 0, 1]);
  v[12] = -(v[0] * c.position.x + v[4] * c.position.y + v[8] * c.position.z);
  v[13] = -c.position.y;
  v[14] = -(v[2] * c.position.x + v[6] * c.position.y + v[10] * c.position.z);
  return mul(p, v);
};
export class WebGLRenderer {
  constructor() {
    this.domElement = document.createElement("canvas");
    this.gl = this.domElement.getContext("webgl", { antialias: true });
    if (!this.gl) throw Error("WebGL unavailable");
    let g = this.gl,
      sh = (t, s) => {
        let x = g.createShader(t);
        g.shaderSource(x, s);
        g.compileShader(x);
        return x;
      };
    this.pr = g.createProgram();
    g.attachShader(this.pr, sh(g.VERTEX_SHADER, V));
    g.attachShader(this.pr, sh(g.FRAGMENT_SHADER, F));
    g.linkProgram(this.pr);
    this.buf = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, this.buf);
    g.bufferData(g.ARRAY_BUFFER, new Float32Array(cube), g.STATIC_DRAW);
    this.shadowMap = { enabled: false };
    this.outputColorSpace = "srgb";
    this.loop = null;
  }
  setPixelRatio(n) {
    this.ratio = n;
  }
  setSize(w, h) {
    let r = this.ratio || 1;
    this.domElement.width = w * r;
    this.domElement.height = h * r;
    this.domElement.style.width = w + "px";
    this.domElement.style.height = h + "px";
  }
  setAnimationLoop(fn) {
    this.loop = fn;
    if (fn) {
      let tick = (t) => {
        if (this.loop) {
          fn(t);
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    }
  }
  render(s, c) {
    let g = this.gl,
      b = s.background?.value ?? 0;
    g.viewport(0, 0, g.canvas.width, g.canvas.height);
    g.clearColor(((b >> 16) & 255) / 255, ((b >> 8) & 255) / 255, (b & 255) / 255, 1);
    g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
    g.enable(g.DEPTH_TEST);
    g.enable(g.BLEND);
    g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
    g.useProgram(this.pr);
    g.bindBuffer(g.ARRAY_BUFFER, this.buf);
    let q = g.getAttribLocation(this.pr, "p");
    g.enableVertexAttribArray(q);
    g.vertexAttribPointer(q, 3, g.FLOAT, false, 0, 0);
    let base = vp(c),
      draw = (o) => {
        if (o instanceof Mesh && o.visible) {
          let ar = o.geometry.args,
            geo = o.geometry.kind,
            sx = (ar[0] || 1) / 2,
            sy = geo === "plane" ? 0.02 : (ar[1] || 1) / 2,
            sz = geo === "plane" ? (ar[1] || 1) / 2 : (ar[2] || ar[0] || 1) / 2;
          o.scale.x *= sx;
          o.scale.y *= sy;
          o.scale.z *= sz;
          g.uniformMatrix4fv(g.getUniformLocation(this.pr, "m"), false, mul(base, model(o)));
          o.scale.x /= sx;
          o.scale.y /= sy;
          o.scale.z /= sz;
          let n = o.material.color.value,
            e = o.material.emissive.value,
            k = o.material.emissiveIntensity || 0,
            cv = [
              Math.min(1, (((n >> 16) & 255) + k * ((e >> 16) & 255)) / 255),
              Math.min(1, (((n >> 8) & 255) + k * ((e >> 8) & 255)) / 255),
              Math.min(1, ((n & 255) + k * (e & 255)) / 255),
            ];
          g.uniform3fv(g.getUniformLocation(this.pr, "c"), cv);
          g.uniform1f(g.getUniformLocation(this.pr, "a"), o.material.opacity);
          g.drawArrays(g.TRIANGLES, 0, cube.length / 3);
        }
        o.children.forEach(draw);
      };
    s.children.forEach(draw);
  }
  dispose() {
    this.loop = null;
  }
}
export const SRGBColorSpace = "srgb";
