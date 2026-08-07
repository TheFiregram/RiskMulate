import { scenario } from './scenario.js';

const tablet = document.querySelector('#tablet');
const tabletBody = document.querySelector('#tabletBody');
const tabletTabs = document.querySelector('#tabletTabs');
const clockEl = document.querySelector('#tabletClock');
const phaseEl = document.querySelector('#tabletPhase');
const scenarioBar = document.querySelector('#tabletScenarioBar');
const scenarioPct = document.querySelector('#tabletScenarioPct');
const riskCount = document.querySelector('#tabletRiskCount');
const inherentEl = document.querySelector('#tabletInherent');
const residualEl = document.querySelector('#tabletResidual');
const progressPctEl = document.querySelector('#tabletTreatmentPct');
const progressDetail = document.querySelector('#tabletProgressDetail');
const radialMeter = document.querySelector('#tabletRadialMeter');
const workspaceTitle = document.querySelector('#tabletWorkspaceTitle');
const taskCount = document.querySelector('#tabletTaskCount');
const taskInspect = document.querySelector('#tabletTaskInspect');
const taskAssess = document.querySelector('#tabletTaskAssess');
const taskTreat = document.querySelector('#tabletTaskTreat');
const updateEl = document.querySelector('#tabletUpdate');

const saveKey = `riskmulate:${scenario.id}`;
const stageCount = scenario.stages.length;
const inherentScore = scenario.risk.inherentLikelihood * scenario.risk.inherentImpact;
const residualScore = scenario.risk.residualLikelihood * scenario.risk.residualImpact;

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

function setTaskDone(element, done) {
  element?.classList.toggle('done', done);
}

function updateClock() {
  if (!clockEl) return;
  clockEl.textContent = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function updateRiskTags(showInherent, showResidual) {
  const inherentTag = document.querySelector('.tablet-kpi:nth-child(2) .risk-tag');
  const residualTag = document.querySelector('.tablet-kpi:nth-child(3) .risk-tag');

  if (inherentTag) {
    inherentTag.textContent = 'ABOVE LIMIT';
    inherentTag.style.visibility = showInherent ? 'visible' : 'hidden';
  }
  if (residualTag) {
    residualTag.textContent = 'ABOVE LIMIT';
    residualTag.style.visibility = showResidual ? 'visible' : 'hidden';
  }
}

function stageUpdateText(progress) {
  if (!progress.found) {
    return 'No field evidence recorded yet. Inspect the highlighted asset to start the risk cycle.';
  }
  if (progress.complete) {
    return 'Assessment complete. Residual risk remains above the acceptance threshold and needs approval plus monitoring.';
  }

  const messages = [
    'Evidence captured. Establish the operating objectives and context before rating the risk.',
    'Context recorded. Write the risk as a cause → event → consequence chain.',
    'Risk identified. Assess inherent likelihood and impact before added controls.',
    'Inherent score is 20. Compare it with the acceptance threshold of 9.',
    'Treatment is required. Select controls that act on the hazardous event and its likelihood.',
    'Residual score is 10. Record ownership, approval, indicators, and review actions.',
  ];
  return messages[Math.max(0, Math.min(progress.stage, messages.length - 1))];
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
  updateRiskTags(showInherent, showResidual);

  if (progressPctEl) progressPctEl.textContent = `${percent}%`;
  if (radialMeter) radialMeter.style.setProperty('--meter', `${percent}%`);
  if (progressDetail) {
    progressDetail.textContent = complete
      ? `${stageCount} of ${stageCount} stages recorded`
      : found
        ? `${reachedStages} of ${stageCount} stages reached`
        : 'Inspect evidence to begin';
  }
  if (workspaceTitle) workspaceTitle.textContent = complete ? 'Scenario debrief' : activeStage?.name || 'Field assessment';

  const inspected = found;
  const assessed = complete || stage >= 4;
  const treated = complete || stage >= 5;
  setTaskDone(taskInspect, inspected);
  setTaskDone(taskAssess, assessed);
  setTaskDone(taskTreat, treated);
  const openTasks = [inspected, assessed, treated].filter((done) => !done).length;
  if (taskCount) taskCount.textContent = `${openTasks} OPEN`;
  if (updateEl) updateEl.textContent = stageUpdateText(progress);
}

updateClock();
refreshTabletChrome();
setInterval(updateClock, 30_000);

const observer = new MutationObserver(refreshTabletChrome);
if (tabletTabs) observer.observe(tabletTabs, { childList: true, subtree: true, attributes: true });
if (tabletBody) observer.observe(tabletBody, { childList: true, subtree: true });
if (tablet) observer.observe(tablet, { attributes: true, attributeFilter: ['class'] });

window.addEventListener('storage', (event) => {
  if (event.key === saveKey) refreshTabletChrome();
});
