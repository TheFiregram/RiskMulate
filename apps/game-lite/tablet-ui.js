import { scenario } from './scenario.js';

const tablet = document.querySelector('#tablet');
const tabletBody = document.querySelector('#tabletBody');
const tabletTabs = document.querySelector('#tabletTabs');
const tabletMainPanel = document.querySelector('#tabletMainPanel');
const tabletPageStage = document.querySelector('#tabletPageStage');
const tabletViewNav = document.querySelector('#tabletViewNav');
const tabletViewTitle = document.querySelector('#tabletViewTitle');
const tabletViewEyebrow = document.querySelector('#tabletViewEyebrow');
const tabletOverviewStatus = document.querySelector('#tabletOverviewStatus');
const tabletBackIcon = document.querySelector('#tabletBackIcon');
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
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
let viewHistory = [];
let transitionRunning = false;
let transitionSerial = 0;

function updateBackIconState() {
  if (!tabletBackIcon) return;
  const atRoot = currentView === 'overview' && viewHistory.length === 0;
  tabletBackIcon.classList.toggle('is-root', atRoot);
  tabletBackIcon.setAttribute('aria-label', atRoot ? 'Close field tablet' : 'Go to previous tablet page');
}

function applyTabletView(view, { persist = true } = {}) {
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

  updateBackIconState();
  if (persist) localStorage.setItem(viewSaveKey, nextView);
  return nextView;
}

function clearStageMotion() {
  if (!tabletPageStage) return;
  tabletPageStage.getAnimations().forEach((animation) => animation.cancel());
  tabletPageStage.classList.remove('is-dragging', 'is-settling');
  tabletPageStage.style.transform = '';
  tabletPageStage.style.opacity = '';
}

async function animateStage(keyframes, duration, easing = 'cubic-bezier(.22,.72,.24,1)') {
  if (!tabletPageStage || reduceMotion || typeof tabletPageStage.animate !== 'function') return;
  const animation = tabletPageStage.animate(keyframes, {
    duration,
    easing,
    fill: 'forwards',
  });
  try {
    await animation.finished;
  } catch {
    // A newer page transition superseded this animation.
  }
}

async function navigateTabletView(view, {
  direction = null,
  persist = true,
  recordHistory = true,
  dragOffset = 0,
} = {}) {
  const progress = readProgress();
  const allowed = validViews(progress);
  const nextView = allowed.includes(view) ? view : progress.complete ? 'debrief' : 'overview';
  if (nextView === currentView) {
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

  const serial = ++transitionSerial;
  transitionRunning = true;
  const width = Math.max(1, tabletPageStage?.clientWidth || tabletMainPanel?.clientWidth || 360);
  const startX = Number.isFinite(dragOffset) ? dragOffset : 0;
  const exitX = resolvedDirection > 0 ? -width * 0.2 : width * 0.2;
  const enterX = resolvedDirection > 0 ? width * 0.18 : -width * 0.18;

  if (tabletPageStage) {
    tabletPageStage.classList.remove('is-dragging');
    tabletPageStage.classList.add('is-settling');
  }

  if (!reduceMotion) {
    await animateStage([
      { transform: `translate3d(${startX}px,0,0) scale(1)`, opacity: 1 },
      { transform: `translate3d(${exitX}px,0,0) scale(.988)`, opacity: 0.1 },
    ], dragOffset ? 120 : 145, 'cubic-bezier(.4,0,.75,.3)');
  }

  if (serial !== transitionSerial) return;
  applyTabletView(nextView, { persist });

  if (!reduceMotion) {
    await animateStage([
      { transform: `translate3d(${enterX}px,0,0) scale(.992)`, opacity: 0.12 },
      { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
    ], 220);
  }

  if (serial === transitionSerial) {
    clearStageMotion();
    transitionRunning = false;
    updateBackIconState();
  }
}

function moveTabletView(direction, options = {}) {
  if (transitionRunning) return;
  const progress = readProgress();
  const allowed = validViews(progress);
  const index = Math.max(0, allowed.indexOf(currentView));
  const nextIndex = Math.max(0, Math.min(allowed.length - 1, index + direction));
  if (nextIndex !== index) {
    navigateTabletView(allowed[nextIndex], { direction, ...options });
  }
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
    if (tablet?.classList.contains('open')) {
      navigateTabletView('debrief', { direction: 1 });
    } else {
      applyTabletView('debrief');
    }
  } else if (!validViews(progress).includes(currentView)) {
    applyTabletView(complete ? 'debrief' : 'overview');
  } else if (!transitionRunning) {
    applyTabletView(currentView, { persist: false });
  }
  lastComplete = complete;
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

tabletBackIcon?.addEventListener('click', goBack);

let swipeStartX = null;
let swipeStartY = null;
let swipeStartTime = 0;
let swipeCurrentX = 0;
let swipeHorizontal = false;

function resetSwipe() {
  swipeStartX = null;
  swipeStartY = null;
  swipeStartTime = 0;
  swipeCurrentX = 0;
  swipeHorizontal = false;
}

tabletPageStage?.addEventListener('touchstart', (event) => {
  if (transitionRunning || event.touches.length !== 1) return;
  if (event.target.closest('button, .tablet-view-nav, .tabs, .option')) return;
  swipeStartX = event.touches[0].clientX;
  swipeStartY = event.touches[0].clientY;
  swipeStartTime = performance.now();
  swipeCurrentX = 0;
  swipeHorizontal = false;
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
      resetSwipe();
      return;
    }
    swipeHorizontal = true;
  }

  event.preventDefault();
  const allowed = validViews(readProgress());
  const index = allowed.indexOf(currentView);
  const atLeftEdge = index <= 0 && rawDx > 0;
  const atRightEdge = index >= allowed.length - 1 && rawDx < 0;
  const resistance = atLeftEdge || atRightEdge ? 0.2 : 0.72;
  swipeCurrentX = rawDx * resistance;
  const width = Math.max(1, tabletPageStage.clientWidth);
  const travel = Math.min(1, Math.abs(swipeCurrentX) / width);
  tabletPageStage.style.transform = `translate3d(${swipeCurrentX}px,0,0) scale(${1 - travel * 0.012})`;
  tabletPageStage.style.opacity = String(1 - travel * 0.55);
}, { passive: false });

async function settleSwipeBack() {
  if (!tabletPageStage) return;
  const startX = swipeCurrentX;
  tabletPageStage.classList.remove('is-dragging');
  tabletPageStage.classList.add('is-settling');
  if (!reduceMotion) {
    await animateStage([
      { transform: `translate3d(${startX}px,0,0) scale(.995)`, opacity: 0.82 },
      { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
    ], 190);
  }
  clearStageMotion();
}

tabletPageStage?.addEventListener('touchend', (event) => {
  if (swipeStartX === null || !event.changedTouches.length || transitionRunning) {
    resetSwipe();
    return;
  }

  const elapsed = Math.max(1, performance.now() - swipeStartTime);
  const width = Math.max(1, tabletPageStage.clientWidth);
  const velocity = Math.abs(swipeCurrentX) / elapsed;
  const threshold = Math.max(44, width * 0.12);
  const direction = swipeCurrentX < 0 ? 1 : -1;
  const progress = readProgress();
  const allowed = validViews(progress);
  const index = allowed.indexOf(currentView);
  const nextIndex = index + direction;
  const hasNext = nextIndex >= 0 && nextIndex < allowed.length;
  const shouldNavigate = swipeHorizontal && hasNext && (Math.abs(swipeCurrentX) >= threshold || velocity >= 0.34);
  const dragOffset = swipeCurrentX;

  resetSwipe();
  if (shouldNavigate) {
    navigateTabletView(allowed[nextIndex], { direction, dragOffset });
  } else {
    settleSwipeBack();
  }
}, { passive: true });

tabletPageStage?.addEventListener('touchcancel', () => {
  if (swipeStartX !== null) settleSwipeBack();
  resetSwipe();
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
  if (event.key === 'Backspace') {
    event.preventDefault();
    goBack();
  }
});

updateClock();
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
