import { scenario } from './scenario.js';

const cssHref = new URL('./multi-risk.css', import.meta.url).href;
if (![...document.styleSheets].some((sheet) => sheet.href === cssHref)) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssHref;
  document.head.appendChild(link);
}

const saveKey = `riskmulate:${scenario.id}`;
let refreshQueued = false;

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(saveKey) || 'null') || {};
  } catch {
    return {};
  }
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && element.textContent !== String(value)) element.textContent = String(value);
}

function refreshMultiRiskChrome() {
  refreshQueued = false;
  const progress = readProgress();
  const discoveredRiskIds = Array.isArray(progress.discoveredRiskIds) ? progress.discoveredRiskIds : [];
  const evidenceIds = Array.isArray(progress.evidenceIds) ? progress.evidenceIds : [];
  const inspectedFindingIds = Array.isArray(progress.inspectedFindingIds) ? progress.inspectedFindingIds : [];
  const stage = Number.isFinite(progress.stage) ? progress.stage : -1;
  const complete = Boolean(progress.complete);

  const riskCount = discoveredRiskIds.length;
  const evidenceCount = evidenceIds.length;
  const inspectionPct = Math.round((inspectedFindingIds.length / scenario.inspectionCount) * 100);
  const processPct = complete
    ? 100
    : stage >= 0
      ? Math.round(((stage + 1) / scenario.stages.length) * 100)
      : inspectionPct;

  setText('#hudRiskCount', `${riskCount}/${scenario.risks.length}`);
  setText('#hudEvidenceCount', `${evidenceCount}/${scenario.evidenceTotal}`);
  setText('#tabletRiskCount', riskCount);
  setText('#tabletTreatmentPct', `${processPct}%`);
  setText('#tabletScenarioPct', `${processPct}%`);

  const scenarioBar = document.querySelector('#tabletScenarioBar');
  if (scenarioBar) scenarioBar.style.width = `${processPct}%`;

  const discoveredRisks = scenario.risks.filter((risk) => discoveredRiskIds.includes(risk.id));
  const showInherent = complete || stage >= 3;
  const showResidual = complete || stage >= 5;
  const highestInherent = discoveredRisks.length
    ? Math.max(...discoveredRisks.map((risk) => risk.inherentLikelihood * risk.inherentImpact))
    : null;
  const highestResidual = discoveredRisks.length
    ? Math.max(...discoveredRisks.map((risk) => risk.residualLikelihood * risk.residualImpact))
    : null;

  setText('#tabletInherent', showInherent && highestInherent !== null ? highestInherent : '—');
  setText('#tabletResidual', showResidual && highestResidual !== null ? highestResidual : '—');

  const updateEl = document.querySelector('#tabletUpdate');
  const statusEl = document.querySelector('#tabletOverviewStatus');
  const phaseEl = document.querySelector('#tabletPhase');
  const workspaceTitle = document.querySelector('#tabletWorkspaceTitle');

  if (complete) {
    if (statusEl) statusEl.textContent = 'Residual approval required';
    if (updateEl) updateEl.textContent = 'Five material risks were classified. The highest residual score is 10, so approval and active monitoring remain required.';
    if (phaseEl) phaseEl.textContent = 'Debrief';
    if (workspaceTitle) workspaceTitle.textContent = 'Scenario debrief';
  } else if (stage < 0) {
    if (statusEl) statusEl.textContent = 'Collect field evidence';
    if (updateEl) updateEl.textContent = `${inspectedFindingIds.length}/${scenario.inspectionCount} inspection points reviewed · ${evidenceCount}/${scenario.evidenceTotal} evidence items captured.`;
    if (phaseEl) phaseEl.textContent = 'Inspection';
    if (workspaceTitle) workspaceTitle.textContent = 'Field evidence';
  } else {
    const active = scenario.stages[Math.min(stage, scenario.stages.length - 1)];
    if (statusEl) statusEl.textContent = `${active.name} in progress`;
    if (updateEl) updateEl.textContent = active.name === 'Treat'
      ? `Build an immediate control portfolio within the ${scenario.treatmentBudgetMinutes}-minute response limit.`
      : `${riskCount} material risks are in the register. Continue the ${active.name.toLowerCase()} decision using the collected evidence.`;
    if (phaseEl) phaseEl.textContent = active.name;
    if (workspaceTitle) workspaceTitle.textContent = active.name;
  }
}

function scheduleRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(refreshMultiRiskChrome);
}

window.addEventListener('riskmulate:progress', scheduleRefresh);
window.addEventListener('storage', (event) => {
  if (event.key === saveKey) scheduleRefresh();
});

document.addEventListener('DOMContentLoaded', scheduleRefresh, { once: true });

const observer = new MutationObserver(scheduleRefresh);
observer.observe(document.body, { childList: true, subtree: true, characterData: true });

scheduleRefresh();
