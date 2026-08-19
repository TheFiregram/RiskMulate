import { scenario } from './scenario.js';
import { FIELD_FIX_SCORE } from './gameplay-balance.js';

/**
 * Field repair layer
 * -----------------
 * Educational purpose: treatment happens at the plant.
 * After evidence is recorded, the student returns to the equipment and applies
 * an immediate control with hands on the hazard pathway — not by ticking a
 * tablet checkbox in isolation from the facility.
 */

export const FINDING_REPAIR_MAP = Object.freeze({
  'flange-leak': {
    actionId: 'isolate-line',
    verb: 'Isolate line',
    teaching:
      'You isolated the solvent pathway at the source. Residual likelihood falls because the initiating release is no longer free to continue during startup.',
  },
  'storm-drain': {
    actionId: 'protect-drain',
    verb: 'Protect drain',
    teaching:
      'Covering the stormwater route breaks the environmental consequence pathway of a spill. Same initiating event, different residual impact profile.',
  },
  'access-obstruction': {
    actionId: 'clear-access',
    verb: 'Clear access',
    teaching:
      'Clearing the service route restores emergency access time. Housekeeping matters when it changes response capability against objectives.',
  },
  'rear-egress': {
    actionId: 'clear-access',
    verb: 'Clear rear egress',
    teaching:
      'Secondary egress is part of residual emergency-access risk. Clearing the plant-side route alone does not restore full response capability.',
  },
  'electrical-panel': {
    actionId: 'electrical-loto',
    verb: 'Lock out circuit',
    teaching:
      'Lockout removes the electrical fault pathway from service until competent repair. Warning signs alone would not control the mechanism.',
  },
  'temp-hose': {
    actionId: 'secure-temp-hose',
    verb: 'Secure hose',
    teaching:
      'Removing or retaining the temporary hose closes the disconnect pathway. Temporary works need explicit controls before pressure is introduced.',
  },
  'support-vibration': {
    actionId: 'support-startup-hold',
    verb: 'Tag startup hold',
    teaching:
      'A startup hold keeps vibration/fatigue uncertainty out of operation until mechanical integrity is verified. Deferral can be a valid control.',
  },
});

const saveKey = `riskmulate:${scenario.id}`;

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(saveKey) || 'null') || {};
  } catch {
    return {};
  }
}

function writeProgress(progress) {
  localStorage.setItem(saveKey, JSON.stringify(progress));
  window.dispatchEvent(new CustomEvent('riskmulate:progress', { detail: { ...progress } }));
}

export function getRepairForFinding(findingId) {
  return FINDING_REPAIR_MAP[findingId] || null;
}

export function isFindingFixable(findingId, progress = readProgress()) {
  const repair = getRepairForFinding(findingId);
  if (!repair) return false;
  const inspected = Array.isArray(progress.inspectedFindingIds)
    && progress.inspectedFindingIds.includes(findingId);
  const fixed = Array.isArray(progress.fieldFixedIds)
    && progress.fieldFixedIds.includes(findingId);
  return inspected && !fixed;
}

export function isFindingFixed(findingId, progress = readProgress()) {
  return Array.isArray(progress.fieldFixedIds) && progress.fieldFixedIds.includes(findingId);
}

export function applyFieldRepair(findingId) {
  const repair = getRepairForFinding(findingId);
  if (!repair) {
    return {
      ok: false,
      reason: 'observation',
      message:
        findingId === 'cosmetic-rust'
          ? 'Cosmetic discoloration is an observation, not a risk. Do not inflate the register — residual exposure is unchanged.'
          : 'This observation does not require a field repair on the available evidence.',
    };
  }

  const progress = {
    version: 2,
    found: false,
    stage: -1,
    score: 0,
    complete: false,
    inspectedFindingIds: [],
    evidenceIds: [],
    discoveredRiskIds: [],
    answers: [],
    treatmentSelection: [],
    fieldFixedIds: [],
    portfolioAttempts: 0,
    ...readProgress(),
  };

  progress.inspectedFindingIds = Array.isArray(progress.inspectedFindingIds) ? progress.inspectedFindingIds : [];
  progress.treatmentSelection = Array.isArray(progress.treatmentSelection) ? progress.treatmentSelection : [];
  progress.fieldFixedIds = Array.isArray(progress.fieldFixedIds) ? progress.fieldFixedIds : [];

  if (!progress.inspectedFindingIds.includes(findingId)) {
    return {
      ok: false,
      reason: 'not-inspected',
      message: 'Inspect and record evidence before applying a field control.',
    };
  }

  if (progress.fieldFixedIds.includes(findingId)) {
    return {
      ok: false,
      reason: 'already-fixed',
      message: 'This pathway is already controlled in the field.',
    };
  }

  progress.fieldFixedIds.push(findingId);
  if (!progress.treatmentSelection.includes(repair.actionId)) {
    progress.treatmentSelection.push(repair.actionId);
  }
  progress.score = Math.min(scenario.maxScore || 760, (progress.score || 0) + FIELD_FIX_SCORE);
  progress.found = (progress.discoveredRiskIds || []).length > 0;

  writeProgress(progress);

  window.dispatchEvent(new CustomEvent('riskmulate:field-repair', {
    detail: {
      findingId,
      actionId: repair.actionId,
      verb: repair.verb,
      teaching: repair.teaching,
      progress,
    },
  }));

  window.RiskMulateAudio?.playInteractionTick?.();

  return {
    ok: true,
    actionId: repair.actionId,
    verb: repair.verb,
    teaching: repair.teaching,
    progress,
  };
}

function ensureToast() {
  let el = document.querySelector('#fieldRepairToast');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'fieldRepairToast';
  el.className = 'field-repair-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  return el;
}

function showScorePulse(delta, total) {
  let el = document.querySelector('#fieldScorePulse');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fieldScorePulse';
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;left:50%;top:calc(var(--safe-top,8px) + 52px);transform:translateX(-50%) translateY(-6px);z-index:45;padding:6px 12px;border-radius:999px;background:rgba(12,40,24,0.92);border:1px solid rgba(111,191,128,0.5);color:#b6e6c2;font:700 11px/1.2 system-ui;letter-spacing:0.06em;opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease;';
    document.body.appendChild(el);
  }
  el.textContent = `+${delta} FIELD CONTROL · SCORE ${total}`;
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(showScorePulse._timer);
  showScorePulse._timer = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(-6px)';
  }, 2200);
}

function showToast(title, body) {
  const el = ensureToast();
  el.innerHTML = `<strong>${title}</strong><span>${body}</span>`;
  el.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.remove('show'), 4200);
}

export function installFieldRepair() {
  if (window.RiskMulateFieldRepair?.installed) return window.RiskMulateFieldRepair;

  const style = document.createElement('style');
  style.id = 'field-repair-style';
  style.textContent = `
    .field-repair-toast {
      position: fixed;
      left: 50%;
      bottom: calc(var(--safe-bottom, 12px) + 110px);
      transform: translateX(-50%) translateY(10px);
      width: min(420px, calc(100vw - 28px));
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid rgba(111, 191, 128, 0.42);
      background: rgba(6, 16, 12, 0.88);
      color: #e4f3e8;
      opacity: 0;
      pointer-events: none;
      transition: opacity 160ms ease, transform 160ms ease;
      z-index: 42;
      backdrop-filter: blur(8px);
      text-align: left;
    }
    .field-repair-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .field-repair-toast strong {
      display: block;
      margin-bottom: 4px;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #9fd7ab;
    }
    .field-repair-toast span {
      display: block;
      font-size: 12px;
      line-height: 1.4;
      color: #d5e6da;
    }
    .mobile-fix {
      color: #9fe0b0;
      opacity: 0;
      transform: translateY(4px);
      pointer-events: none;
      transition: opacity .13s ease, transform .13s ease, border-color .13s ease;
    }
    body.field-fix-ready .mobile-fix {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
      border-color: rgba(111, 191, 128, 0.5);
    }
    body.field-fix-ready .mobile-interact {
      opacity: 0.35;
    }
    @media (max-width: 760px) {
      .field-repair-toast {
        bottom: calc(var(--safe-bottom, 12px) + 168px);
      }
    }
  `;
  document.head.appendChild(style);

  window.addEventListener('riskmulate:field-repair', (event) => {
    const detail = event.detail || {};
    showToast(`Field control · ${detail.verb || 'Applied'}`, detail.teaching || 'Control applied at the equipment.');
    const total = Number(detail.progress?.score);
    if (Number.isFinite(total) && total > 0) showScorePulse(35, total);
  });

  const api = {
    installed: true,
    getRepairForFinding,
    isFindingFixable,
    isFindingFixed,
    applyFieldRepair,
    showToast,
  };
  window.RiskMulateFieldRepair = api;
  return api;
}
