import { BUILDINGS, BUILD_ORDER, TREATMENTS } from './data.js';

const money = value => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const timeText = minute => `${String(Math.floor(minute / 60)).padStart(2,'0')}:${String(Math.floor(minute % 60)).padStart(2,'0')}`;

export class UI {
  constructor() {
    this.game = null;
    this.currentTab = 'build';
    this.lastAlertSignature = '';
    this.lastResourceSignature = '';
    this.el = {
      resourceRow: document.querySelector('#resource-row'), shiftLabel: document.querySelector('#shift-label'),
      progressFill: document.querySelector('#mission-progress-fill'), produced: document.querySelector('#mission-produced'), days: document.querySelector('#mission-days'),
      alerts: document.querySelector('#alerts'), selectionPanel: document.querySelector('#selection-panel'), selectionCategory: document.querySelector('#selection-category'), selectionName: document.querySelector('#selection-name'), selectionContent: document.querySelector('#selection-content'),
      drawer: document.querySelector('#drawer'), drawerEyebrow: document.querySelector('#drawer-eyebrow'), drawerTitle: document.querySelector('#drawer-title'), drawerBody: document.querySelector('#drawer-body'),
      riskModal: document.querySelector('#risk-modal'), riskRegister: document.querySelector('#risk-register'), toastStack: document.querySelector('#toast-stack'),
    };
  }

  bindGame(game) {
    this.game = game;
    document.querySelectorAll('.speed-btn').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); game.setSpeed(btn.dataset.speed);
    }));
    document.querySelectorAll('.dock-btn').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); this.currentTab = btn.dataset.tab; this.el.drawer.classList.add('open'); this.renderDrawer(game.sim.state);
    }));
    document.querySelector('#drawer-collapse').addEventListener('click', () => this.el.drawer.classList.toggle('open'));
    document.querySelector('#selection-close').addEventListener('click', () => this.closeSelection());
    document.querySelector('#risk-modal-close').addEventListener('click', () => this.el.riskModal.classList.add('hidden'));
    this.el.riskModal.addEventListener('click', e => { if (e.target === this.el.riskModal) this.el.riskModal.classList.add('hidden'); });
    this.el.alerts.addEventListener('click', e => { const row = e.target.closest('[data-risk-id]'); if (row?.dataset.riskId) game.openRiskRegister(row.dataset.riskId); });
    this.renderDrawer(game.sim.state);
  }

  sync(state) {
    const sig = [Math.round(state.cash/1000), Math.round(state.rawMaterial), Math.round(state.delivered), state.workers, state.availableWorkers, state.safety, state.energyCapacity, state.energyDemand, state.day, Math.floor(state.minute/6)].join('|');
    if (sig !== this.lastResourceSignature) {
      this.lastResourceSignature = sig;
      this.el.resourceRow.innerHTML = [
        resource('₦', compactMoney(state.cash), 'Cash'), resource('RM', Math.round(state.rawMaterial), 'Feedstock'), resource('FG', Math.round(state.finishedGoods), 'Finished'),
        resource('WK', `${state.availableWorkers}/${state.workers}`, 'Workers'), resource('⚡', `${state.energyDemand}/${state.energyCapacity}`, 'Energy kW'), resource('SH', `${Math.round(state.safety)}%`, 'Safety'),
      ].join('');
      this.el.shiftLabel.textContent = `FOUNDRY DISTRICT · DAY ${state.day} · ${timeText(state.minute)}`;
      this.el.progressFill.style.width = `${clamp(state.delivered / 1000 * 100, 0, 100)}%`;
      this.el.produced.textContent = `${Math.round(state.delivered).toLocaleString()} / 1,000`;
      this.el.days.textContent = `Day ${state.day} / 10`;
      if (this.currentTab !== 'build') this.renderDrawer(state);
    }
    const alertSig = state.alerts.map(a => a.id).join('|');
    if (alertSig !== this.lastAlertSignature) {
      this.lastAlertSignature = alertSig;
      this.el.alerts.innerHTML = state.alerts.map(a => `<div class="alert-item ${a.severity === 'danger' ? 'danger' : ''}" ${a.riskId ? `data-risk-id="${a.riskId}"` : ''}><span class="alert-dot"></span><span class="alert-copy"><strong>${a.title}</strong><span>${a.body}</span></span><span class="alert-time">D${a.day}</span></div>`).join('');
    }
  }

  renderDrawer(state) {
    if (this.currentTab === 'build') return this.renderBuildMenu(state, this.game?.selectedBuildType);
    if (this.currentTab === 'operations') {
      this.el.drawerEyebrow.textContent = 'FACTORY STATUS'; this.el.drawerTitle.textContent = 'Operations';
      const operational = state.buildings.filter(b => b.status === 'operational' && b.type !== 'command').length;
      this.el.drawerBody.innerHTML = reportCards([['Production', `${state.productionRate} u/h`], ['Operational assets', operational], ['Energy reserve', `${Math.max(0,state.energyCapacity-state.energyDemand)} kW`], ['Delivered', Math.round(state.delivered).toLocaleString()]]); return;
    }
    if (this.currentTab === 'people') {
      this.el.drawerEyebrow.textContent = 'WORKFORCE'; this.el.drawerTitle.textContent = 'People';
      this.el.drawerBody.innerHTML = reportCards([['Total workers', state.workers], ['Available', state.availableWorkers], ['Assigned', state.workers-state.availableWorkers], ['Safety', `${Math.round(state.safety)}%`]]); return;
    }
    if (this.currentTab === 'risk') {
      this.el.drawerEyebrow.textContent = 'RISK MANAGEMENT'; this.el.drawerTitle.textContent = 'Current exposure';
      const identified = state.risks.filter(r => r.status !== 'unidentified').length;
      const high = state.risks.filter(r => r.status !== 'unidentified' && (r.residualLikelihood ?? r.likelihood) * (r.residualImpact ?? r.impact) >= 12).length;
      this.el.drawerBody.innerHTML = `${reportCards([['Identified', identified], ['High exposure', high], ['Controls', state.risks.filter(r=>r.treatment).length], ['Score', `${state.score}/100`]])}<button class="action-btn" id="open-register" style="min-width:150px">Open risk register</button>`;
      document.querySelector('#open-register')?.addEventListener('click', () => this.game.openRiskRegister()); return;
    }
    this.el.drawerEyebrow.textContent = 'MANAGEMENT REPORT'; this.el.drawerTitle.textContent = 'Contract performance';
    this.el.drawerBody.innerHTML = reportCards([['Cash', compactMoney(state.cash)], ['Contract', `${Math.round(state.delivered/10)}%`], ['Day', `${state.day}/10`], ['Safety', `${Math.round(state.safety)}%`]]);
  }

  renderBuildMenu(state, selectedType = null) {
    this.el.drawerEyebrow.textContent = 'CONSTRUCTION'; this.el.drawerTitle.textContent = 'Build the factory';
    this.el.drawerBody.innerHTML = BUILD_ORDER.map(type => {
      const b = BUILDINGS[type]; const exists = state.buildings.some(x => x.type === type); const locked = exists || state.cash < b.cost;
      return `<button class="build-card ${selectedType === type ? 'selected' : ''} ${locked ? 'locked' : ''}" data-build="${type}" ${locked ? 'disabled' : ''}><span class="build-visual"><span class="build-mini ${b.category === 'storage' ? 'tank' : ''} ${b.category === 'utility' ? 'utility' : ''} ${b.category === 'safety' ? 'safety' : ''}"></span></span><span class="build-name">${b.name}</span><span class="build-desc">${exists ? 'Already built' : b.description}</span><span class="build-cost">${money(b.cost)}</span></button>`;
    }).join('');
    this.el.drawerBody.querySelectorAll('[data-build]').forEach(btn => btn.addEventListener('click', () => this.game.selectBuildType(btn.dataset.build)));
  }

  showBuilding(instance) {
    const def = BUILDINGS[instance.type]; this.el.selectionCategory.textContent = `${def.category.toUpperCase()} · ${instance.status.toUpperCase()}`; this.el.selectionName.textContent = def.name;
    const condition = Math.round(instance.condition);
    const stats = [['Condition', `${condition}%`], ['Workers', def.workers || 0], ['Energy use', def.energyUse ? `${def.energyUse} kW` : def.output?.energy ? `+${def.output.energy} kW` : '—'], ['Status', instance.status === 'building' ? `${Math.round(instance.progress/instance.buildTime*100)}% built` : 'Operating']];
    this.el.selectionContent.innerHTML = `<div class="stat-grid">${stats.map(([k,v])=>`<div class="stat"><span>${k}</span><strong>${v}</strong>${k==='Condition'?`<div class="meter"><span style="width:${condition}%;background:${condition<45?'var(--danger)':condition<70?'var(--warn)':'var(--good)'}"></span></div>`:''}</div>`).join('')}</div><p style="color:var(--muted);font-size:11px;line-height:1.5;margin:12px 2px 0">${def.description}</p>${instance.status === 'operational' && instance.type !== 'command' ? `<div class="action-row"><button class="action-btn secondary" data-service="${instance.id}">Service asset</button>${instance.type === 'pump' && condition < 80 ? `<button class="action-btn" data-risk="R-002">Review risk</button>` : ''}</div>` : ''}`;
    this.el.selectionPanel.classList.remove('hidden');
    this.el.selectionContent.querySelector('[data-service]')?.addEventListener('click', e => this.game.serviceBuilding(e.currentTarget.dataset.service));
    this.el.selectionContent.querySelector('[data-risk]')?.addEventListener('click', e => this.game.openRiskRegister(e.currentTarget.dataset.risk));
  }

  closeSelection() { this.el.selectionPanel.classList.add('hidden'); }

  openRiskRegister(state, focusId = null) {
    this.el.riskRegister.innerHTML = `${riskMatrix(state.risks)}<div class="eyebrow" style="margin-top:4px">REGISTERED / OBSERVED UNCERTAINTY</div>` + state.risks.map(risk => {
      const identified = risk.status !== 'unidentified'; const score = (risk.residualLikelihood ?? risk.likelihood) * (risk.residualImpact ?? risk.impact); const inherent = risk.inherentLikelihood * risk.inherentImpact;
      return `<article class="risk-card" id="risk-${risk.id}"><div class="risk-head"><div><div class="eyebrow">${risk.id} · ${risk.objective}</div><h3>${risk.title}</h3></div><div class="risk-score">${identified ? `Score ${score}` : 'Unreviewed'}</div></div>${identified ? `<div class="risk-chain"><div class="chain-node"><span>CAUSE</span><strong>${risk.cause}</strong></div><div class="chain-arrow">→</div><div class="chain-node"><span>EVENT</span><strong>${risk.event}</strong></div><div class="chain-arrow">→</div><div class="chain-node"><span>CONSEQUENCE</span><strong>${risk.consequence}</strong></div></div><div class="risk-meta"><span class="risk-chip">Inherent: ${risk.inherentLikelihood} × ${risk.inherentImpact} = ${inherent}</span>${risk.treatment ? `<span class="risk-chip">Residual: ${risk.residualLikelihood} × ${risk.residualImpact} = ${score}</span>` : '<span class="risk-chip">Treatment pending</span>'}${risk.treatment ? `<span class="risk-chip">Treatment: ${risk.treatment}</span>` : ''}</div>${!risk.treatment ? `<div class="treatment-list">${(TREATMENTS[risk.id]||[]).map(t=>`<button class="treatment-btn" data-treat-risk="${risk.id}" data-treatment="${t.id}"><strong>${t.type}: ${t.name} · ${money(t.cost)}</strong><span>${t.note}</span></button>`).join('')}</div>` : `<p style="color:var(--muted);font-size:10px;margin:11px 0 0">Monitor the residual exposure and confirm the selected control remains effective.</p>`}` : `<p class="empty-state">Evidence exists, but this uncertainty has not been formally added to your register.</p><button class="action-btn" data-identify="${risk.id}">Identify and assess</button>`}</article>`;
    }).join('');
    this.el.riskModal.classList.remove('hidden');
    this.el.riskRegister.querySelectorAll('[data-identify]').forEach(btn => btn.addEventListener('click', () => this.game.identifyRisk(btn.dataset.identify)));
    this.el.riskRegister.querySelectorAll('[data-treat-risk]').forEach(btn => btn.addEventListener('click', () => this.game.treatRisk(btn.dataset.treatRisk, btn.dataset.treatment)));
    if (focusId) setTimeout(() => document.querySelector(`#risk-${focusId}`)?.scrollIntoView({ behavior:'smooth', block:'center' }), 50);
  }

  toast(html) { const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = html; this.el.toastStack.appendChild(el); setTimeout(() => el.remove(), 3600); }

  showResult(won, state) {
    this.el.riskRegister.innerHTML = `<article class="risk-card"><div class="eyebrow">SCENARIO DEBRIEF</div><h2 style="margin:6px 0">${won ? 'Contract delivered' : 'Contract missed'}</h2><p class="modal-intro">${won ? 'You reached the production objective. Review whether the controls you chose kept exposure within the factory’s criteria.' : 'The production objective was not reached in time. Review which uncertainties interrupted the plan and whether they were identified early enough.'}</p>${reportCards([['Delivered',Math.round(state.delivered)],['Cash',compactMoney(state.cash)],['Safety',`${Math.round(state.safety)}%`],['Risks treated',state.risks.filter(r=>r.treatment).length]])}</article>`;
    this.el.riskModal.classList.remove('hidden');
  }
}

function riskMatrix(risks) {
  const cells = [];
  for (let impact = 5; impact >= 1; impact--) for (let likelihood = 1; likelihood <= 5; likelihood++) {
    const score = likelihood * impact; const cls = score >= 17 ? 'extreme' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low';
    const markers = risks.filter(r => r.status !== 'unidentified' && (r.residualLikelihood ?? r.likelihood) === likelihood && (r.residualImpact ?? r.impact) === impact).map(r => `<span class="matrix-marker" title="${r.id}: ${r.title}">${r.id.replace('R-00','')}</span>`).join('');
    cells.push(`<div class="matrix-cell ${cls}"><span>${score}</span>${markers}</div>`);
  }
  return `<div class="risk-matrix-wrap"><div class="matrix-y">Impact</div><div class="risk-matrix">${cells.join('')}</div><div class="matrix-x">Likelihood →</div></div>`;
}
function compactMoney(value) { const abs = Math.abs(value); if (abs >= 1_000_000) return `₦${(value/1_000_000).toFixed(1)}m`; if (abs >= 1_000) return `₦${Math.round(value/1_000)}k`; return `₦${Math.round(value)}`; }
function resource(symbol, value, label) { return `<div class="resource-pill"><span class="resource-symbol">${symbol}</span><span><span class="resource-value">${value}</span><span class="resource-label">${label}</span></span></div>`; }
function reportCards(items) { return `<div class="report-grid">${items.map(([k,v])=>`<div class="report-card"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div>`; }
