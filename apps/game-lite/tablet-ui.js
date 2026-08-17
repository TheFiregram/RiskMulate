import { scenario } from './scenario.js';

const tablet = document.querySelector('#tablet');
const tabletBody = document.querySelector('#tabletBody');
const tabletTabs = document.querySelector('#tabletTabs');
const tabletMainPanel = document.querySelector('#tabletMainPanel');
const tabletPageViewport = document.querySelector('#tabletPageViewport');
const tabletPageStage = document.querySelector('#tabletPageStage');
const tabletViewNav = document.querySelector('#tabletViewNav');
const tabletViewTitle = document.querySelector('#tabletViewTitle');
const tabletViewEyebrow = document.querySelector('#tabletViewEyebrow');
const tabletBackIcon = document.querySelector('#tabletBackIcon');
const clockEl = document.querySelector('#tabletClock');
const batteryEl = document.querySelector('#tabletBattery');
const batteryFillEl = document.querySelector('#tabletBatteryFill');
const batteryLevelEl = document.querySelector('#tabletBatteryLevel');
const phaseEl = document.querySelector('#tabletPhase');
const scenarioBar = document.querySelector('#tabletScenarioBar');
const scenarioPct = document.querySelector('#tabletScenarioPct');
const riskCount = document.querySelector('#tabletRiskCount');
const inherentEl = document.querySelector('#tabletInherent');
const residualEl = document.querySelector('#tabletResidual');
const progressPctEl = document.querySelector('#tabletTreatmentPct');
const workspaceTitle = document.querySelector('#tabletWorkspaceTitle');
const taskRowsEl = document.querySelector('#tabletTaskRows');
const taskSummaryEl = document.querySelector('#tabletTaskSummary');
const insightHeadlineEl = document.querySelector('#tabletInsightHeadline');
const insightDetailEl = document.querySelector('#tabletInsightDetail');
const evidenceSummaryEl = document.querySelector('#tabletEvidenceSummary');
const evidenceListEl = document.querySelector('#tabletEvidenceList');
const treatmentStateEl = document.querySelector('#tabletTreatmentState');
const treatmentHeadlineEl = document.querySelector('#tabletTreatmentHeadline');
const treatmentCopyEl = document.querySelector('#tabletTreatmentCopy');
const treatmentConfidenceEl = document.querySelector('#tabletTreatmentConfidence');
const treatmentActionsListEl = document.querySelector('#tabletTreatmentActionsList');
const treatmentCapacityEl = document.querySelector('#tabletTreatmentCapacity');
const treatmentActionEl = document.querySelector('#tabletTreatmentAction');
const registerCountEl = document.querySelector('#tabletRegisterCount');

const saveKey = `riskmulate:${scenario.id}`;
const viewSaveKey = `${saveKey}:tablet-view`;
const stageCount = scenario.stages.length;
const viewOrder = ['overview', 'assess', 'evidence', 'matrix', 'register', 'treat', 'debrief'];
const viewMeta = {
  overview: ['FIELD STATUS', 'Overview'],
  assess: ['RISK PROCESS', 'Assessment'],
  evidence: ['CONTEXT SOURCES', 'Evidence'],
  matrix: ['RISK ANALYSIS', 'Risk Matrix'],
  register: ['RISK RECORD', 'Register'],
  treat: ['RISK TREATMENT', 'Treatment'],
  debrief: ['LEARNING REVIEW', 'Debrief'],
};
const taskDescriptions = {
  Context: 'Objectives, scope and decision criteria',
  Identify: 'Cause → event → consequence',
  Analyze: 'Likelihood × impact from evidence',
  Evaluate: 'Compare analyzed risk with criteria',
  Treat: 'Select controls for risk pathways',
  'Monitor & Review': 'Residual risk, owners and indicators',
};
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function emptyProgress() {
  return {
    inspectedFindingIds: [],
    evidenceIds: [],
    discoveredRiskIds: [],
    treatmentSelection: [],
    answers: [],
    stage: -1,
    score: 0,
    complete: false,
  };
}

function readProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(saveKey) || 'null') || {};
    return {
      ...emptyProgress(),
      ...stored,
      inspectedFindingIds: Array.isArray(stored.inspectedFindingIds) ? stored.inspectedFindingIds : [],
      evidenceIds: Array.isArray(stored.evidenceIds) ? stored.evidenceIds : [],
      discoveredRiskIds: Array.isArray(stored.discoveredRiskIds) ? stored.discoveredRiskIds : [],
      treatmentSelection: Array.isArray(stored.treatmentSelection) ? stored.treatmentSelection : [],
      answers: Array.isArray(stored.answers) ? stored.answers : [],
    };
  } catch {
    return emptyProgress();
  }
}

function updateClock() {
  if (!clockEl) return;
  clockEl.textContent = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function updateBattery(level) {
  const safeLevel = Math.max(0, Math.min(1, Number(level) || 0));
  const percent = Math.round(safeLevel * 100);
  if (batteryFillEl) batteryFillEl.style.width = `${percent}%`;
  if (batteryLevelEl) batteryLevelEl.textContent = `${percent}%`;
  if (batteryEl) {
    batteryEl.classList.toggle('is-low', percent <= 30 && percent > 15);
    batteryEl.classList.toggle('is-critical', percent <= 15);
    batteryEl.setAttribute('aria-label', `Battery ${percent} percent`);
    batteryEl.title = `Battery ${percent}%`;
  }
}

async function initBattery() {
  updateBattery(0.81);
  if (typeof navigator.getBattery !== 'function') return;
  try {
    const battery = await navigator.getBattery();
    const syncBattery = () => updateBattery(battery.level);
    syncBattery();
    battery.addEventListener('levelchange', syncBattery);
  } catch {
    // Use the in-game battery reading when the Battery Status API is unavailable.
  }
}

function allInspectionsComplete(progress) {
  return progress.inspectedFindingIds.length >= scenario.inspectionCount;
}

function discoveredRisks(progress) {
  return scenario.risks.filter((risk) => progress.discoveredRiskIds.includes(risk.id));
}

function analysisVisible(progress) {
  return progress.complete || progress.stage >= 3;
}

function residualVisible(progress) {
  return progress.complete || progress.stage >= 5;
}

function processPercent(progress) {
  if (progress.complete) return 100;
  if (progress.stage < 0) return 0;
  return Math.round((Math.max(0, progress.stage) / stageCount) * 100);
}

function insightFor(progress) {
  const inspected = progress.inspectedFindingIds.length;
  const evidence = progress.evidenceIds.length;
  if (!allInspectionsComplete(progress)) {
    const remaining = Math.max(0, scenario.inspectionCount - inspected);
    return {
      headline: `${remaining} inspection point${remaining === 1 ? '' : 's'} remain`,
      detail: `${inspected}/${scenario.inspectionCount} locations inspected · ${evidence}/${scenario.evidenceTotal} evidence items captured.`,
    };
  }
  if (progress.complete) {
    const above = discoveredRisks(progress).filter((risk) => risk.residualLikelihood * risk.residualImpact > scenario.acceptanceThreshold);
    return above.length
      ? { headline: 'Residual risk remains above criteria', detail: `${above.length} risk ${above.length === 1 ? 'requires' : 'require'} explicit approval and active monitoring after treatment.` }
      : { headline: 'Controls bring recorded risks within criteria', detail: 'Keep owners, indicators and review dates active rather than closing uncertainty prematurely.' };
  }
  const insightByStage = [
    ['Define the objective before scoring risks', 'Context anchors the assessment to people, environment, schedule, compliance and product objectives.'],
    ['Separate material risks from observations', 'Use the collected evidence to distinguish uncertain effects on objectives from defects that do not justify a risk entry.'],
    ['Assess likelihood and impact from evidence', 'Rate the inherent risk before added treatment. Do not collapse likelihood and consequence into one guess.'],
    ['Compare analyzed risk with the criteria', `The current acceptance threshold is ${scenario.acceptanceThreshold}. Treatment or escalation follows from this comparison.`],
    ['Build a control portfolio within the response window', `Use the ${scenario.treatmentBudgetMinutes}-minute capacity against each material risk pathway, not just the most visible defect.`],
    ['Residual risk still needs a decision', 'Record residual scores, owners, indicators and approval where the residual level remains above criteria.'],
  ];
  const [headline, detail] = insightByStage[Math.max(0, Math.min(progress.stage, insightByStage.length - 1))];
  return { headline, detail };
}

function renderTaskRows(progress) {
  if (!taskRowsEl) return;
  const stage = progress.stage;
  const completedCount = progress.complete ? stageCount : Math.max(0, stage);
  if (taskSummaryEl) taskSummaryEl.textContent = `${completedCount} / ${stageCount}`;
  taskRowsEl.innerHTML = scenario.stages.map((item, index) => {
    const done = progress.complete || index < stage;
    const active = !progress.complete && index === stage;
    const state = done ? 'Done' : active ? 'Current' : 'Queued';
    const icon = done ? '✓' : active ? '•' : String(index + 1);
    return `<div class="tablet-process-row ${done ? 'done' : ''} ${active ? 'active' : ''}">
      <span class="tablet-process-icon">${icon}</span>
      <div class="tablet-process-copy"><strong>${item.name}</strong><span>${taskDescriptions[item.name] || ''}</span></div>
      <span class="tablet-process-state">${state}</span>
    </div>`;
  }).join('');
}

function renderEvidencePanel(progress) {
  if (!evidenceListEl) return;
  const findings = scenario.findings.filter((finding) => progress.inspectedFindingIds.includes(finding.id));
  if (evidenceSummaryEl) evidenceSummaryEl.textContent = `${progress.evidenceIds.length} items`;
  if (!findings.length) {
    evidenceListEl.innerHTML = '<div class="tablet-empty-state">No field evidence has been captured yet.<br />Inspect highlighted plant assets to populate this vault.</div>';
    return;
  }
  evidenceListEl.innerHTML = findings.map((finding) => {
    const risk = finding.riskId ? scenario.risks.find((item) => item.id === finding.riskId) : null;
    const chip = finding.falsePositive
      ? '<span class="tablet-context-chip false">Observation only</span>'
      : `<span class="tablet-context-chip risk">${risk?.name || 'Risk candidate'}</span>`;
    return `<article class="tablet-context-card">
      <div class="tablet-context-source"><span>${finding.falsePositive ? 'VERIFICATION CHECK' : 'FIELD OBSERVATION'}</span><b>${finding.evidence.length} source item${finding.evidence.length === 1 ? '' : 's'}</b></div>
      <strong>${finding.label}</strong>
      <p>${finding.evidence[0]}</p>
      <div class="tablet-context-meta">${chip}<span class="tablet-context-chip">Inspected</span></div>
    </article>`;
  }).join('');
}

function treatmentMinutes(progress) {
  return scenario.treatmentActions
    .filter((action) => progress.treatmentSelection.includes(action.id))
    .reduce((sum, action) => sum + action.minutes, 0);
}

function renderTreatmentPanel(progress) {
  if (!treatmentActionsListEl) return;
  const confidence = Math.round(Math.min(1, progress.evidenceIds.length / scenario.evidenceTotal) * 100);
  if (treatmentConfidenceEl) treatmentConfidenceEl.textContent = `${confidence}%`;
  document.querySelectorAll('.tablet-confidence-row i').forEach((bar, index) => {
    bar.classList.toggle('on', confidence >= (index + 1) * 20);
  });

  const total = treatmentMinutes(progress);
  if (treatmentCapacityEl) treatmentCapacityEl.textContent = `${total} / ${scenario.treatmentBudgetMinutes} min`;

  if (!progress.complete && progress.stage < 4) {
    if (treatmentStateEl) treatmentStateEl.textContent = 'LOCKED';
    if (treatmentHeadlineEl) treatmentHeadlineEl.textContent = 'Complete evaluation before choosing controls';
    if (treatmentCopyEl) treatmentCopyEl.textContent = 'Treatment options stay hidden until the analyzed risks have been compared with the acceptance criteria.';
    if (treatmentActionEl) treatmentActionEl.textContent = 'Continue assessment';
    treatmentActionsListEl.innerHTML = '<div class="tablet-treatment-row"><i>•</i><span>Treatment decision becomes available after Evaluate.</span><b>—</b></div>';
    return;
  }

  const recorded = progress.complete || progress.stage > 4;
  if (treatmentStateEl) treatmentStateEl.textContent = recorded ? 'RECORDED' : 'DECISION OPEN';
  if (treatmentHeadlineEl) treatmentHeadlineEl.textContent = recorded ? 'Control portfolio recorded' : 'Build the immediate control portfolio';
  if (treatmentCopyEl) treatmentCopyEl.textContent = recorded
    ? 'Review the selected controls against each material pathway and the remaining residual-risk decision.'
    : `Choose actions across the material pathways without exceeding ${scenario.treatmentBudgetMinutes} minutes. Recommendations are withheld until the decision is committed.`;
  if (treatmentActionEl) treatmentActionEl.textContent = recorded ? 'Review assessment' : 'Make treatment decision';

  const selected = new Set(progress.treatmentSelection);
  const actions = recorded
    ? scenario.treatmentActions.filter((action) => selected.has(action.id))
    : scenario.treatmentActions;
  const fieldFixed = new Set(Array.isArray(progress.fieldFixedIds) ? progress.fieldFixedIds : []);
  treatmentActionsListEl.innerHTML = actions.map((action) => {
    const isSelected = selected.has(action.id);
    let extra = '';
    if (action.id === 'clear-access' && isSelected) {
      const plant = fieldFixed.has('access-obstruction');
      const rear = fieldFixed.has('rear-egress');
      const status = plant && rear
        ? 'Field: both access locations controlled'
        : plant || rear
          ? 'Field: partial — one access location still open'
          : 'Field: locations not yet controlled (multipath residual open)';
      extra = `<small class="tablet-treatment-note">${status}</small>`;
    }
    return `<div class="tablet-treatment-row ${isSelected ? 'selected' : ''} ${recorded ? 'recorded' : ''}">
      <i>${isSelected ? '✓' : ''}</i><span>${action.label}${extra}</span><b>${action.minutes} min</b>
    </div>`;
  }).join('') || '<div class="tablet-treatment-row"><i>•</i><span>No controls have been selected yet.</span><b>—</b></div>';
}

let registerFilter = 'all';
function applyRegisterFilter(filter = registerFilter) {
  registerFilter = filter;
  if (tabletMainPanel) tabletMainPanel.dataset.registerFilter = filter;
  document.querySelectorAll('.tablet-filter-row [data-register-filter]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.registerFilter === filter));
  });
  const rows = [...tabletBody?.querySelectorAll('.register tbody tr') || []];
  let visible = 0;
  rows.forEach((row) => {
    if (row.querySelector('[colspan]')) {
      row.hidden = false;
      return;
    }
    const text = row.textContent.toLowerCase();
    const isAbove = Boolean(row.querySelector('.risk-score.high')) || text.includes('treat') || text.includes('approval');
    const isMonitor = text.includes('monitor');
    const show = filter === 'all' || (filter === 'above' && isAbove) || (filter === 'monitor' && isMonitor);
    row.hidden = !show;
    if (show) visible += 1;
  });
  if (registerCountEl) registerCountEl.textContent = `${visible} record${visible === 1 ? '' : 's'}`;
}

function validViews(progress) {
  return progress.complete ? viewOrder : viewOrder.filter((view) => view !== 'debrief');
}

let currentView = (() => {
  const progress = readProgress();
  const saved = localStorage.getItem(viewSaveKey);
  if (saved && validViews(progress).includes(saved)) return saved;
  return progress.complete ? 'debrief' : 'overview';
})();
let lastComplete = readProgress().complete;
let viewHistory = [];
let transitionRunning = false;
let transitionSerial = 0;
let activePreview = null;

function updateBackIconState() {
  if (!tabletBackIcon) return;
  const atRoot = currentView === 'overview' && viewHistory.length === 0;
  tabletBackIcon.classList.toggle('is-root', atRoot);
  tabletBackIcon.setAttribute('aria-label', atRoot ? 'Close field tablet' : 'Go to previous tablet page');
}

function updateViewChrome(view) {
  const progress = readProgress();
  if (tabletViewTitle) tabletViewTitle.textContent = viewMeta[view][1];
  if (tabletViewEyebrow) tabletViewEyebrow.textContent = viewMeta[view][0];
  tabletViewNav?.querySelectorAll('[data-tablet-view]').forEach((button) => {
    const buttonView = button.dataset.tabletView;
    const locked = buttonView === 'debrief' && !progress.complete;
    button.classList.toggle('locked', locked);
    button.disabled = locked;
    button.setAttribute('aria-selected', String(buttonView === view));
  });
}

function applyTabletView(view, { persist = true } = {}) {
  const progress = readProgress();
  const allowed = validViews(progress);
  const nextView = allowed.includes(view) ? view : progress.complete ? 'debrief' : 'overview';
  currentView = nextView;
  if (tabletMainPanel) tabletMainPanel.dataset.tabletView = nextView;
  if (tabletPageStage) tabletPageStage.dataset.renderView = nextView;
  updateViewChrome(nextView);
  updateBackIconState();
  if (nextView === 'register') applyRegisterFilter();
  if (persist) localStorage.setItem(viewSaveKey, nextView);
  return nextView;
}

function stripCloneIdentity(node) {
  node.removeAttribute('id');
  node.setAttribute('aria-hidden', 'true');
  node.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
  node.querySelectorAll('button,input,select,textarea,a').forEach((element) => {
    element.setAttribute('tabindex', '-1');
    if ('disabled' in element) element.disabled = true;
  });
}

function removePreview(preview = activePreview) {
  if (!preview) return;
  preview.getAnimations().forEach((animation) => animation.cancel());
  preview.remove();
  if (preview === activePreview) activePreview = null;
}

function createPreview(view, direction, offset = null) {
  removePreview();
  if (!tabletPageStage || !tabletPageViewport) return null;
  const preview = tabletPageStage.cloneNode(true);
  stripCloneIdentity(preview);
  preview.dataset.renderView = view;
  preview.classList.add('tablet-page-ghost');
  preview.classList.remove('is-dragging', 'is-settling');
  const width = Math.max(1, tabletPageViewport.clientWidth);
  const start = offset ?? direction * width;
  preview.style.transform = `translate3d(${start}px,0,0) scale(.998)`;
  preview.style.opacity = offset === null ? '0.96' : '1';
  tabletPageViewport.appendChild(preview);
  activePreview = preview;
  return preview;
}

function clearStageMotion() {
  if (!tabletPageStage) return;
  tabletPageStage.getAnimations().forEach((animation) => animation.cancel());
  tabletPageStage.classList.remove('is-dragging', 'is-settling');
  tabletPageStage.style.transform = '';
  tabletPageStage.style.opacity = '';
  tabletPageViewport?.classList.remove('is-transitioning');
}

async function animateElement(element, keyframes, duration, easing = 'cubic-bezier(.22,.78,.2,1)') {
  if (!element || reduceMotion || typeof element.animate !== 'function') return;
  const animation = element.animate(keyframes, { duration, easing, fill: 'forwards' });
  try { await animation.finished; } catch { /* superseded navigation */ }
}

async function finishDualLayerTransition(nextView, direction, {
  persist = true,
  preview = null,
  outgoingOffset = 0,
  incomingOffset = null,
  duration = 290,
} = {}) {
  if (!tabletPageStage || !tabletPageViewport) {
    applyTabletView(nextView, { persist });
    return;
  }
  const serial = ++transitionSerial;
  transitionRunning = true;
  tabletPageStage.classList.remove('is-dragging');
  tabletPageStage.classList.add('is-settling');
  tabletPageViewport.classList.add('is-transitioning');

  const width = Math.max(1, tabletPageViewport.clientWidth);
  const incoming = preview || createPreview(nextView, direction);
  if (!incoming) {
    applyTabletView(nextView, { persist });
    clearStageMotion();
    transitionRunning = false;
    return;
  }
  incoming.classList.add('is-settling');
  const incomingStart = incomingOffset ?? direction * width;
  const outgoingEnd = -direction * width;
  updateViewChrome(nextView);

  if (!reduceMotion) {
    await Promise.all([
      animateElement(tabletPageStage, [
        { transform: `translate3d(${outgoingOffset}px,0,0) scale(1)`, opacity: 1 },
        { transform: `translate3d(${outgoingEnd}px,0,0) scale(.995)`, opacity: 0.82 },
      ], duration),
      animateElement(incoming, [
        { transform: `translate3d(${incomingStart}px,0,0) scale(.998)`, opacity: 0.92 },
        { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
      ], duration),
    ]);
  }

  if (serial !== transitionSerial) return;
  applyTabletView(nextView, { persist });
  tabletPageStage.style.transform = 'translate3d(0,0,0) scale(1)';
  tabletPageStage.style.opacity = '1';
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  removePreview(incoming);
  clearStageMotion();
  transitionRunning = false;
  updateBackIconState();
}

async function navigateTabletView(view, {
  direction = null,
  persist = true,
  recordHistory = true,
  outgoingOffset = 0,
  incomingOffset = null,
  preview = null,
} = {}) {
  if (transitionRunning) return;
  const progress = readProgress();
  const allowed = validViews(progress);
  const nextView = allowed.includes(view) ? view : progress.complete ? 'debrief' : 'overview';
  if (nextView === currentView) {
    removePreview(preview);
    clearStageMotion();
    return;
  }
  const currentIndex = viewOrder.indexOf(currentView);
  const nextIndex = viewOrder.indexOf(nextView);
  const resolvedDirection = direction ?? (nextIndex >= currentIndex ? 1 : -1);
  if (recordHistory && currentView) {
    if (viewHistory.at(-1) !== currentView) viewHistory.push(currentView);
    if (viewHistory.length > 12) viewHistory.shift();
  }
  await finishDualLayerTransition(nextView, resolvedDirection, {
    persist, preview, outgoingOffset, incomingOffset, duration: outgoingOffset ? 230 : 300,
  });
}

function moveTabletView(direction) {
  if (transitionRunning) return;
  const allowed = validViews(readProgress());
  const index = Math.max(0, allowed.indexOf(currentView));
  const nextIndex = Math.max(0, Math.min(allowed.length - 1, index + direction));
  if (nextIndex !== index) navigateTabletView(allowed[nextIndex], { direction });
}

function goBack() {
  if (transitionRunning) return;
  if (viewHistory.length > 0) {
    const previous = viewHistory.pop();
    const direction = viewOrder.indexOf(previous) <= viewOrder.indexOf(currentView) ? -1 : 1;
    navigateTabletView(previous, { direction, recordHistory: false });
    return;
  }
  if (currentView !== 'overview') {
    navigateTabletView('overview', { direction: -1, recordHistory: false });
    return;
  }
  window.closeTablet?.();
}

function refreshTabletChrome() {
  const progress = readProgress();
  const risks = discoveredRisks(progress);
  const percent = processPercent(progress);
  const activeStage = progress.stage >= 0 ? scenario.stages[Math.min(progress.stage, stageCount - 1)] : null;
  const insight = insightFor(progress);

  if (phaseEl) phaseEl.textContent = progress.complete ? 'Debrief' : activeStage?.name || 'Inspection';
  if (scenarioBar) scenarioBar.style.width = `${percent}%`;
  if (scenarioPct) scenarioPct.textContent = `${percent}%`;
  if (riskCount) riskCount.textContent = String(risks.length);

  const highestInherent = risks.length ? Math.max(...risks.map((risk) => risk.inherentLikelihood * risk.inherentImpact)) : 0;
  const highestResidual = risks.length ? Math.max(...risks.map((risk) => risk.residualLikelihood * risk.residualImpact)) : 0;
  if (inherentEl) inherentEl.textContent = analysisVisible(progress) && highestInherent ? String(highestInherent) : '—';
  if (residualEl) residualEl.textContent = residualVisible(progress) && highestResidual ? String(highestResidual) : '—';
  if (progressPctEl) progressPctEl.textContent = `${percent}%`;
  if (workspaceTitle) workspaceTitle.textContent = progress.complete ? 'Scenario debrief' : activeStage?.name || 'Field assessment';
  if (insightHeadlineEl) insightHeadlineEl.textContent = insight.headline;
  if (insightDetailEl) insightDetailEl.textContent = insight.detail;

  renderTaskRows(progress);
  renderEvidencePanel(progress);
  renderTreatmentPanel(progress);
  applyRegisterFilter();

  if (progress.complete && !lastComplete) {
    if (tablet?.classList.contains('open')) navigateTabletView('debrief', { direction: 1 });
    else applyTabletView('debrief');
  } else if (!validViews(progress).includes(currentView)) {
    applyTabletView(progress.complete ? 'debrief' : 'overview');
  } else if (!transitionRunning) {
    applyTabletView(currentView, { persist: false });
  }
  lastComplete = progress.complete;
}

tabletViewNav?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-tablet-view]');
  if (!button || button.disabled || transitionRunning) return;
  navigateTabletView(button.dataset.tabletView);
});

document.querySelectorAll('[data-jump-view]').forEach((button) => {
  button.addEventListener('click', () => {
    if (!transitionRunning) navigateTabletView(button.dataset.jumpView);
  });
});

document.querySelectorAll('.tablet-filter-row [data-register-filter]').forEach((button) => {
  button.addEventListener('click', () => applyRegisterFilter(button.dataset.registerFilter));
});

tabletBackIcon?.addEventListener('click', goBack);

let swipeStartX = null;
let swipeStartY = null;
let swipeStartTime = 0;
let swipeCurrentX = 0;
let swipeHorizontal = false;
let swipeDirection = 0;
let swipeTargetView = null;
let swipePreview = null;

function resetSwipe({ removeGhost = false } = {}) {
  swipeStartX = null;
  swipeStartY = null;
  swipeStartTime = 0;
  swipeCurrentX = 0;
  swipeHorizontal = false;
  swipeDirection = 0;
  swipeTargetView = null;
  if (removeGhost) removePreview(swipePreview);
  swipePreview = null;
}

function prepareSwipePreview(direction) {
  const allowed = validViews(readProgress());
  const index = allowed.indexOf(currentView);
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= allowed.length) {
    removePreview(swipePreview);
    swipePreview = null;
    swipeTargetView = null;
    return;
  }
  const target = allowed[nextIndex];
  if (swipePreview && swipeTargetView === target) return;
  removePreview(swipePreview);
  swipeTargetView = target;
  swipePreview = createPreview(target, direction);
}

tabletPageStage?.addEventListener('touchstart', (event) => {
  if (transitionRunning || event.touches.length !== 1) return;
  if (event.target.closest('button, .tablet-view-nav, .tabs, .option, input, label')) return;
  swipeStartX = event.touches[0].clientX;
  swipeStartY = event.touches[0].clientY;
  swipeStartTime = performance.now();
  swipeCurrentX = 0;
  swipeHorizontal = false;
  swipeDirection = 0;
  tabletPageStage.classList.add('is-dragging');
}, { passive: true });

tabletPageStage?.addEventListener('touchmove', (event) => {
  if (swipeStartX === null || swipeStartY === null || event.touches.length !== 1 || transitionRunning) return;
  const rawDx = event.touches[0].clientX - swipeStartX;
  const rawDy = event.touches[0].clientY - swipeStartY;
  if (!swipeHorizontal) {
    if (Math.abs(rawDx) < 7 && Math.abs(rawDy) < 7) return;
    if (Math.abs(rawDy) >= Math.abs(rawDx)) {
      tabletPageStage.classList.remove('is-dragging');
      resetSwipe({ removeGhost: true });
      return;
    }
    swipeHorizontal = true;
  }

  event.preventDefault();
  const direction = rawDx < 0 ? 1 : -1;
  if (direction !== swipeDirection) {
    swipeDirection = direction;
    prepareSwipePreview(direction);
  }
  const width = Math.max(1, tabletPageViewport?.clientWidth || tabletPageStage.clientWidth);
  const hasPreview = Boolean(swipePreview && swipeTargetView);
  const resistance = hasPreview ? 0.88 : 0.2;
  swipeCurrentX = rawDx * resistance;
  const travel = Math.min(1, Math.abs(swipeCurrentX) / width);
  tabletPageStage.style.transform = `translate3d(${swipeCurrentX}px,0,0) scale(${1 - travel * 0.006})`;
  tabletPageStage.style.opacity = String(1 - travel * 0.16);
  if (swipePreview) {
    const incomingX = swipeDirection * width + swipeCurrentX;
    swipePreview.style.transform = `translate3d(${incomingX}px,0,0) scale(${0.998 + travel * 0.002})`;
    swipePreview.style.opacity = String(0.88 + travel * 0.12);
  }
}, { passive: false });

async function settleSwipeBack() {
  if (!tabletPageStage) return;
  const startX = swipeCurrentX;
  const width = Math.max(1, tabletPageViewport?.clientWidth || tabletPageStage.clientWidth);
  const preview = swipePreview;
  const direction = swipeDirection || (startX < 0 ? 1 : -1);
  const previewStart = preview ? direction * width + startX : null;
  tabletPageStage.classList.remove('is-dragging');
  tabletPageViewport?.classList.add('is-transitioning');
  if (!reduceMotion) {
    const motions = [animateElement(tabletPageStage, [
      { transform: `translate3d(${startX}px,0,0) scale(.997)`, opacity: 0.9 },
      { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
    ], 210)];
    if (preview) motions.push(animateElement(preview, [
      { transform: `translate3d(${previewStart}px,0,0) scale(1)`, opacity: 0.96 },
      { transform: `translate3d(${direction * width}px,0,0) scale(.998)`, opacity: 0.88 },
    ], 210));
    await Promise.all(motions);
  }
  removePreview(preview);
  clearStageMotion();
}

tabletPageStage?.addEventListener('touchend', (event) => {
  if (swipeStartX === null || !event.changedTouches.length || transitionRunning) {
    resetSwipe({ removeGhost: true });
    return;
  }
  const elapsed = Math.max(1, performance.now() - swipeStartTime);
  const width = Math.max(1, tabletPageViewport?.clientWidth || tabletPageStage.clientWidth);
  const velocity = Math.abs(swipeCurrentX) / elapsed;
  const threshold = Math.max(42, width * 0.11);
  const shouldNavigate = swipeHorizontal && swipeTargetView && (Math.abs(swipeCurrentX) >= threshold || velocity >= 0.3);
  const direction = swipeDirection;
  const target = swipeTargetView;
  const preview = swipePreview;
  const outgoingOffset = swipeCurrentX;
  const incomingOffset = preview ? direction * width + swipeCurrentX : direction * width;
  resetSwipe();
  if (shouldNavigate) {
    navigateTabletView(target, { direction, outgoingOffset, incomingOffset, preview });
  } else {
    swipePreview = preview;
    swipeDirection = direction;
    swipeCurrentX = outgoingOffset;
    settleSwipeBack().finally(() => resetSwipe());
  }
}, { passive: true });

tabletPageStage?.addEventListener('touchcancel', () => {
  if (swipeStartX !== null) settleSwipeBack().finally(() => resetSwipe());
  else resetSwipe({ removeGhost: true });
}, { passive: true });

window.addEventListener('keydown', (event) => {
  if (!tablet?.classList.contains('open')) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); moveTabletView(1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); moveTabletView(-1); }
  if (event.key === 'Backspace') { event.preventDefault(); goBack(); }
});

updateClock();
initBattery();
refreshTabletChrome();
applyTabletView(currentView, { persist: false });
setInterval(updateClock, 30_000);

const observer = new MutationObserver(refreshTabletChrome);
if (tabletTabs) observer.observe(tabletTabs, { childList: true, subtree: true, attributes: true });
if (tabletBody) observer.observe(tabletBody, { childList: true, subtree: true });
if (tablet) observer.observe(tablet, { attributes: true, attributeFilter: ['class'] });

window.addEventListener('storage', (event) => {
  if (event.key === saveKey) refreshTabletChrome();
});

window.setTabletView = (view) => navigateTabletView(view);
