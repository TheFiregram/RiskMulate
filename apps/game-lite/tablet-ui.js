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
    fieldFixedIds: [],
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
      fieldFixedIds: Array.isArray(stored.fieldFixedIds) ? stored.fieldFixedIds : [],
      treatmentSelection: Array.isArray(stored.treatmentSelection) ? stored.treatmentSelection : [],
      answers: Array.isArray(stored.answers) ? stored.answers : [],
    };
  } catch {
    return emptyProgress();
  }
}

// RESTORED_MARKER - file continues in full push
console.error('[RiskMulate] tablet-ui incomplete restore — do not use');
