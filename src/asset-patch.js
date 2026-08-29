import { BUILDINGS } from './data.js';
import { World } from './world.js';
import sprite0 from './sprite-data-0.js';
import sprite1 from './sprite-data-1.js';
import sprite2 from './sprite-data-2.js';
import sprite3a from './sprite-data-3a.js';
import sprite3b from './sprite-data-3b.js';

// Generated isometric building art is rendered as lightweight sprites on top of
// the existing simulation. The simulation/risk systems remain untouched.
const SPRITE_CELL = 200;
const SPRITES = {
  command:     { index: 0, width: 220, anchorY: 0.66 },
  generator:   { index: 1, width: 174, anchorY: 0.66 },
  rawTank:     { index: 2, width: 184, anchorY: 0.66 },
  pump:        { index: 3, width: 184, anchorY: 0.66 },
  processor:   { index: 4, width: 224, anchorY: 0.66 },
  warehouse:   { index: 5, width: 214, anchorY: 0.66 },
  maintenance: { index: 6, width: 180, anchorY: 0.66 },
  clinic:      { index: 7, width: 184, anchorY: 0.66 },
};

const spriteSheet = new Image();
spriteSheet.decoding = 'async';
spriteSheet.src = `data:image/webp;base64,${sprite0}${sprite1}${sprite2}${sprite3a}${sprite3b}`;

function drawSprite(ctx, config, left, top, width, height) {
  const sx = (config.index % 4) * SPRITE_CELL;
  const sy = Math.floor(config.index / 4) * SPRITE_CELL;
  ctx.drawImage(spriteSheet, sx, sy, SPRITE_CELL, SPRITE_CELL, left, top, width, height);
}

const originalDrawBuilding = World.prototype.drawBuilding;
const originalHitTest = World.prototype.hitTest;

World.prototype.drawBuilding = function drawGeneratedBuilding(ctx, building, pad, simState) {
  const config = SPRITES[building.type];
  if (!config || !spriteSheet.complete || !spriteSheet.naturalWidth) {
    originalDrawBuilding.call(this, ctx, building, pad, simState);
    return;
  }

  const selected = building.id === this.selectedId || building.id === this.hoverId;
  const progress = building.status === 'building'
    ? Math.max(0.08, Math.min(1, building.progress / building.buildTime))
    : 1;
  const center = this.iso(pad.gx, pad.gy, 0);
  const width = config.width * this.camera.zoom;
  const height = width;
  const left = center.x - width / 2;
  const top = center.y - height * config.anchorY;

  if (selected) {
    ctx.save();
    const pulse = 0.92 + Math.sin(this.time * 4) * 0.08;
    ctx.strokeStyle = 'rgba(246, 190, 76, .95)';
    ctx.fillStyle = 'rgba(246, 190, 76, .10)';
    ctx.lineWidth = 2.4 * this.camera.zoom;
    ctx.beginPath();
    ctx.ellipse(center.x, center.y - 2 * this.camera.zoom, width * .29 * pulse, height * .115 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (building.status === 'building') {
    // Ghost the final structure, then reveal construction from the ground up.
    ctx.globalAlpha = .20;
    ctx.filter = 'grayscale(.25)';
    drawSprite(ctx, config, left, top, width, height);
    ctx.filter = 'none';
    const revealHeight = height * progress;
    const revealTop = top + height - revealHeight;
    ctx.beginPath();
    ctx.rect(left, revealTop, width, revealHeight);
    ctx.clip();
    ctx.globalAlpha = .94;
    drawSprite(ctx, config, left, top, width, height);
  } else {
    ctx.globalAlpha = building.enabled === false ? .58 : 1;
    drawSprite(ctx, config, left, top, width, height);
  }
  ctx.restore();

  if (building.status === 'building') this.drawConstructionProgress(ctx, pad, building);
  if (building.condition < 70 && building.status === 'operational') this.drawConditionMarker(ctx, pad, building.condition);
};

World.prototype.hitTest = function hitGeneratedBuildings(x, y) {
  const candidates = [];
  for (const building of this.buildings) {
    const pad = this.pads.find(p => p.id === building.padId);
    const config = SPRITES[building.type];
    if (!pad || !config || !spriteSheet.complete || !spriteSheet.naturalWidth) continue;
    const center = this.iso(pad.gx, pad.gy, 0);
    const width = config.width * this.camera.zoom;
    const height = width;
    const left = center.x - width / 2;
    const top = center.y - height * config.anchorY;
    // Slightly inset rectangle avoids transparent corner clicks without costly alpha hit-tests.
    if (x >= left + width * .08 && x <= left + width * .92 && y >= top + height * .08 && y <= top + height * .92) {
      candidates.push({ id: building.id, type: 'building', data: building, sort: pad.gx + pad.gy });
    }
  }
  if (candidates.length) return candidates.sort((a, b) => b.sort - a.sort)[0];
  return originalHitTest.call(this, x, y);
};

// A denser industrial site gives the building art context without introducing a
// heavy 3D scene. Roads, fencing, yards and small service props stay procedural.
World.prototype.drawBackdrop = function drawIndustrialBackdrop(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
  gradient.addColorStop(0, '#9db2a6');
  gradient.addColorStop(.42, '#718978');
  gradient.addColorStop(1, '#455b4c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, this.width, this.height);

  ctx.save();
  ctx.globalAlpha = .22;
  ctx.fillStyle = '#32483b';
  ctx.beginPath();
  ctx.moveTo(0, this.height * .27);
  for (let x = 0; x <= this.width; x += 55) {
    const y = this.height * .27 + Math.sin(x * .011) * 17 + Math.sin(x * .031) * 7;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(this.width, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

World.prototype.drawTerrain = function drawIndustrialTerrain(ctx) {
  const outer = [this.iso(-10,-9), this.iso(10,-9), this.iso(10,9), this.iso(-10,9)];
  ctx.save();
  ctx.beginPath();
  outer.forEach((p, i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
  ctx.closePath();
  const ground = ctx.createLinearGradient(0, this.height * .25, 0, this.height * .92);
  ground.addColorStop(0, '#77866e');
  ground.addColorStop(1, '#566851');
  ctx.fillStyle = ground;
  ctx.fill();
  ctx.clip();

  const yard = [this.iso(-8,-7), this.iso(8,-7), this.iso(8,7), this.iso(-8,7)];
  ctx.beginPath();
  yard.forEach((p, i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
  ctx.closePath();
  ctx.fillStyle = '#747970';
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,225,204,.20)';
  ctx.lineWidth = 2 * this.camera.zoom;
  ctx.stroke();

  // Concrete slab seams and worn service-yard texture.
  ctx.globalAlpha = .22;
  ctx.strokeStyle = '#343d38';
  ctx.lineWidth = 1;
  for (let gx = -8; gx <= 8; gx += 2) {
    const a = this.iso(gx,-7); const b = this.iso(gx,7);
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
  }
  for (let gy = -7; gy <= 7; gy += 2) {
    const a = this.iso(-8,gy); const b = this.iso(8,gy);
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
  }
  ctx.restore();
};

World.prototype.drawRoads = function drawIndustrialRoads(ctx) {
  const paths = [[[-8,0],[8,0]], [[0,-7],[0,7]], [[-6,-4],[6,4]], [[-5,4],[5,-4]]];
  ctx.save();
  ctx.lineCap = 'round';
  for (const path of paths) {
    const a = this.iso(...path[0]); const b = this.iso(...path[1]);
    ctx.strokeStyle = 'rgba(35,39,39,.30)';
    ctx.lineWidth = 44 * this.camera.zoom;
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    ctx.strokeStyle = '#4b5150';
    ctx.lineWidth = 34 * this.camera.zoom;
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(239,190,75,.68)';
    ctx.lineWidth = 1.7 * this.camera.zoom;
    ctx.setLineDash([9*this.camera.zoom,10*this.camera.zoom]);
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
};

World.prototype.drawForeground = function drawIndustrialForeground(ctx) {
  const trees = [[-9,-7],[-8,6],[8,-6],[9,5],[-7,-8],[7,7]];
  for (const [gx,gy] of trees) {
    const p = this.iso(gx,gy,0);
    ctx.save();
    ctx.fillStyle = 'rgba(18,31,24,.22)';
    ctx.beginPath(); ctx.ellipse(p.x,p.y,14*this.camera.zoom,6*this.camera.zoom,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#355b3d';
    for (let i=0;i<3;i++) {
      const t = this.iso(gx,gy,.35+i*.28);
      ctx.beginPath(); ctx.moveTo(t.x,t.y-18*this.camera.zoom); ctx.lineTo(t.x+14*this.camera.zoom,t.y+8*this.camera.zoom); ctx.lineTo(t.x-14*this.camera.zoom,t.y+8*this.camera.zoom); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // Perimeter light poles and small service crates make the yard feel occupied.
  const lights = [[-7,-6],[7,-6],[7,6],[-7,6],[-7,0],[7,0]];
  for (const [gx,gy] of lights) {
    const base = this.iso(gx,gy,0); const top = this.iso(gx,gy,1.15);
    ctx.save();
    ctx.strokeStyle = '#363f3e'; ctx.lineWidth = 2.5*this.camera.zoom;
    ctx.beginPath(); ctx.moveTo(base.x,base.y); ctx.lineTo(top.x,top.y); ctx.stroke();
    ctx.fillStyle = '#f1b64e'; ctx.beginPath(); ctx.arc(top.x,top.y,3.2*this.camera.zoom,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  const crates = [[-6,5],[-5.5,5.3],[6,-5.1],[5.5,-5.35]];
  for (const [gx,gy] of crates) {
    const p = this.iso(gx,gy,.12);
    ctx.save();
    ctx.fillStyle='#806b4c';
    ctx.fillRect(p.x-6*this.camera.zoom,p.y-5*this.camera.zoom,12*this.camera.zoom,10*this.camera.zoom);
    ctx.strokeStyle='#c39b5c'; ctx.lineWidth=1;
    ctx.strokeRect(p.x-6*this.camera.zoom,p.y-5*this.camera.zoom,12*this.camera.zoom,10*this.camera.zoom);
    ctx.restore();
  }
};
