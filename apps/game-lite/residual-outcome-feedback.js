import { scenario } from './scenario.js';
import { computeResidualProfile } from './continuity-simulation.js';

/**
 * Residual outcome feedback
 * -------------------------
 * Educational purpose: after a field control, show how residual likelihood/impact
 * changed for the linked risk. Closes the treat → monitor loop with a clear
 * cause → control → residual chain.
 */

const ACTION_TO_RISK = Object.freeze({
  'isolate-line': 'solvent-release',
  'protect-drain': 'environmental-release',
  'clear-access': 'emergency-access',
  'electrical-loto': 'electrical-fault',
  'support-startup-hold': 'pipe-fatigue',
});

function ensureToast() {
  let el = document.querySelector('#residualOutcomeToast');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'residualOutcomeToast';
  el.className = 'residual-outcome-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  return el;
}

function injectStyle() {
  if (document.querySelector('#residual-outcome-style')) return;
  const style = document.createElement('style');
  style.id = 'residual-outcome-style';
  style.textContent = `
    .residual-outcome-toast {
      position: fixed;
      right: 14px;
      bottom: calc(var(--safe-bottom, 12px) + 120px);
      width: min(320px, calc(100vw - 28px));
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid rgba(111, 191, 128, 0.4);
      background: rgba(6, 18, 14, 0.9);
      color: #e4f3e8;
      opacity: 0;
      pointer-events: none;
      transition: opacity 160ms ease, transform 160ms ease;
      transform: translateY(8px);
      z-index: 43;
      backdrop-filter: blur(8px);
    }
    .residual-outcome-toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    .residual-outcome-toast strong {
      display: block;
      margin-bottom: 4px;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #9fd7ab;
    }
    .residual-outcome-toast span {
      display: block;
      font-size: 12px;
      line-height: 1.4;
      color: #d5e6da;
    }
    .residual-outcome-toast em {
      display: block;
      margin-top: 6px;
      font-style: normal;
      font-size: 11px;
      color: #a8c4b0;
    }
    @media (max-width: 760px) {
      .residual-outcome-toast {
        left: 14px;
        right: 14px;
        width: auto;
        bottom: calc(var(--safe-bottom, 12px) + 175px);
      }
    }
  `;
  document.head.appendChild(style);
}

function showResidual(actionId, progress) {
  const riskId = ACTION_TO_RISK[actionId];
  if (!riskId) return;
  const risk = scenario.risks.find((item) => item.id === riskId);
  if (!risk) return;

  const before = {
    likelihood: risk.inherentLikelihood,
    impact: risk.inherentImpact,
    score: risk.inherentLikelihood * risk.inherentImpact,
  };
  const selection = Array.isArray(progress?.treatmentSelection) ? progress.treatmentSelection : [];
  const residuals = computeResidualProfile(scenario, selection);
  const after = residuals[riskId] || before;

  const el = ensureToast();
  el.innerHTML = `
    <strong>Residual risk update</strong>
    <span>${risk.name}: inherent L${before.likelihood}×I${before.impact}=${before.score} → residual L${after.likelihood}×I${after.impact}=${after.score}</span>
    <em>Treatment changed residual likelihood on this pathway. Impact stays high until the consequence is fully removed from the design basis.</em>
  `;
  el.classList.add('show');
  clearTimeout(showResidual._timer);
  showResidual._timer = setTimeout(() => el.classList.remove('show'), 5200);
}

export function installResidualOutcomeFeedback() {
  if (window.RiskMulateResidualFeedback?.installed) {
    return window.RiskMulateResidualFeedback;
  }
  injectStyle();

  window.addEventListener('riskmulate:field-repair', (event) => {
    const detail = event.detail || {};
    showResidual(detail.actionId, detail.progress);
  });

  const api = { installed: true, showResidual };
  window.RiskMulateResidualFeedback = api;
  return api;
}
