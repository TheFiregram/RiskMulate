import { BUILDINGS, PAD_LAYOUT } from './data.js';

const TAU = Math.PI * 2;

export class World {
  constructor(canvas, onSelect = () => {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.onSelect = onSelect;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.camera = { x: 0, y: -10, zoom: 1, rotation: 0 };
    this.tileW = 88;
    this.tileH = 44;
    this.heightScale = 34;
    this.buildings = [];
    this.pads = PAD_LAYOUT.map(p => ({ ...p, occupied: false }));
    this.workers = [];
    this.effects = [];
    this.pointer = { x: 0, y: 0, down: false, dragging: false, startX: 0, startY: 0, camX: 0, camY: 0 };
    this.selectedId = null;
    this.hoverId = null;
    this.time = 0;
    this.resize();
    this.bindControls();
    this.seedWorkers(8);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  bindControls() {
    const c = this.canvas;
    c.addEventListener('pointerdown', e => {
      c.setPointerCapture?.(e.pointerId);
      this.pointer.down = true;
      this.pointer.dragging = false;
      this.pointer.startX = e.clientX;
      this.pointer.startY = e.clientY;
      this.pointer.camX = this.camera.x;
      this.pointer.camY = this.camera.y;
    });
    c.addEventListener('pointermove', e => {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      if (this.pointer.down) {
        const dx = e.clientX - this.pointer.startX;
        const dy = e.clientY - this.pointer.startY;
        if (Math.hypot(dx, dy) > 5) this.pointer.dragging = true;
        if (this.pointer.dragging) {
          this.camera.x = this.pointer.camX + dx / this.camera.zoom;
          this.camera.y = this.pointer.camY + dy / this.camera.zoom;
        }
      } else {
        this.hoverId = this.hitTest(e.clientX, e.clientY)?.id || null;
      }
    });
    c.addEventListener('pointerup', e => {
      if (!this.pointer.dragging) {
        const hit = this.hitTest(e.clientX, e.clientY);
        this.selectedId = hit?.id || null;
        this.onSelect(hit || null);
      }
      this.pointer.down = false;
      this.pointer.dragging = false;
    });
    c.addEventListener('wheel', e => {
      e.preventDefault();
      const before = this.camera.zoom;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      this.camera.zoom = Math.max(0.62, Math.min(1.55, this.camera.zoom * factor));
      if (before !== this.camera.zoom) this.hoverId = null;
    }, { passive: false });
    window.addEventListener('resize', () => this.resize());
  }

  seedWorkers(count) {
    this.workers = Array.from({ length: count }, (_, i) => ({
      id: `worker-${i + 1}`,
      angle: (i / count) * TAU,
      radius: 3 + (i % 3) * 1.15,
      speed: 0.11 + (i % 4) * 0.015,
      gx: 0,
      gy: 0,
      phase: Math.random() * TAU,
    }));
  }

  addBuilding(instance) {
    const pad = this.pads.find(p => p.id === instance.padId);
    if (pad) pad.occupied = true;
    this.buildings.push(instance);
  }

  getFreePad() { return this.pads.find(p => !p.occupied); }

  iso(gx, gy, z = 0) {
    const r = this.camera.rotation % 4;
    let x = gx, y = gy;
    if (r === 1) [x, y] = [-gy, gx];
    if (r === 2) [x, y] = [-gx, -gy];
    if (r === 3) [x, y] = [gy, -gx];
    const sx = (x - y) * (this.tileW / 2);
    const sy = (x + y) * (this.tileH / 2) - z * this.heightScale;
    return {
      x: this.width / 2 + (sx + this.camera.x) * this.camera.zoom,
      y: this.height / 2 + (sy + this.camera.y) * this.camera.zoom,
    };
  }

  update(dt) {
    this.time += dt;
    const operational = this.buildings.filter(b => b.status === 'operational');
    for (let i = 0; i < this.workers.length; i++) {
      const w = this.workers[i];
      w.angle += w.speed * dt;
      if (operational.length) {
        const target = operational[i % operational.length];
        const pad = this.pads.find(p => p.id === target.padId);
        const tx = pad?.gx ?? 0;
        const ty = pad?.gy ?? 0;
        w.gx = tx + Math.cos(w.angle + w.phase) * 1.2;
        w.gy = ty + Math.sin(w.angle + w.phase) * 1.2;
      } else {
        w.gx = Math.cos(w.angle + w.phase) * w.radius;
        w.gy = Math.sin(w.angle + w.phase) * w.radius;
      }
    }

    if (Math.random() < dt * 1.5) {
      const gen = this.buildings.find(b => b.type === 'generator' && b.status === 'operational');
      if (gen) {
        const pad = this.pads.find(p => p.id === gen.padId);
        this.effects.push({ gx: (pad?.gx ?? 0) + .4, gy: (pad?.gy ?? 0) - .2, z: 1.9, life: 1.8, max: 1.8 });
      }
    }
    for (const fx of this.effects) {
      fx.life -= dt;
      fx.z += dt * .45;
      fx.gx += dt * .05;
    }
    this.effects = this.effects.filter(fx => fx.life > 0);
  }

  render(simState, selectedBuildType = null) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackdrop(ctx);
    this.drawTerrain(ctx);
    this.drawRoads(ctx);

    const renderables = [];
    for (const p of this.pads) renderables.push({ kind: 'pad', sort: p.gx + p.gy, value: p });
    for (const b of this.buildings) {
      const p = this.pads.find(x => x.id === b.padId);
      if (p) renderables.push({ kind: 'building', sort: p.gx + p.gy + .1, value: b, pad: p });
    }
    for (const w of this.workers) renderables.push({ kind: 'worker', sort: w.gx + w.gy + .2, value: w });
    renderables.sort((a, b) => a.sort - b.sort);

    for (const item of renderables) {
      if (item.kind === 'pad') this.drawPad(ctx, item.value, selectedBuildType);
      if (item.kind === 'building') this.drawBuilding(ctx, item.value, item.pad, simState);
      if (item.kind === 'worker') this.drawWorker(ctx, item.value);
    }
    for (const fx of this.effects) this.drawEffect(ctx, fx);
    this.drawForeground(ctx);
  }

  drawBackdrop(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, this.height);
    g.addColorStop(0, '#a8c0ae');
    g.addColorStop(.44, '#7e9c84');
    g.addColorStop(1, '#5c765f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.globalAlpha = .24;
    ctx.fillStyle = '#5f7765';
    ctx.beginPath();
    ctx.moveTo(0, this.height * .28);
    for (let x = 0; x <= this.width; x += 80) {
      const y = this.height * .28 + Math.sin(x * .012) * 22 + Math.sin(x * .027) * 9;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.width, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  drawTerrain(ctx) {
    const corners = [this.iso(-10, -9), this.iso(10, -9), this.iso(10, 9), this.iso(-10, 9)];
    ctx.save();
    ctx.beginPath(); corners.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    const g = ctx.createLinearGradient(0, this.height * .25, 0, this.height * .9);
    g.addColorStop(0, '#769267'); g.addColorStop(1, '#607c57');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.clip();
    ctx.globalAlpha = .18;
    for (let gx = -10; gx <= 10; gx++) for (let gy = -9; gy <= 9; gy++) {
      if ((gx + gy) % 2) continue;
      const p = this.iso(gx, gy);
      ctx.fillStyle = '#b9c89a';
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.2 * this.camera.zoom, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawRoads(ctx) {
    const paths = [[[-8,0],[8,0]], [[0,-7],[0,7]], [[-6,-4],[6,4]], [[-5,4],[5,-4]]];
    ctx.save(); ctx.lineCap = 'round';
    for (const path of paths) {
      const a = this.iso(...path[0]); const b = this.iso(...path[1]);
      ctx.strokeStyle = '#5b6259'; ctx.lineWidth = 34 * this.camera.zoom; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(236,206,127,.52)'; ctx.lineWidth = 2 * this.camera.zoom; ctx.setLineDash([8*this.camera.zoom,9*this.camera.zoom]); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }

  drawPad(ctx, pad, selectedBuildType) {
    if (pad.occupied) return;
    const c = this.iso(pad.gx, pad.gy);
    const w = 80 * this.camera.zoom, h = 40 * this.camera.zoom;
    ctx.save(); ctx.translate(c.x, c.y);
    ctx.beginPath(); ctx.moveTo(0,-h/2); ctx.lineTo(w/2,0); ctx.lineTo(0,h/2); ctx.lineTo(-w/2,0); ctx.closePath();
    ctx.fillStyle = selectedBuildType ? 'rgba(233,161,58,.17)' : 'rgba(30,42,34,.20)'; ctx.fill();
    ctx.strokeStyle = selectedBuildType ? 'rgba(244,194,95,.9)' : 'rgba(255,255,255,.18)';
    ctx.lineWidth = selectedBuildType ? 2 : 1; ctx.setLineDash([5,5]); ctx.stroke(); ctx.setLineDash([]);
    if (selectedBuildType) {
      ctx.fillStyle = 'rgba(255,236,192,.88)'; ctx.font = `800 ${9*this.camera.zoom}px system-ui`; ctx.textAlign='center'; ctx.fillText('BUILD',0,3*this.camera.zoom);
    }
    ctx.restore();
  }

  drawBuilding(ctx, b, pad) {
    const def = BUILDINGS[b.type];
    const selected = b.id === this.selectedId || b.id === this.hoverId;
    const z = b.status === 'building' ? Math.max(.12, b.progress / b.buildTime) : 1;
    const baseH = b.type === 'processor' || b.type === 'warehouse' ? 1.15 : .9;
    const fp = def.footprint || [2,2];
    if (b.type === 'rawTank') this.drawTank(ctx, pad.gx, pad.gy, def, selected, z);
    else if (b.type === 'generator') this.drawGenerator(ctx, pad.gx, pad.gy, def, selected, z);
    else if (b.type === 'pump') this.drawPump(ctx, pad.gx, pad.gy, selected, z);
    else {
      this.drawIsoBlock(ctx, pad.gx, pad.gy, fp[0]*.72, fp[1]*.72, baseH*z, def.color, def.roof, selected);
      if (b.type === 'processor') this.drawChimney(ctx, pad.gx+.45, pad.gy-.25, 1.75*z);
      if (b.type === 'clinic') this.drawCross(ctx, pad.gx, pad.gy, baseH*z + .04);
    }
    if (b.status === 'building') this.drawConstructionProgress(ctx, pad, b);
    if (b.condition < 70 && b.status === 'operational') this.drawConditionMarker(ctx, pad, b.condition);
  }

  drawIsoBlock(ctx, gx, gy, sx, sy, height, sideColor, roofColor, selected=false) {
    const top = [this.iso(gx-sx/2,gy-sy/2,height),this.iso(gx+sx/2,gy-sy/2,height),this.iso(gx+sx/2,gy+sy/2,height),this.iso(gx-sx/2,gy+sy/2,height)];
    const bottom = [this.iso(gx-sx/2,gy-sy/2,0),this.iso(gx+sx/2,gy-sy/2,0),this.iso(gx+sx/2,gy+sy/2,0),this.iso(gx-sx/2,gy+sy/2,0)];
    ctx.save();
    ctx.fillStyle = shade(sideColor,-28); polygon(ctx,[top[1],top[2],bottom[2],bottom[1]],true);
    ctx.fillStyle = shade(sideColor,-8); polygon(ctx,[top[2],top[3],bottom[3],bottom[2]],true);
    ctx.fillStyle = roofColor; polygon(ctx,top,true);
    ctx.strokeStyle = selected ? '#f3c567' : 'rgba(20,25,21,.28)'; ctx.lineWidth = selected ? 2.5 : 1; polygon(ctx,top,false);
    const a = this.iso(gx+.12, gy+sy/2+.012, height*.55); const b = this.iso(gx+.44, gy+sy/2+.012, height*.55);
    ctx.strokeStyle='rgba(217,236,220,.48)'; ctx.lineWidth=3*this.camera.zoom; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    ctx.restore();
  }

  drawTank(ctx,gx,gy,def,selected,z){
    const c=this.iso(gx,gy,0); const top=this.iso(gx,gy,1.35*z); const rx=28*this.camera.zoom; const ry=13*this.camera.zoom;
    ctx.save();
    const grad=ctx.createLinearGradient(c.x-rx,0,c.x+rx,0); grad.addColorStop(0,shade(def.color,-25)); grad.addColorStop(.45,def.color); grad.addColorStop(1,shade(def.color,-18));
    ctx.fillStyle=grad; ctx.fillRect(c.x-rx,top.y,rx*2,c.y-16*this.camera.zoom-top.y);
    ctx.fillStyle=def.roof; ctx.beginPath(); ctx.ellipse(top.x,top.y,rx,ry,0,0,TAU); ctx.fill();
    ctx.fillStyle=shade(def.color,-18); ctx.beginPath(); ctx.ellipse(c.x,c.y-16*this.camera.zoom,rx,ry,0,0,TAU); ctx.fill();
    ctx.strokeStyle=selected?'#f3c567':'rgba(20,25,21,.32)'; ctx.lineWidth=selected?2.5:1; ctx.beginPath(); ctx.ellipse(top.x,top.y,rx,ry,0,0,TAU); ctx.stroke();
    ctx.restore();
  }

  drawGenerator(ctx,gx,gy,def,selected,z){
    this.drawIsoBlock(ctx,gx,gy,1.25,1.05,.72*z,def.color,def.roof,selected);
    this.drawChimney(ctx,gx+.38,gy-.28,1.42*z);
    const p=this.iso(gx-.28,gy+.48,.35*z); ctx.save(); ctx.fillStyle='#e7b14d'; ctx.fillRect(p.x-5*this.camera.zoom,p.y-4*this.camera.zoom,10*this.camera.zoom,8*this.camera.zoom); ctx.restore();
  }

  drawPump(ctx,gx,gy,selected,z){
    this.drawIsoBlock(ctx,gx,gy,1.25,1.05,.32*z,'#485d57','#5f786f',selected);
    const c=this.iso(gx-.12,gy,.58*z); ctx.save(); ctx.fillStyle='#63968a'; ctx.beginPath(); ctx.arc(c.x,c.y,15*this.camera.zoom,0,TAU); ctx.fill(); ctx.fillStyle='#d9933e'; ctx.fillRect(c.x+12*this.camera.zoom,c.y-5*this.camera.zoom,25*this.camera.zoom,10*this.camera.zoom); ctx.fillStyle='#56605f'; ctx.fillRect(c.x+34*this.camera.zoom,c.y-8*this.camera.zoom,21*this.camera.zoom,16*this.camera.zoom); ctx.restore();
  }

  drawChimney(ctx,gx,gy,z){
    const bottom=this.iso(gx,gy,.45); const top=this.iso(gx,gy,z); const w=8*this.camera.zoom; ctx.save(); const g=ctx.createLinearGradient(top.x-w,0,top.x+w,0); g.addColorStop(0,'#4e5752'); g.addColorStop(.5,'#8d9891'); g.addColorStop(1,'#404944'); ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(bottom.x-w,bottom.y); ctx.lineTo(bottom.x+w,bottom.y); ctx.lineTo(top.x+w*.65,top.y); ctx.lineTo(top.x-w*.65,top.y); ctx.closePath(); ctx.fill(); ctx.fillStyle='#313a35'; ctx.beginPath(); ctx.ellipse(top.x,top.y,w*.7,w*.35,0,0,TAU); ctx.fill(); ctx.restore();
  }

  drawCross(ctx,gx,gy,z){ const p=this.iso(gx,gy,z+.06); ctx.save(); ctx.fillStyle='#f1eee6'; ctx.fillRect(p.x-3,p.y-11,6,22); ctx.fillRect(p.x-11,p.y-3,22,6); ctx.restore(); }

  drawConstructionProgress(ctx,pad,b){
    const p=this.iso(pad.gx,pad.gy,1.65); const w=60*this.camera.zoom; const h=7*this.camera.zoom; ctx.save(); ctx.fillStyle='rgba(17,23,19,.8)'; roundRect(ctx,p.x-w/2,p.y-h/2,w,h,4*this.camera.zoom); ctx.fill(); ctx.fillStyle='#efb64c'; roundRect(ctx,p.x-w/2,p.y-h/2,w*(b.progress/b.buildTime),h,4*this.camera.zoom); ctx.fill(); ctx.restore();
  }

  drawConditionMarker(ctx,pad,condition){
    const p=this.iso(pad.gx,pad.gy,1.8); const pulse=.88+Math.sin(this.time*5)*.12; ctx.save(); ctx.fillStyle=condition<40?'#d95f54':'#e3a34b'; ctx.beginPath(); ctx.arc(p.x,p.y,8*this.camera.zoom*pulse,0,TAU); ctx.fill(); ctx.fillStyle='#fff'; ctx.font=`900 ${9*this.camera.zoom}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('!',p.x,p.y+.5); ctx.restore();
  }

  drawWorker(ctx,w){
    const ground=this.iso(w.gx,w.gy,0); const body=this.iso(w.gx,w.gy,.34); const head=this.iso(w.gx,w.gy,.52); ctx.save(); ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(ground.x,ground.y,6*this.camera.zoom,3*this.camera.zoom,0,0,TAU); ctx.fill(); ctx.strokeStyle='#31443e'; ctx.lineWidth=5*this.camera.zoom; ctx.beginPath(); ctx.moveTo(ground.x,ground.y-2*this.camera.zoom); ctx.lineTo(body.x,body.y); ctx.stroke(); ctx.fillStyle='#e1a844'; ctx.beginPath(); ctx.arc(head.x,head.y,4.1*this.camera.zoom,0,TAU); ctx.fill(); ctx.fillStyle='#f0c67f'; ctx.beginPath(); ctx.arc(head.x,head.y+1*this.camera.zoom,2.6*this.camera.zoom,0,TAU); ctx.fill(); ctx.restore();
  }

  drawEffect(ctx,fx){ const p=this.iso(fx.gx,fx.gy,fx.z); const alpha=Math.max(0,fx.life/fx.max)*.28; ctx.save(); ctx.globalAlpha=alpha; ctx.fillStyle='#e8ede7'; ctx.beginPath(); ctx.arc(p.x,p.y,(11+(1-fx.life/fx.max)*14)*this.camera.zoom,0,TAU); ctx.fill(); ctx.restore(); }

  drawForeground(ctx){
    const trees=[[-9,-7],[-8,6],[8,-6],[9,5],[-7,-8],[7,7]];
    for(const [gx,gy] of trees){ const p=this.iso(gx,gy,0); ctx.save(); ctx.fillStyle='rgba(20,40,27,.22)'; ctx.beginPath(); ctx.ellipse(p.x,p.y,14*this.camera.zoom,6*this.camera.zoom,0,0,TAU); ctx.fill(); ctx.fillStyle='#355d3e'; for(let i=0;i<3;i++){ const t=this.iso(gx,gy,.35+i*.28); ctx.beginPath(); ctx.moveTo(t.x,t.y-18*this.camera.zoom); ctx.lineTo(t.x+14*this.camera.zoom,t.y+8*this.camera.zoom); ctx.lineTo(t.x-14*this.camera.zoom,t.y+8*this.camera.zoom); ctx.closePath(); ctx.fill(); } ctx.restore(); }
  }

  hitTest(x,y){
    const candidates=[];
    for(const b of this.buildings){ const p=this.pads.find(x=>x.id===b.padId); if(!p) continue; const c=this.iso(p.gx,p.gy,.55); const dx=(x-c.x)/(55*this.camera.zoom); const dy=(y-c.y)/(45*this.camera.zoom); if(dx*dx+dy*dy<1) candidates.push({id:b.id,type:'building',data:b,sort:p.gx+p.gy}); }
    if(candidates.length) return candidates.sort((a,b)=>b.sort-a.sort)[0];
    for(const p of this.pads){ if(p.occupied) continue; const c=this.iso(p.gx,p.gy); const dx=Math.abs(x-c.x)/(44*this.camera.zoom); const dy=Math.abs(y-c.y)/(22*this.camera.zoom); if(dx+dy<1) return {id:p.id,type:'pad',data:p}; }
    return null;
  }
}

function shade(hex,percent){ const n=parseInt(hex.replace('#',''),16); const r=Math.max(0,Math.min(255,(n>>16)+percent)); const g=Math.max(0,Math.min(255,((n>>8)&255)+percent)); const b=Math.max(0,Math.min(255,(n&255)+percent)); return `rgb(${r},${g},${b})`; }
function polygon(ctx,pts,fill=true){ ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.closePath(); fill?ctx.fill():ctx.stroke(); }
function roundRect(ctx,x,y,w,h,r){ const rr=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath(); }
