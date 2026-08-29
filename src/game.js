import { BUILDINGS } from './data.js';
import { Simulation } from './simulation.js';
import { World } from './world.js';

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.selectedBuildType = null;
    this.sim = new Simulation(event => this.handleSimulationEvent(event));
    this.world = new World(canvas, hit => this.handleWorldSelection(hit));
    this.lastTime = performance.now();
    this.running = false;
    this.instanceCounter = 0;

    const office = this.makeBuilding('command', 'hub');
    office.status = 'operational';
    office.progress = 1;
    office.buildTime = 1;
    office.padId = 'hub-pad';
    this.world.pads.push({ id: 'hub-pad', gx: 0, gy: 0, occupied: true });
    this.world.addBuilding(office);
    this.sim.addBuilding(office);

    this.ui.bindGame(this);
    this.ui.sync(this.sim.state);
  }

  makeBuilding(type, padId) {
    const def = BUILDINGS[type];
    return {
      id: `${type}-${++this.instanceCounter}`,
      type,
      padId,
      status: def.buildTime ? 'building' : 'operational',
      progress: 0,
      buildTime: def.buildTime || 1,
      condition: 100,
      enabled: true,
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(t => this.loop(t));
  }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.sim.tick(dt);
    this.world.update(dt, this.sim.state);
    this.world.render(this.sim.state, this.selectedBuildType);
    this.ui.sync(this.sim.state);
    requestAnimationFrame(t => this.loop(t));
  }

  selectBuildType(type) {
    if (!BUILDINGS[type]) return;
    this.selectedBuildType = this.selectedBuildType === type ? null : type;
    this.ui.renderBuildMenu(this.sim.state, this.selectedBuildType);
    if (this.selectedBuildType) this.ui.toast(`Selected <strong>${BUILDINGS[type].name}</strong>. Tap an empty build pad.`);
  }

  buildAt(type, padId = null) {
    const def = BUILDINGS[type];
    if (!def) return;
    const pad = padId ? this.world.pads.find(p => p.id === padId && !p.occupied) : this.world.getFreePad();
    if (!pad) return this.ui.toast('No free build pad is available.');
    if (this.sim.state.cash < def.cost) return this.ui.toast('You do not have enough cash for this building.');
    const committedWorkers = this.sim.state.buildings.reduce((sum, b) => sum + (BUILDINGS[b.type]?.workers || 0), 0);
    if (this.sim.state.workers - committedWorkers < def.workers) return this.ui.toast('More available workers are required before construction.');
    if (this.sim.state.buildings.some(b => b.type === type)) return this.ui.toast(`${def.name} is already on this site.`);

    this.sim.state.cash -= def.cost;
    const instance = this.makeBuilding(type, pad.id);
    this.world.addBuilding(instance);
    this.sim.addBuilding(instance);
    this.selectedBuildType = null;
    this.ui.renderBuildMenu(this.sim.state, null);
    this.ui.toast(`<strong>${def.name}</strong> construction started.`);
  }

  handleWorldSelection(hit) {
    if (!hit) {
      this.ui.closeSelection();
      return;
    }
    if (hit.type === 'pad' && this.selectedBuildType) {
      this.buildAt(this.selectedBuildType, hit.id);
      return;
    }
    if (hit.type === 'building') this.ui.showBuilding(hit.data, this.sim.state);
  }

  setSpeed(speed) { this.sim.setSpeed(speed); }

  openRiskRegister(focusId = null) {
    if (focusId) this.sim.identifyRisk(focusId);
    this.ui.openRiskRegister(this.sim.state, focusId);
  }

  identifyRisk(id) {
    this.sim.identifyRisk(id);
    this.ui.openRiskRegister(this.sim.state, id);
  }

  treatRisk(riskId, treatmentId) {
    const result = this.sim.treatRisk(riskId, treatmentId);
    if (!result.ok) return this.ui.toast(result.reason);
    this.ui.openRiskRegister(this.sim.state, riskId);
  }

  serviceBuilding(id) {
    const result = this.sim.serviceBuilding(id);
    if (!result.ok) return this.ui.toast(result.reason);
    const b = this.sim.state.buildings.find(x => x.id === id);
    this.ui.toast(`Maintenance completed for <strong>${BUILDINGS[b.type].name}</strong>.`);
    this.ui.showBuilding(b, this.sim.state);
  }

  handleSimulationEvent(event) {
    if (event.type === 'built') {
      this.ui.toast(`<strong>${BUILDINGS[event.building.type].name}</strong> is operational.`);
      this.ui.renderBuildMenu(this.sim.state, this.selectedBuildType);
    }
    if (event.type === 'milestone' || event.type === 'incident') this.ui.toast(event.message);
    if (event.type === 'riskIdentified') this.ui.toast(`<strong>${event.risk.id}</strong> added to the risk register.`);
    if (event.type === 'riskTreated') {
      const before = event.risk.inherentLikelihood * event.risk.inherentImpact;
      const after = event.risk.residualLikelihood * event.risk.residualImpact;
      this.ui.toast(`<strong>${event.treatment.type}</strong> selected. Exposure moved from ${before} to ${after}.`);
    }
    if (event.type === 'contractWon') this.ui.showResult(true, this.sim.state);
    if (event.type === 'contractFailed') this.ui.showResult(false, this.sim.state);
  }
}
