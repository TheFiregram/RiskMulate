import { scenario } from './scenario.js';

const stageEl = document.querySelector('#stage');
const startButton = document.querySelector('#startButton');
const phaseNameEl = document.querySelector('#phaseName');
const phaseOrdinalEl = document.querySelector('#phaseOrdinal');
const riskCountEl = document.querySelector('#hudRiskCount');
const evidenceCountEl = document.querySelector('#hudEvidenceCount');
const elapsedEl = document.querySelector('#hudElapsed');
const objectiveToast = document.querySelector('#objectiveToast');
const cycleSteps = [...document.querySelectorAll('.cycle-step')];

const saveKey = `riskmulate:${scenario.id}`;
const stageNames = scenario.stages.map((item) => item.name);
let sessionStartedAt = null;
let objectiveTimer = null;

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

function updateCycle(activeStage, progress) {
  const activeIndex = stageNames.indexOf(activeStage);
  cycleSteps.forEach((step) => {
    const index = stageNames.indexOf(step.dataset.stage);
    step.classList.toggle('active', !progress.complete && index === activeIndex);
    step.classList.toggle('done', progress.complete || (activeIndex >= 0 && index < activeIndex));
  });
}

function updateHud() {
  const progress = readProgress();
  const runtimeStage = stageEl?.textContent?.trim() || 'Inspection';
  const activeStage = progress.complete ? 'Monitor & Review' : runtimeStage;
  const stageIndex = stageNames.indexOf(activeStage);

  if (progress.complete) {
    phaseOrdinalEl.textContent = '06 / 06';
    phaseNameEl.textContent = 'Review complete';
  } else if (stageIndex >= 0) {
    phaseOrdinalEl.textContent = `${String(stageIndex + 1).padStart(2, '0')} / ${String(stageNames.length).padStart(2, '0')}`;
    phaseNameEl.textContent = activeStage;
  } else {
    phaseOrdinalEl.textContent = 'FIELD';
    phaseNameEl.textContent = 'Inspection';
  }

  riskCountEl.textContent = progress.found ? '1/1' : '0/1';
  evidenceCountEl.textContent = progress.found ? '1/1' : '0/1';
  updateCycle(activeStage, progress);
}

function updateElapsed() {
  if (!sessionStartedAt) {
    elapsedEl.textContent = '00:00';
    return;
  }
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  elapsedEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function showObjectiveBrief() {
  clearTimeout(objectiveTimer);
  objectiveToast.classList.add('show');
  objectiveTimer = setTimeout(() => objectiveToast.classList.remove('show'), 4800);
}

stageEl && new MutationObserver(updateHud).observe(stageEl, {
  childList: true,
  characterData: true,
  subtree: true,
});

startButton?.addEventListener('click', () => {
  sessionStartedAt = Date.now();
  updateElapsed();
  showObjectiveBrief();
});

window.addEventListener('storage', (event) => {
  if (event.key === saveKey) updateHud();
});

updateHud();
updateElapsed();
setInterval(updateElapsed, 1000);
