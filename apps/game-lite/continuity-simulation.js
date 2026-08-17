import { scenario } from './scenario.js';

const ACTION_EFFECTS = Object.freeze({
  'isolate-line': {
    outputPenalty: 5,
    likelihoodCaps: { 'solvent-release': 2 },
  },
  'protect-drain': {
    outputPenalty: 0,
    likelihoodCaps: { 'environmental-release': 1 },
  },
  'clear-access': {
    outputPenalty: 0,
    // emergency-access residual is multipath (plant-side + rear egress) — scored below
    likelihoodCaps: {},
  },
  'electrical-loto': {
    outputPenalty: 3,
    likelihoodCaps: { 'electrical-fault': 1 },
  },
  'support-startup-hold': {
    outputPenalty: 2,
    likelihoodCaps: { 'pipe-fatigue': 1 },
  },
  'support-repair-now': {
    outputPenalty: 6,
    likelihoodCaps: { 'pipe-fatigue': 1 },
  },
  'secure-temp-hose': {
    outputPenalty: 0,
    likelihoodCaps: { 'hose-disconnect': 1 },
  },
  'warning-sign': {
    outputPenalty: 0,
    likelihoodCaps: {},
  },
  'insurance-transfer': {
    outputPenalty: 0,
    likelihoodCaps: {},
  },
});

const saveKey = `riskmulate:${scenario.id}`;
let installed = false;
let fieldPanel;
let tabletPanel;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function selectedActions(currentScenario, selection) {
  const ids = new Set(asArray(selection));
  return currentScenario.treatmentActions.filter((action) => ids.has(action.id));
}

export function computeResidualProfile(currentScenario, selection = [], progress = {}) {
  const selected = new Set(asArray(selection));
  const fieldFixed = new Set(asArray(progress.fieldFixedIds));
  const profile = {};

  for (const risk of currentScenario.risks) {
    let likelihood = risk.inherentLikelihood;
    let impact = risk.inherentImpact;

    for (const actionId of selected) {
      const effect = ACTION_EFFECTS[actionId];
      const likelihoodCap = effect?.likelihoodCaps?.[risk.id];
      if (Number.isFinite(likelihoodCap)) likelihood = Math.min(likelihood, likelihoodCap);
    }

    // Multipath residual: emergency-access is fed by plant-side obstruction AND rear egress.
    // Tablet selection alone does not lower residual — field locations must be controlled.
    // One location → partial (L=2); both locations → full (L=1).
    if (risk.id === 'emergency-access' && selected.has('clear-access')) {
      const plantSide = fieldFixed.has('access-obstruction');
      const rearSide = fieldFixed.has('rear-egress');
      if (plantSide && rearSide) {
        likelihood = Math.min(likelihood, 1);
      } else if (plantSide || rearSide) {
        likelihood = Math.min(likelihood, 2);
      }
      // else: keep inherent — pathway not yet controlled in the field
    }

    profile[risk.id] = {
      likelihood,
      impact,
      score: likelihood * impact,
    };
  }

  return profile;
}

export function computeContinuityState(currentScenario, progress = {}) {
  const treatmentSelection = asArray(progress.treatmentSelection);
  const selected = selectedActions(currentScenario, treatmentSelection);
  const treatIndex = currentScenario.stages.findIndex((stage) => stage.name === 'Treat');
  const treatmentOpen = Number(progress.stage) >= treatIndex;
  const treatmentCommitted = asArray(progress.answers)
    .some((answer) => answer?.stage === 'Treat' && answer?.correct === true);
  const mode = treatmentCommitted ? 'ACTIVE' : treatmentOpen ? 'PROJECTED' : 'BASELINE';
  // Field FIX writes treatmentSelection immediately — residual must reflect plant controls
  // even before the formal Treat stage opens (ISO 31000: treat happens at the hazard).
  const fieldDrivenSelection = asArray(progress.treatmentSelection);
  const effectiveSelection = treatmentOpen || fieldDrivenSelection.length
    ? fieldDrivenSelection
    : [];
  const residuals = computeResidualProfile(currentScenario, effectiveSelection, progress);
  const minutesUsed = selected.reduce((sum, action) => sum + action.minutes, 0);
  const outputPenalty = treatmentOpen
    ? selected.reduce((sum, action) => sum + (ACTION_EFFECTS[action.id]?.outputPenalty || 0), 0)
    : 0;
  const availableOutput = Math.max(0, 100 - outputPenalty);
  const discovered = new Set(asArray(progress.discoveredRiskIds));
  const relevantResiduals = currentScenario.risks
    .filter((risk) => discovered.size === 0 || discovered.has(risk.id))
    .map((risk) => residuals[risk.id]);
  const highestResidual = relevantResiduals.length
    ? Math.max(...relevantResiduals.map((risk) => risk.score))
    : 0;

  const has = (id) => effectiveSelection.includes(id);
  const containment = has('protect-drain')
    ? 'PROTECTED'
    : discovered.has('environmental-release')
      ? 'EXPOSED'
      : 'GREEN';
  const quality = treatmentOpen
    ? has('support-startup-hold') && has('electrical-loto')
      ? 'PROTECTED'
      : 'EXPOSED'
    : 'WITHIN LIMIT';
  const fieldFixedIds = new Set(asArray(progress.fieldFixedIds));
  const accessLocationsFixed = ['access-obstruction', 'rear-egress'].filter((id) => fieldFixedIds.has(id));
  // Response capability is only restored when BOTH access locations are field-controlled.
  const responseReady = !discovered.has('emergency-access')
    || accessLocationsFixed.length >= 2;
  const responseWindowRemaining = Math.max(0, currentScenario.treatmentBudgetMinutes - minutesUsed);
  const approvalRequired = treatmentCommitted && highestResidual > currentScenario.acceptanceThreshold;
  const outputTargetMet = availableOutput >= 90;
  const startupStatus = treatmentCommitted
    ? approvalRequired
      ? 'HOLD / APPROVAL'
      : 'CONTROLLED'
    : treatmentOpen
      ? 'PLAN PENDING'
      : 'ASSESSING';

  // ACCESS status is location-driven from field work (multipath teaching).
  const accessKnown = discovered.has('emergency-access') || accessLocationsFixed.length > 0;
  const accessPartial = accessKnown && accessLocationsFixed.length === 1;
  const accessLabel = !accessKnown
    ? 'CLEAR'
    : accessLocationsFixed.length >= 2
      ? 'CLEAR'
      : accessPartial
        ? 'PARTIAL'
        : 'BLOCKED';

  return {
    mode,
    availableOutput,
    outputTargetMet,
    quality,
    containment,
    responseReady,
    accessPartial,
    accessLabel,
    accessLocationsFixed: accessLocationsFixed.length,
    responseWindowRemaining,
    minutesUsed,
    highestResidual,
    approvalRequired,
    startupStatus,
    residuals,
  };
}

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(saveKey) || 'null') || {};
  } catch {
    return {};
  }
}

function applyDynamicResiduals(state) {
  for (const risk of scenario.risks) {
    const residual = state.residuals[risk.id];
    if (!residual) continue;
    risk.residualLikelihood = residual.likelihood;
    risk.residualImpact = residual.impact;
  }
}

function injectStyles() {
  const href = new URL('./continuity-simulation.css', import.meta.url).href;
  if ([...document.styleSheets].some((sheet) => sheet.href === href)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function metricMarkup(id, label, value) {
  return `<div class="continuity-metric" data-metric="${id}"><span>${label}</span><strong data-value="${id}">${value}</strong></div>`;
}

function mountPanels() {
  if (!document.querySelector('#continuityHud')) {
    fieldPanel = document.createElement('section');
    fieldPanel.id = 'continuityHud';
    fieldPanel.className = 'hud continuity-hud';
    fieldPanel.setAttribute('aria-label', 'Live continuity status');
    fieldPanel.innerHTML = `
      <header><span>CONTINUITY</span><b data-value="mode">BASELINE</b></header>
      <div class="continuity-metrics">
        ${metricMarkup('output', 'OUTPUT CAP', '100%')}
        ${metricMarkup('quality', 'QUALITY', 'WITHIN LIMIT')}
        ${metricMarkup('containment', 'CONTAIN', 'GREEN')}
        ${metricMarkup('access', 'ACCESS', 'CLEAR')}
        ${metricMarkup('window', 'WINDOW', `${scenario.treatmentBudgetMinutes}:00`)}
      </div>`;
    document.body.appendChild(fieldPanel);
  } else {
    fieldPanel = document.querySelector('#continuityHud');
  }

  if (!document.querySelector('#continuityTabletStrip')) {
    tabletPanel = document.createElement('section');
    tabletPanel.id = 'continuityTabletStrip';
    tabletPanel.className = 'continuity-tablet-strip';
    tabletPanel.setAttribute('aria-label', 'Continuity objective status');
    tabletPanel.innerHTML = `
      <div class="continuity-strip-head"><span>LIVE OBJECTIVES</span><b data-value="startup">ASSESSING</b></div>
      <div class="continuity-strip-grid">
        ${metricMarkup('output', 'AVAILABLE OUTPUT', '100%')}
        ${metricMarkup('quality', 'QUALITY', 'WITHIN LIMIT')}
        ${metricMarkup('containment', 'CONTAINMENT', 'GREEN')}
        ${metricMarkup('access', 'EGRESS ACCESS', 'CLEAR')}
        ${metricMarkup('residual', 'MAX RESIDUAL', '—')}
        ${metricMarkup('window', 'RESPONSE WINDOW', `${scenario.treatmentBudgetMinutes}:00`)}
      </div>
      <p data-value="decision">Collect evidence before committing operational controls.</p>`;
    const statusbar = document.querySelector('.tablet-statusbar');
    statusbar?.insertAdjacentElement('afterend', tabletPanel);
  } else {
    tabletPanel = document.querySelector('#continuityTabletStrip');
  }
}

function setPanelValue(panel, key, value) {
  panel?.querySelectorAll(`[data-value="${key}"]`).forEach((element) => {
    element.textContent = value;
  });
}

function setMetricState(panel, key, state) {
  const metric = panel?.querySelector(`[data-metric="${key}"]`);
  if (metric) metric.dataset.state = state;
}

function decisionText(state) {
  if (state.mode === 'BASELINE') {
    return 'Current production capability is intact; assessment determines which controls are justified before startup.';
  }
  if (state.mode === 'PROJECTED') {
    return `Projected plan preserves ${state.availableOutput}% output capacity with ${state.responseWindowRemaining} minutes unallocated. Residual risk is recalculated from the selected controls.`;
  }
  if (state.approvalRequired) {
    return `Controls preserve ${state.availableOutput}% output capacity, but residual risk ${state.highestResidual} remains above the acceptance threshold ${scenario.acceptanceThreshold}; approval and monitoring are required.`;
  }
  return `Controls preserve ${state.availableOutput}% output capacity and bring assessed residual risks within the current acceptance criteria.`;
}

function renderState(state) {
  mountPanels();

  const output = `${state.availableOutput}%`;
  const windowText = `${state.responseWindowRemaining}:00`;
  const residualText = state.mode === 'BASELINE' ? '—' : String(state.highestResidual || '—');

  for (const panel of [fieldPanel, tabletPanel]) {
    setPanelValue(panel, 'mode', state.mode);
    setPanelValue(panel, 'startup', state.startupStatus);
    setPanelValue(panel, 'output', output);
    setPanelValue(panel, 'quality', state.quality);
    setPanelValue(panel, 'containment', state.containment);
    setPanelValue(panel, 'access', state.accessLabel || 'CLEAR');
    setPanelValue(panel, 'window', windowText);
    setPanelValue(panel, 'residual', residualText);
  }
  setPanelValue(tabletPanel, 'decision', decisionText(state));

  setMetricState(fieldPanel, 'output', state.outputTargetMet ? 'good' : 'bad');
  setMetricState(tabletPanel, 'output', state.outputTargetMet ? 'good' : 'bad');
  setMetricState(fieldPanel, 'quality', state.quality === 'PROTECTED' || state.quality === 'WITHIN LIMIT' ? 'good' : 'bad');
  setMetricState(tabletPanel, 'quality', state.quality === 'PROTECTED' || state.quality === 'WITHIN LIMIT' ? 'good' : 'bad');
  setMetricState(fieldPanel, 'containment', state.containment === 'PROTECTED' || state.containment === 'GREEN' ? 'good' : 'bad');
  setMetricState(tabletPanel, 'containment', state.containment === 'PROTECTED' || state.containment === 'GREEN' ? 'good' : 'bad');
  const accessState = state.accessLabel === 'CLEAR' ? 'good' : state.accessLabel === 'PARTIAL' ? 'neutral' : 'bad';
  setMetricState(fieldPanel, 'access', accessState);
  setMetricState(tabletPanel, 'access', accessState);
  setMetricState(tabletPanel, 'residual', state.highestResidual > scenario.acceptanceThreshold ? 'bad' : 'good');
  setMetricState(fieldPanel, 'window', state.responseWindowRemaining > 0 ? 'neutral' : 'bad');
  setMetricState(tabletPanel, 'window', state.responseWindowRemaining > 0 ? 'neutral' : 'bad');

  document.documentElement.dataset.continuityMode = state.mode.toLowerCase();
}

function refresh(progress = readProgress()) {
  const state = computeContinuityState(scenario, progress);
  applyDynamicResiduals(state);
  renderState(state);
  window.dispatchEvent(new CustomEvent('riskmulate:continuity', { detail: state }));
  return state;
}

export function installContinuitySimulation() {
  if (installed) return;
  installed = true;
  injectStyles();
  mountPanels();
  window.addEventListener('riskmulate:progress', (event) => refresh(event.detail || readProgress()));
  window.addEventListener('storage', (event) => {
    if (event.key === saveKey) refresh();
  });
  refresh();
}
