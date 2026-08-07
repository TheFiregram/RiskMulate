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
const tabletOverviewStatus = document.querySelector('#tabletOverviewStatus');
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
    // Keep the in-game fallback battery reading where the Battery Status API is unavailable.
  }
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
  const animation = element.animate(keyframes, {
    duration,
    easing,
    fill: 'forwards',
  });
  try {
    await animation.finished;
  } catch {
    // A newer navigation action replaced this animation.
  }
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
    persist,
    preview,
    outgoingOffset,
    incomingOffset,
    duration: outgoingOffset ? 230 : 300,
  });
}

function moveTabletView(direction) {
  if (transitionRunning) return;
  const progress = readProgress();
  const allowed = validViews(progress);
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
  if (event.target.closest('button, .tablet-view-nav, .tabs, .option')) return;
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
    const motions = [
      animateElement(tabletPageStage, [
        { transform: `translate3d(${startX}px,0,0) scale(.997)`, opacity: 0.9 },
        { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
      ], 210),
    ];
    if (preview) {
      motions.push(animateElement(preview, [
        { transform: `translate3d(${previewStart}px,0,0) scale(1)`, opacity: 0.96 },
        { transform: `translate3d(${direction * width}px,0,0) scale(.998)`, opacity: 0.88 },
      ], 210));
    }
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
    navigateTabletView(target, {
      direction,
      outgoingOffset,
      incomingOffset,
      preview,
    });
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
