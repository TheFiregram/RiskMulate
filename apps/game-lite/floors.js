let cachedFloorMaterials;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createTextureFromCanvas(THREE, draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  draw(ctx, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 2;
  return texture;
}

function createConcreteTexture(THREE) {
  const random = seededRandom(4102);

  return createTextureFromCanvas(
    THREE,
    (ctx, width, height) => {
      ctx.fillStyle = '#7a7a74';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 9000; i += 1) {
        const tone = 95 + Math.floor(random() * 60);
        ctx.globalAlpha = 0.03 + random() * 0.08;
        ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone - 2})`;
        const size = 0.5 + random() * 2.6;
        ctx.fillRect(random() * width, random() * height, size, size);
      }

      for (let i = 0; i < 80; i += 1) {
        const x = random() * width;
        const y = random() * height;
        const length = 10 + random() * 80;
        const angle = random() * Math.PI * 2;
        ctx.globalAlpha = 0.08 + random() * 0.08;
        ctx.strokeStyle = random() > 0.65 ? '#4f4f49' : '#8b877f';
        ctx.lineWidth = 1 + random() * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();
      }

      for (let i = 0; i < 45; i += 1) {
        const x = random() * width;
        const y = random() * height;
        const radiusX = 14 + random() * 45;
        const radiusY = 10 + random() * 25;
        ctx.globalAlpha = 0.06 + random() * 0.1;
        ctx.fillStyle = random() > 0.5 ? '#403f3a' : '#6a675f';
        ctx.beginPath();
        ctx.ellipse(x, y, radiusX, radiusY, random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = '#cdbb62';
      ctx.lineWidth = 8;
      ctx.setLineDash([28, 20]);
      ctx.beginPath();
      ctx.moveTo(width * 0.15, height * 0.82);
      ctx.lineTo(width * 0.85, height * 0.82);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    },
    6,
    6,
  );
}

function createAsphaltTexture(THREE) {
  const random = seededRandom(883);

  return createTextureFromCanvas(
    THREE,
    (ctx, width, height) => {
      ctx.fillStyle = '#35393b';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 12000; i += 1) {
        const tone = 40 + Math.floor(random() * 55);
        ctx.globalAlpha = 0.05 + random() * 0.12;
        ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone})`;
        const size = 0.6 + random() * 2.2;
        ctx.fillRect(random() * width, random() * height, size, size);
      }

      for (let i = 0; i < 60; i += 1) {
        const y = random() * height;
        ctx.globalAlpha = 0.04 + random() * 0.05;
        ctx.fillStyle = '#1f2224';
        ctx.fillRect(0, y, width, 2 + random() * 5);
      }

      for (let i = 0; i < 18; i += 1) {
        const x = random() * width;
        const y = random() * height;
        const radius = 16 + random() * 40;
        ctx.globalAlpha = 0.05 + random() * 0.08;
        ctx.fillStyle = '#474b4e';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    2,
    10,
  );
}

function createDirtTexture(THREE) {
  const random = seededRandom(1207);

  return createTextureFromCanvas(
    THREE,
    (ctx, width, height) => {
      ctx.fillStyle = '#5b624e';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 7000; i += 1) {
        const red = 75 + Math.floor(random() * 35);
        const green = 80 + Math.floor(random() * 45);
        const blue = 60 + Math.floor(random() * 22);
        ctx.globalAlpha = 0.05 + random() * 0.08;
        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        const size = 1 + random() * 3;
        ctx.fillRect(random() * width, random() * height, size, size);
      }

      for (let i = 0; i < 180; i += 1) {
        const x = random() * width;
        const y = random() * height;
        const radius = 3 + random() * 10;
        ctx.globalAlpha = 0.08 + random() * 0.08;
        ctx.fillStyle = random() > 0.5 ? '#6b735c' : '#495040';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    8,
    8,
  );
}

export function getFloorMaterials(THREE) {
  if (cachedFloorMaterials) return cachedFloorMaterials;

  cachedFloorMaterials = {
    yard: new THREE.MeshStandardMaterial({
      color: 0x86847c,
      map: createConcreteTexture(THREE),
      roughness: 0.96,
      metalness: 0.02,
    }),
    processPad: new THREE.MeshStandardMaterial({
      color: 0x8d8b83,
      map: createConcreteTexture(THREE),
      roughness: 0.95,
      metalness: 0.02,
    }),
    road: new THREE.MeshStandardMaterial({
      color: 0x393d40,
      map: createAsphaltTexture(THREE),
      roughness: 1,
      metalness: 0,
    }),
    dirt: new THREE.MeshStandardMaterial({
      color: 0x5d654f,
      map: createDirtTexture(THREE),
      roughness: 1,
      metalness: 0,
    }),
    stripe: new THREE.MeshStandardMaterial({
      color: 0xd1b350,
      roughness: 0.92,
      metalness: 0.02,
    }),
    drain: new THREE.MeshStandardMaterial({
      color: 0x2b3033,
      roughness: 0.82,
      metalness: 0.25,
    }),
    curb: new THREE.MeshStandardMaterial({
      color: 0x666761,
      roughness: 0.95,
      metalness: 0.02,
    }),
  };

  return cachedFloorMaterials;
}

function addPlane(THREE, scene, width, depth, material, x, y, z) {
  const object = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  object.position.set(x, y, z);
  object.rotation.x = -Math.PI / 2;
  scene.add(object);
  return object;
}

function addBox(THREE, scene, width, height, depth, material, x, y, z) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  object.position.set(x, y, z);
  scene.add(object);
  return object;
}

export function buildIndustrialFloor(THREE, scene) {
  const materials = getFloorMaterials(THREE);

  addPlane(THREE, scene, 96, 96, materials.dirt, 0, -0.02, 0);
  addPlane(THREE, scene, 54, 54, materials.yard, 0, 0.01, 0);
  addPlane(THREE, scene, 12, 70, materials.road, 0, 0.018, 4);

  addPlane(THREE, scene, 0.22, 70, materials.stripe, -5.55, 0.022, 4);
  addPlane(THREE, scene, 0.22, 70, materials.stripe, 5.55, 0.022, 4);

  addPlane(THREE, scene, 16, 22, materials.processPad, -13, 0.02, -8);
  addPlane(THREE, scene, 17, 23, materials.processPad, 13, 0.02, -9);
  addPlane(THREE, scene, 10, 14, materials.processPad, 0, 0.02, 18.5);

  addBox(THREE, scene, 14, 0.08, 0.55, materials.drain, 0, 0.04, -2.5);

  addBox(THREE, scene, 16.4, 0.12, 0.28, materials.curb, -13, 0.06, 3);
  addBox(THREE, scene, 17.4, 0.12, 0.28, materials.curb, 13, 0.06, 2.5);
  addBox(THREE, scene, 0.28, 0.12, 22.2, materials.curb, -21.2, 0.06, -8);
  addBox(THREE, scene, 0.28, 0.12, 22.2, materials.curb, -4.8, 0.06, -8);
  addBox(THREE, scene, 0.28, 0.12, 23.2, materials.curb, 4.3, 0.06, -9);
  addBox(THREE, scene, 0.28, 0.12, 23.2, materials.curb, 21.7, 0.06, -9);
}
