import { scenario } from './scenario.js';

const tablet = document.querySelector('#tablet');
const tabletBody = document.querySelector('#tabletBody');
const tabletTabs = document.querySelector('#tabletTabs');
const tabletMainPanel = document.querySelector('#tabletMainPanel');
const tabletViewNav = document.querySelector('#tabletViewNav');
const tabletViewTitle = document.querySelector('#tabletViewTitle');
const tabletViewEyebrow = document.querySelector('#tabletViewEyebrow');
const tabletOverviewStatus = document.querySelector('#tabletOverviewStatus');
const clockEl = document.querySelector('#tabletClock');
const phaseEl = document.querySelector('#tabletPhase');
const scenarioBar = document.querySelector('#tabletScenarioBar');
const scenarioPct = document.querySelector('#tabletScenarioPct');
const riskCount = document.querySelector('#tabletRiskCount');
const inherentEl = document.querySelector('#tabletInherent');
const residualEl = document.querySelector('#tabletResidual');
const progressPctEl = document.querySelector('#tabletTreatmentPct');
const workspaceTitle = document.querySelector('#tabletWorkspaceTitle');
const updateEl = document.querySelector('#tabletUpdate');

const saveKey = `riskmulate:${scenario.id}`;
const viewSaveKey = `${saveKey}:tablet-view`;
const stageCount = scenario.stages.length;
const inherentScore = scenario.risk.inherentLikelihood * scenario.risk.inherentImpact;
const residualScore = scenario.risk.residualLikelihood * scenario.risk.residualImpact;
const viewOrder = ['overview', 'assess', 'matrix', 'register', 'debrief'];
const viewMeta = {
  overview: ['FIELD STATUS', 'Overview'],
  assess: ['RISK PROCESS', 'Assessment'],
  matrix: ['RISK ANALYSIS', 'Risk Matrix'],
  register: ['RISK RECORD', 'Register'],
  debrief: ['LEARNING REVIEW', 'Debrief'],
};

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(saveKey) || 'null') || {
      found: false,
      stage: -1,
      score: 0,
      complete: false,
    };
  } catch {
    return { found: false, stage: -1, score: 0, complete: false };
  }
}

function updateClock() {
  if (!clockEl) return;
  clockEl.textContent = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function stageUpdateText(progress) {
  if (!progress.found) {
    return 'Inspect the highlighted flange and capture field evidence before assessing the risk.';
  }
  if (progress.complete) {
    return 'Assessment complete. Residual risk is 10, above the acceptance threshold of 9. Approval and monitoring are still required.';
  }

  const messages = [
    'Evidence captured. Establish the operating objectives and context before rating the risk.',
    'Context recorded. Express the risk as a cause → event → consequence chain.',
    'Risk identified. Assess inherent likelihood and impact before added controls.',
    'Inherent score is 20. Compare the result with the acceptance threshold of 9.',
    'Treatment is required. Select controls that act on the hazardous event and its likelihood.',
    'Residual score is 10. Record ownership, approval, indicators, and review actions.',
  ];
  return messages[Math.max(0, Math.min(progress.stage, messages.length - 1))];
}

function overviewStatus(progress) {
  if (!progress.found) return 'Inspect field evidence';
  if (progress.complete) return 'Residual approval required';
  const active = scenario.stages[Math.max(0, Math.min(progress.stage, stageCount - 1))];
  return active ? `${active.name} in progress` : 'Assessment in progress';
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

function setTabletView(view, { persist = true } = {}) {
  const progress = readProgress();
  const allowed = validViews(progress);
  const nextView = allowed.includes(view) ? view : progress.complete ? 'debrief' : 'overview';
  currentView = nextView;

  if (tabletMainPanel) tabletMainPanel.dataset.tabletView = nextView;
  if (tabletViewTitle) tabletViewTitle.textContent = viewMeta[nextView][1];
  if (tabletViewEyebrow) tabletViewEyebrow.textContent = viewMeta[nextView][0];

  tabletViewNav?.querySelectorAll('[data-tablet-view]').forEach((button) => {
    const buttonView = button.dataset.tabletView;
    const locked = buttonView === 'debrief' && !progress.complete;
    button.classList.toggle('locked', locked);
    button.disabled = locked;
    button.setAttribute('aria-selected', String(buttonView === nextView));
  });

  if (persist) localStorage.setItem(viewSaveKey, nextView);
}

function moveTabletView(direction) {
  const progress = readProgress();
  const allowed = validViews(progress);
  const index = Math.max(0, allowed.indexOf(currentView));
  const nextIndex = Math.max(0, Math.min(allowed.length - 1, index + direction));
  if (nextIndex !== index) setTabletView(allowed[nextIndex]);
}

function refreshTabletChrome() {
  const progress = readProgress();
  const found = Boolean(progress.found);
  const complete = Boolean(progress.complete);
  const stage = Number.isFinite(progress.stage) ? progress.stage : -1;
  const reachedStages = complete ? stageCount : found ? Math.max(1, stage + 1) : 0;
  const percent = Math.round((reachedStages / stageCount) * 100);
  const activeStage = found ? scenario.stages[Math.max(0, Math.min(stage, stageCount - 1))] : null;

  if (phaseEl) phaseEl.textContent = complete ? 'Debrief' : activeStage?.name || 'Inspection';
  if (scenarioBar) scenarioBar.style.width = `${percent}%`;
  if (scenarioPct) scenarioPct.textContent = `${percent}%`;
  if (riskCount) riskCount.textContent = found ? '1' : '0';

  const showInherent = complete || stage >= 2;
  const showResidual = complete || stage >= 5;
  if (inherentEl) inherentEl.textContent = showInherent ? String(inherentScore) : '—';
  if (residualEl) residualEl.textContent = showResidual ? String(residualScore) : '—';
  if (progressPctEl) progressPctEl.textContent = `${percent}%`;
  if (workspaceTitle) workspaceTitle.textContent = complete ? 'Scenario debrief' : activeStage?.name || 'Field assessment';
  if (updateEl) updateEl.textContent = stageUpdateText(progress);
  if (tabletOverviewStatus) tabletOverviewStatus.textContent = overviewStatus(progress);

  if (complete && !lastComplete) {
    setTabletView('debrief');
  } else if (!validViews(progress).includes(currentView)) {
    setTabletView(complete ? 'debrief' : 'overview');
  } else {
    setTabletView(currentView, { persist: false });
  }
  lastComplete = complete;
}

tabletViewNav?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-tablet-view]');
  if (!button || button.disabled) return;
  setTabletView(button.dataset.tabletView);
});

document.querySelectorAll('[data-jump-view]').forEach((button) => {
  button.addEventListener('click', () => setTabletView(button.dataset.jumpView));
});

let swipeStartX = null;
let swipeStartY = null;
tabletMainPanel?.addEventListener('touchstart', (event) => {
  if (event.touches.length !== 1) return;
  if (event.target.closest('button, .tablet-view-nav, .tabs')) return;
  swipeStartX = event.touches[0].clientX;
  swipeStartY = event.touches[0].clientY;
}, { passive: true });

tabletMainPanel?.addEventListener('touchend', (event) => {
  if (swipeStartX === null || swipeStartY === null || !event.changedTouches.length) return;
  const dx = event.changedTouches[0].clientX - swipeStartX;
  const dy = event.changedTouches[0].clientY - swipeStartY;
  swipeStartX = null;
  swipeStartY = null;
  if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
  moveTabletView(dx < 0 ? 1 : -1);
}, { passive: true });

window.addEventListener('keydown', (event) => {
  if (!tablet?.classList.contains('open')) return;
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    moveTabletView(1);
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    moveTabletView(-1);
  }
});

updateClock();
refreshTabletChrome();
setTabletView(currentView, { persist: false });
setInterval(updateClock, 30_000);

const observer = new MutationObserver(refreshTabletChrome);
if (tabletTabs) observer.observe(tabletTabs, { childList: true, subtree: true, attributes: true });
if (tabletBody) observer.observe(tabletBody, { childList: true, subtree: true });
if (tablet) observer.observe(tablet, { attributes: true, attributeFilter: ['class'] });

window.addEventListener('storage', (event) => {
  if (event.key === saveKey) refreshTabletChrome();
});

window.setTabletView = setTabletView;
