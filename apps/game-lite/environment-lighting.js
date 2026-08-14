function makeEnvironmentCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#496b7a');
  sky.addColorStop(0.42, '#9eb1b8');
  sky.addColorStop(0.54, '#d1c8b6');
  sky.addColorStop(0.7, '#777b74');
  sky.addColorStop(1, '#343a37');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sun = ctx.createRadialGradient(145, 72, 2, 145, 72, 72);
  sun.addColorStop(0, 'rgba(255,235,195,.98)');
  sun.addColorStop(0.08, 'rgba(255,220,168,.66)');
  sun.addColorStop(0.42, 'rgba(255,194,126,.13)');
  sun.addColorStop(1, 'rgba(255,194,126,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(60, 0, 170, 150);

  const groundGlow = ctx.createLinearGradient(0, 145, 0, 256);
  groundGlow.addColorStop(0, 'rgba(174,160,136,.12)');
  groundGlow.addColorStop(1, 'rgba(22,28,27,.32)');
  ctx.fillStyle = groundGlow;
  ctx.fillRect(0, 145, 512, 111);
  return canvas;
}

export function installPbrEnvironment(THREE, scene, renderer) {
  if (scene.userData.riskmulatePbrEnvironment) return scene.environment;

  const source = new THREE.CanvasTexture(makeEnvironmentCanvas());
  source.mapping = THREE.EquirectangularReflectionMapping;
  source.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromEquirectangular(source);

  scene.environment = target.texture;
  if ('environmentIntensity' in scene) scene.environmentIntensity = 0.72;
  scene.userData.riskmulatePbrEnvironment = target.texture;

  source.dispose();
  pmrem.dispose();
  return target.texture;
}
