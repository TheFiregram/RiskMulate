export const productionAssetManifest = Object.freeze([
  {
    id: 'process-tanks',
    desktopUrl: './assets/production/process-tanks.glb',
    mobileUrl: './assets/production/process-tanks-mobile.glb',
    priority: 'high',
    replaceAssetTypes: ['detailed-process-tank'],
    castShadow: true,
    receiveShadow: true,
  },
  {
    id: 'pipe-rack',
    desktopUrl: './assets/production/pipe-rack.glb',
    mobileUrl: './assets/production/pipe-rack-mobile.glb',
    priority: 'normal',
    replaceAssetTypes: [],
    castShadow: true,
    receiveShadow: true,
  },
  {
    id: 'process-buildings',
    desktopUrl: './assets/production/process-buildings.glb',
    mobileUrl: './assets/production/process-buildings-mobile.glb',
    priority: 'normal',
    replaceAssetTypes: [],
    castShadow: true,
    receiveShadow: true,
  },
  {
    id: 'electrical-area',
    desktopUrl: './assets/production/electrical-area.glb',
    mobileUrl: './assets/production/electrical-area-mobile.glb',
    priority: 'normal',
    replaceAssetTypes: [],
    castShadow: true,
    receiveShadow: true,
  },
]);

export function selectAssetUrl(entry, coarsePointer) {
  return coarsePointer && entry.mobileUrl ? entry.mobileUrl : entry.desktopUrl;
}
