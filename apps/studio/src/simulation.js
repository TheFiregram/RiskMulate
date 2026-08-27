import { BUILDINGS, INITIAL_RISK, PUMP_RISK, TREATMENTS } from './data.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

export class Simulation {
  constructor(onEvent = () => {}) {
    this.onEvent = onEvent;
    this.speed = 1;
    this.accumulator = 0;
    this.state = {
      day: 1,
      minute: 8 * 60,
      cash: 15000000,
      workers: 8,
      availableWorkers: 8,
      safety: 100,
      energyCapacity: 0,
      energyDemand: 0,
      backupEnergy: 0,
      rawMaterial: 420,
      finishedGoods: 0,
      delivered: 0,
      productionRate: 0,
      buildings: [],
      risks: [clone(INITIAL_RISK), clone(PUMP_RISK)],
      alerts: [],
      score: 100,
      contractWon: false,
      contractFailed: false,
    };
    this.flags = {
      electricalWarning: false,
      pumpWarning: false,
      firstProduction: false,
      lowMaterial: false,
    };
  }

  setSpeed(speed) { this.speed = Number(speed); }

  addBuilding(building) {
    this.state.buildings.push(building);
    this.recalculateCapacity();
  }

  recalculateCapacity() {
    let capacity = 0;
    let demand = 0;
    let assigned = 0;
    for (const b of this.state.buildings) {
      if (b.status !== 'operational') continue;
      const data = BUILDINGS[b.type];
      capacity += data.output?.energy || 0;
      demand += data.energyUse || 0;
      assigned += data.workers || 0;
    }
    this.state.energyCapacity = capacity + (this.state.backupEnergy || 0);
    this.state.energyDemand = demand;
    this.state.availableWorkers = Math.max(0, this.state.workers - assigned);
  }

  tick(realSeconds) {
    if (!this.speed || this.state.contractWon || this.state.contractFailed) return;
    this.accumulator += realSeconds * this.speed;
    while (this.accumulator >= 1) {
      this.accumulator -= 1;
      this.stepOneSecond();
    }
  }

  stepOneSecond() {
    const s = this.state;
    s.minute += 6;
    if (s.minute >= 1440) {
      s.minute -= 1440;
      s.day += 1;
      this.dailyUpdate();
    }

    for (const b of s.buildings) {
      if (b.status === 'building') {
        b.progress += 1;
        if (b.progress >= b.buildTime) {
          b.status = 'operational';
          b.progress = b.buildTime;
          this.recalculateCapacity();
          this.onEvent({ type: 'built', building: b });
        }
      }
    }

    const has = (type) => s.buildings.some(b => b.type === type && b.status === 'operational');
    const fullLine = ['generator', 'rawTank', 'pump', 'processor', 'warehouse'].every(has);
    const enoughPower = s.energyCapacity >= s.energyDemand && s.energyCapacity > 0;

    if (fullLine && enoughPower && s.rawMaterial > 0) {
      const pump = s.buildings.find(b => b.type === 'pump' && b.status === 'operational');
      const processor = s.buildings.find(b => b.type === 'processor' && b.status === 'operational');
      if (pump?.condition > 15 && processor?.condition > 15) {
        const produced = Math.min(3.5, s.rawMaterial);
        s.productionRate = Math.round(35 * Math.min(1, pump.condition / 65));
        s.rawMaterial -= produced * 0.18;
        s.finishedGoods += produced;
        if (s.finishedGoods >= 100) {
          const shipment = Math.min(100, s.finishedGoods);
          s.finishedGoods -= shipment;
          s.delivered += shipment;
          s.cash += shipment * 250;
        }
        pump.condition = Math.max(0, pump.condition - 0.12);
        processor.condition = Math.max(0, processor.condition - 0.03);
        if (!this.flags.firstProduction) {
          this.flags.firstProduction = true;
          this.onEvent({ type: 'milestone', message: 'The first units are moving through the line.' });
        }
      }
    } else {
      s.productionRate = 0;
    }

    if (has('generator') && s.energyDemand > 70 && !this.flags.electricalWarning) {
      this.flags.electricalWarning = true;
      this.raiseAlert('Single point of failure', 'The plant now depends on one generator.', 'warn', 'R-001');
    }

    const pump = s.buildings.find(b => b.type === 'pump' && b.status === 'operational');
    if (pump && pump.condition < 72 && !this.flags.pumpWarning) {
      this.flags.pumpWarning = true;
      this.raiseAlert('Pump condition falling', `P-101 condition is ${Math.round(pump.condition)}%.`, 'danger', 'R-002');
    }

    if (s.rawMaterial < 90 && fullLine && !this.flags.lowMaterial) {
      this.flags.lowMaterial = true;
      this.raiseAlert('Feedstock running low', 'Raw material may constrain production soon.', 'warn');
    }

    if (s.delivered >= 1000 && !s.contractWon) {
      s.contractWon = true;
      this.onEvent({ type: 'contractWon' });
    }
    if (s.day > 10 && s.delivered < 1000 && !s.contractFailed) {
      s.contractFailed = true;
      this.onEvent({ type: 'contractFailed' });
    }
  }

  dailyUpdate() {
    const s = this.state;
    const payroll = s.workers * 18000;
    s.cash -= payroll;
    s.rawMaterial += 180;
    if (s.rawMaterial > 900) s.rawMaterial = 900;

    const untreatedHigh = s.risks.filter(r => r.status === 'identified' && !r.treatment && r.likelihood * r.impact >= 12).length;
    s.safety = Math.max(45, Math.min(100, s.safety - untreatedHigh * 2 + (this.hasOperational('clinic') ? 1 : 0)));

    const pump = s.buildings.find(b => b.type === 'pump' && b.status === 'operational');
    if (pump && pump.condition < 35) {
      const risk = s.risks.find(r => r.id === 'R-002');
      const chance = risk?.treatment === 'overhaul' ? 0.04 : 0.28;
      if (Math.random() < chance) {
        pump.condition = 12;
        s.safety = Math.max(0, s.safety - 8);
        s.cash -= 350000;
        this.raiseAlert('Pump failure', 'P-101 has failed. Production is interrupted.', 'danger', 'R-002');
        this.onEvent({ type: 'incident', message: 'P-101 failed after deteriorating under load.' });
      }
    }
  }

  hasOperational(type) {
    return this.state.buildings.some(b => b.type === type && b.status === 'operational');
  }

  raiseAlert(title, body, severity = 'warn', riskId = null) {
    const alert = { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, title, body, severity, riskId, day: this.state.day, minute: this.state.minute };
    this.state.alerts.unshift(alert);
    this.state.alerts = this.state.alerts.slice(0, 4);
    this.onEvent({ type: 'alert', alert });
  }

  identifyRisk(id) {
    const risk = this.state.risks.find(r => r.id === id);
    if (!risk) return;
    risk.status = 'identified';
    this.onEvent({ type: 'riskIdentified', risk });
  }

  treatRisk(riskId, treatmentId) {
    const risk = this.state.risks.find(r => r.id === riskId);
    const treatment = TREATMENTS[riskId]?.find(t => t.id === treatmentId);
    if (!risk || !treatment) return { ok: false, reason: 'Treatment unavailable.' };
    if (this.state.cash < treatment.cost) return { ok: false, reason: 'Insufficient cash.' };
    this.state.cash -= treatment.cost;
    risk.treatment = treatment.id;
    risk.status = 'treated';
    risk.residualLikelihood = treatment.likelihood;
    risk.residualImpact = treatment.impact;

    if (riskId === 'R-002' && treatmentId === 'overhaul') {
      const pump = this.state.buildings.find(b => b.type === 'pump');
      if (pump) pump.condition = Math.max(pump.condition, 92);
    }
    if (riskId === 'R-001' && treatmentId === 'backup') {
      this.state.backupEnergy = 80;
      this.recalculateCapacity();
    }

    this.onEvent({ type: 'riskTreated', risk, treatment });
    return { ok: true };
  }

  serviceBuilding(instanceId) {
    const b = this.state.buildings.find(x => x.id === instanceId);
    if (!b || b.status !== 'operational') return { ok: false, reason: 'Asset unavailable.' };
    const cost = b.type === 'pump' ? 180000 : 120000;
    if (this.state.cash < cost) return { ok: false, reason: 'Insufficient cash.' };
    this.state.cash -= cost;
    b.condition = Math.min(100, b.condition + 35);
    return { ok: true, cost };
  }
}
