import { World } from './world.js';

const ROAD_CLASSES = {
  haul: {
    width: 46,
    shoulder: 58,
    surface: '#454b4a',
    shoulderColor: '#5d625e',
    edgeColor: 'rgba(224,226,216,.70)',
    centerColor: 'rgba(239,184,57,.88)',
    centerDash: [11, 10],
  },
  secondary: {
    width: 31,
    shoulder: 39,
    surface: '#505653',
    shoulderColor: '#676d67',
    edgeColor: 'rgba(220,222,210,.55)',
    centerColor: 'rgba(229,204,118,.72)',
    centerDash: [7, 9],
  },
  service: {
    width: 22,
    shoulder: 29,
    surface: '#626660',
    shoulderColor: '#75786f',
    edgeColor: 'rgba(232,230,215,.32)',
    centerColor: null,
    centerDash: null,
  },
  gravel: {
    width: 15,
    shoulder: 23,
    surface: '#777268',
    shoulderColor: '#6a695f',
    edgeColor: null,
    centerColor: null,
    centerDash: null,
  },
};

const ROAD_NETWORK = [
  {
    id: 'west-east-haul',
    className: 'haul',
    seed: 11,
    points: [[-10,-1.1],[-8,-.9],[-6,-.55],[-3.7,-.2],[-1.3,.05],[1.2,.12],[3.8,.3],[6.4,.15],[9.5,.65]],
  },
  {
    id: 'north-utility',
    className: 'secondary',
    seed: 23,
    points: [[-1.4,.05],[-2.2,-1.3],[-2.7,-2.8],[-2.1,-4.3],[-.5,-5.25],[1.6,-5.25],[3.5,-4.55]],
  },
  {
    id: 'east-logistics',
    className: 'secondary',
    seed: 31,
    points: [[3.25,.25],[4.35,1.1],[5.05,2.25],[5.25,3.55],[4.7,4.8],[3.4,5.55],[1.4,5.8]],
  },
  {
    id: 'west-maintenance',
    className: 'service',
    seed: 43,
    points: [[-4.7,-.45],[-5.3,.55],[-5.15,1.75],[-4.55,2.8],[-4.05,4.15]],
  },
  {
    id: 'south-service-loop',
    className: 'service',
    seed: 57,
    points: [[-1.1,.2],[-1.35,1.55],[-.75,2.8],[.2,3.9],[1.25,4.9],[1.55,5.7]],
  },
  {
    id: 'tank-access',
    className: 'service',
    seed: 66,
    points: [[-2.25,-4.25],[-3.55,-4.55],[-4.85,-4.0],[-5.55,-2.8],[-5.25,-1.5]],
  },
  {
    id: 'emergency-track',
    className: 'gravel',
    seed: 77,
    points: [[-8.8,5.9],[-7.2,5.7],[-6.0,5.0],[-5.05,4.0],[-4.5,3.0]],
  },
];

const CROSSINGS = [
  { at: [-.7,.12], along: [1,0], count: 6 },
  { at: [3.7,.3], along: [1,.05], count: 5 },
];

function toScreen(world, point) {
  return world.iso(point[0], point[1], 0);
}

function traceSmoothPath(ctx, world, points) {
  const screen = points.map(p => toScreen(world, p));
  if (screen.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(screen[0].x, screen[0].y);
  for (let i = 1; i < screen.length - 1; i++) {
    const current = screen[i];
    const next = screen[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }
  const last = screen[screen.length - 1];
  ctx.lineTo(last.x, last.y);
}

function strokeRoute(ctx, world, route) {
  const style = ROAD_CLASSES[route.className];
  const zoom = world.camera.zoom;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  traceSmoothPath(ctx, world, route.points);
  ctx.strokeStyle = 'rgba(25,29,28,.26)';
  ctx.lineWidth = (style.shoulder + 7) * zoom;
  ctx.stroke();

  traceSmoothPath(ctx, world, route.points);
  ctx.strokeStyle = style.shoulderColor;
  ctx.lineWidth = style.shoulder * zoom;
  ctx.stroke();

  if (style.edgeColor) {
    traceSmoothPath(ctx, world, route.points);
    ctx.strokeStyle = style.edgeColor;
    ctx.lineWidth = (style.width + 3.2) * zoom;
    ctx.stroke();
  }

  traceSmoothPath(ctx, world, route.points);
  ctx.strokeStyle = style.surface;
  ctx.lineWidth = style.width * zoom;
  ctx.stroke();

  if (route.className === 'haul' || route.className === 'secondary') {
    ctx.globalAlpha = .28;
    ctx.setLineDash([22 * zoom, 8 * zoom]);
    ctx.lineDashOffset = -route.seed * zoom;
    traceSmoothPath(ctx, world, route.points);
    ctx.strokeStyle = '#292e2d';
    ctx.lineWidth = Math.max(1, 2.1 * zoom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  if (style.centerColor) {
    traceSmoothPath(ctx, world, route.points);
    ctx.strokeStyle = style.centerColor;
    ctx.lineWidth = 1.7 * zoom;
    ctx.setLineDash(style.centerDash.map(v => v * zoom));
    ctx.lineDashOffset = -(route.seed % 9) * zoom;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  drawSurfaceVariation(ctx, world, route);
}

function drawSurfaceVariation(ctx, world, route) {
  const zoom = world.camera.zoom;
  for (let i = 0; i < route.points.length - 1; i++) {
    const a = route.points[i];
    const b = route.points[i + 1];
    const count = route.className === 'haul' ? 2 : 1;
    for (let j = 0; j < count; j++) {
      const n = Math.sin((route.seed + 1) * 17.17 + i * 8.31 + j * 3.7);
      const t = .28 + (j + 1) * .22 + Math.abs(n) * .08;
      const gx = a[0] + (b[0] - a[0]) * t;
      const gy = a[1] + (b[1] - a[1]) * t;
      const p = world.iso(gx, gy, 0);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(n * .45);
      ctx.globalAlpha = route.className === 'gravel' ? .20 : .18;
      ctx.fillStyle = n > 0 ? '#2f3433' : '#83877f';
      ctx.beginPath();
      ctx.ellipse(0, 0, (4 + Math.abs(n) * 5) * zoom, (1.3 + Math.abs(n) * 1.8) * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawAprons(ctx, world) {
  const apronTypes = {
    warehouse: { sx: 2.9, sy: 2.15, fill: '#7b7e78', markings: true },
    processor: { sx: 3.0, sy: 2.25, fill: '#70746f', markings: false },
    maintenance: { sx: 2.35, sy: 1.85, fill: '#787b75', markings: true },
    pump: { sx: 2.25, sy: 1.8, fill: '#6d716d', markings: false },
  };

  for (const building of world.buildings) {
    const spec = apronTypes[building.type];
    if (!spec) continue;
    const pad = world.pads.find(p => p.id === building.padId);
    if (!pad) continue;
    drawIsoPad(ctx, world, pad.gx, pad.gy, spec);
  }
}

function drawIsoPad(ctx, world, gx, gy, spec) {
  const hx = spec.sx / 2;
  const hy = spec.sy / 2;
  const pts = [
    world.iso(gx - hx, gy - hy),
    world.iso(gx + hx, gy - hy),
    world.iso(gx + hx, gy + hy),
    world.iso(gx - hx, gy + hy),
  ];
  ctx.save();
  ctx.beginPath();
  pts.forEach((p, i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
  ctx.closePath();
  ctx.fillStyle = spec.fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(32,37,35,.42)';
  ctx.lineWidth = 2 * world.camera.zoom;
  ctx.stroke();

  if (spec.markings) {
    ctx.clip();
    ctx.strokeStyle = 'rgba(229,181,58,.70)';
    ctx.lineWidth = 1.3 * world.camera.zoom;
    for (let i = -2; i <= 2; i++) {
      const a = world.iso(gx - .9, gy + i * .22);
      const b = world.iso(gx + .9, gy + i * .22);
      ctx.beginPath();
      ctx.moveTo(a.x,a.y);
      ctx.lineTo(b.x,b.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCrossing(ctx, world, crossing) {
  const p = world.iso(crossing.at[0], crossing.at[1]);
  const p2 = world.iso(crossing.at[0] + crossing.along[0] * .6, crossing.at[1] + crossing.along[1] * .6);
  const angle = Math.atan2(p2.y - p.y, p2.x - p.x) + Math.PI / 2;
  const zoom = world.camera.zoom;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(225,226,214,.72)';
  for (let i = 0; i < crossing.count; i++) {
    const offset = (i - (crossing.count - 1) / 2) * 5 * zoom;
    ctx.fillRect(offset - 1.35 * zoom, -12 * zoom, 2.7 * zoom, 24 * zoom);
  }
  ctx.restore();
}

function drawDrainage(ctx, world) {
  const drains = [
    [[-8.7,-1.62],[-4.8,-1.15]],
    [[5.35,2.2],[5.72,4.4]],
    [[-4.85,2.1],[-4.35,3.7]],
  ];
  ctx.save();
  ctx.strokeStyle = 'rgba(31,38,36,.60)';
  ctx.lineWidth = 3.6 * world.camera.zoom;
  ctx.setLineDash([2.5 * world.camera.zoom, 3.4 * world.camera.zoom]);
  for (const pair of drains) {
    const a = world.iso(...pair[0]);
    const b = world.iso(...pair[1]);
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.stroke();
  }
  ctx.restore();
}

World.prototype.drawRoads = function drawVariedIndustrialRoads(ctx) {
  drawAprons(ctx, this);
  for (const route of ROAD_NETWORK) strokeRoute(ctx, this, route);
  drawDrainage(ctx, this);
  for (const crossing of CROSSINGS) drawCrossing(ctx, this, crossing);
};
